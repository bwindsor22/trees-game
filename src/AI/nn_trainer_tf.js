'use strict';
/**
 * nn_trainer_tf.js — Neural network trainer for Photosynthesis.
 *
 * Training strategy:
 *   Phase 1a — Expert-game warm-up (200 games):
 *     Expert plays both sides; each state is labelled with the FINAL game
 *     outcome (score diff / OUTCOME_NORM → ≈[-1,1]).  Same label distribution
 *     as Phase 1b — no catastrophic forgetting when RL starts.
 *
 *   Phase 1b — Self-play RL (1,200 games = ~45,000 samples):
 *     Expert vs NN, alternating which side NN plays.
 *     Labels: final game outcome (score diff, normalized).
 *     Benchmarks every 150 games vs medium / hard / expert.
 *
 * Total samples: ~53,000 (> 50,000 target)
 * Target:
 *   NN+depth-2 vs medium  → win rate > 70%
 *   NN+depth-2 vs hard    → win rate > 55%
 *   NN+depth-2 vs expert  → win rate > 40%  (beats expert heuristic with less search depth)
 *
 * Action coordinates: uses (x/6, y/3) normalized coordinates (not angles).
 *
 * Run with:
 *   PATH=/opt/homebrew/bin:$PATH node src/AI/nn_trainer_tf.js
 */

// Shim util.isNullOrUndefined — removed from Node.js 22+ but still used by
// @tensorflow/tfjs-node. Patch before requiring tfjs-node so it gets the shim.
const _util = require('util');
if (typeof _util.isNullOrUndefined !== 'function') {
  _util.isNullOrUndefined = (v) => v === null || v === undefined;
}
const tf = require('@tensorflow/tfjs-node');
const fs   = require('fs');
const path = require('path');

const {
  ALL_COORDS, createGame, runPhotosynthesis, doSetup,
  doPlace, doHarvest, doBuy,
  applyMove, getValidMoves,
  evaluate, evaluateExpert,
  bestMoveWithEval, MAX_CANDIDATES,
} = require('./sim_core');

// ─── Configuration ────────────────────────────────────────────────────────────

const MODEL_DIR        = path.resolve(__dirname, '../../public/nn_model');
const LOG_FILE         = path.resolve(__dirname, 'nn_training_log.md');
const TSV_FILE         = path.resolve(__dirname, 'nn_training_data.tsv');
const FEATURE_DIM      = 68;

// Phase 1a: supervised distillation
const SUPERVISED_GAMES = 200;
// Phase 1b: RL self-play (split into batches, benchmarked periodically)
const RL_TOTAL_GAMES   = 1200;
const RL_BATCH_SIZE    = 150;    // games per RL iteration before re-training
const BENCHMARK_GAMES  = 20;    // games per difficulty in each benchmark run

const EPOCHS_SUPERVISED = 50;
const EPOCHS_RL         = 40;
const BATCH_SIZE        = 256;
const REPLAY_MAX        = 50000;

// Outcome normaliser: final score diff / OUTCOME_NORM → ≈[-1,1]
const OUTCOME_NORM = 30; // typical final score diff: -30..+30

// ─── Feature extraction (68 dimensions) ───────────────────────────────────────
//
// [0:37]  Board cells (ALL_COORDS order):
//           ai piece → +weight  (seed:0.1, small:0.25, medium:0.5, large:1.0)
//           opp piece→ -weight
//           empty    → 0
// [37]    ai_lp / 20
// [38]    opp_lp / 20
// [39]    (ai_score - opp_score) / 50
// [40]    floor(ai_lp/3) / 10  (LP→VP conversion potential)
// [41:45] AI inventory presence: seed, small, medium, large
// [45:49] Opp inventory presence
// [49:53] AI available presence
// [53:57] Opp available presence
// [57:63] Sun position one-hot (6 values)
// [63]    revolution / 2
// [64:68] Score pile remaining fraction per ring (0-3)

const PIECE_WEIGHT = { seed: 0.1, 'tree-small': 0.25, 'tree-medium': 0.5, 'tree-large': 1.0 };
const PILE_SIZES   = [3, 5, 6, 9];
const STAGES       = ['seed', 'tree-small', 'tree-medium', 'tree-large'];

function extractFeatures(state, aiPlayer, sunPos, revolution) {
  const features  = new Float32Array(FEATURE_DIM);
  const opponents = Object.keys(state.scores).filter(p => p !== aiPlayer);
  const oppPlayer = opponents[0] || null;

  // Board [0:37]
  const cellMap = {};
  for (const [key, piece] of Object.entries(state.boardState)) {
    const w = PIECE_WEIGHT[piece.type] || 0;
    cellMap[key] = piece.owner === aiPlayer ? w : -w;
  }
  for (let i = 0; i < ALL_COORDS.length; i++) {
    const [x, y] = ALL_COORDS[i];
    features[i] = cellMap[`${x},${y}`] || 0;
  }

  // LP & score [37-40]
  const aiLp  = state.lp[aiPlayer] || 0;
  const oppLp = oppPlayer ? (state.lp[oppPlayer] || 0) : 0;
  const aiSc  = state.scores[aiPlayer] || 0;
  const oppSc = oppPlayer ? (state.scores[oppPlayer] || 0) : 0;
  features[37] = Math.min(aiLp  / 20, 2);
  features[38] = Math.min(oppLp / 20, 2);
  features[39] = Math.max(-2, Math.min(2, (aiSc - oppSc) / 50));
  features[40] = Math.min(Math.floor(aiLp / 3) / 10, 2);

  // Inventory / available flags [41:57]
  const aiInv  = new Set(Object.values(state.inventories[aiPlayer] || {}).map(p => p.type));
  const oppInv = new Set(oppPlayer ? Object.values(state.inventories[oppPlayer] || {}).map(p => p.type) : []);
  const aiAv   = new Set(Object.values(state.available[aiPlayer]   || {}).map(p => p.type));
  const oppAv  = new Set(oppPlayer ? Object.values(state.available[oppPlayer]  || {}).map(p => p.type) : []);
  for (let i = 0; i < 4; i++) {
    features[41 + i] = aiInv.has(STAGES[i])  ? 1 : 0;
    features[45 + i] = oppInv.has(STAGES[i]) ? 1 : 0;
    features[49 + i] = aiAv.has(STAGES[i])   ? 1 : 0;
    features[53 + i] = oppAv.has(STAGES[i])  ? 1 : 0;
  }

  // Sun one-hot [57:63], revolution [63], score piles [64:68]
  features[57 + ((sunPos % 6 + 6) % 6)] = 1;
  features[63] = Math.min((revolution || 0) / 2, 1);
  if (state.scorePiles) {
    for (let r = 0; r < 4; r++) {
      features[64 + r] = (state.scorePiles[r] ? state.scorePiles[r].length : 0) / PILE_SIZES[r];
    }
  }
  return features;
}

// ─── Neural network ────────────────────────────────────────────────────────────
//
// Architecture: 68 → Dense(128,relu) → Dropout(0.1) → Dense(64,relu)
//             → Dense(32,relu) → Dense(1,linear)
//
// Output: predicted position value in [-1,1], where:
//   +1 = certain win (AI score >> opponent)
//   -1 = certain loss

function createModel() {
  const model = tf.sequential({ layers: [
    tf.layers.dense({ inputShape: [FEATURE_DIM], units: 128, activation: 'relu', kernelInitializer: 'glorotUniform' }),
    tf.layers.dropout({ rate: 0.1 }),
    tf.layers.dense({ units: 64, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.1 }),
    tf.layers.dense({ units: 32, activation: 'relu' }),
    tf.layers.dense({ units: 1, activation: 'linear' }),
  ]});
  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
  return model;
}

// ─── NN inference (synchronous batch) ─────────────────────────────────────────

/**
 * Evaluate an array of states in one TF.js batch call.
 * Returns an array of raw scores scaled to ~[-200, 200] (same units as evaluate()).
 */
function nnBatchEval(model, states, aiPlayer, sunPos, revolution) {
  if (!states.length) return [];
  const matrix = states.map(s => Array.from(extractFeatures(s, aiPlayer, sunPos, revolution)));
  return tf.tidy(() => {
    const input  = tf.tensor2d(matrix, [matrix.length, FEATURE_DIM]);
    const output = model.predict(input);
    // Scale normalized output back to score-like units for minimax comparison
    return Array.from(output.dataSync()).map(v => v * OUTCOME_NORM);
  });
}


// ─── AI turn runners ──────────────────────────────────────────────────────────

/** Run one expert (heuristic) AI turn on the live game state. */
function runExpertTurn(game, player, depth = 2) {
  game.activatedThisTurn = new Set();
  let state = {
    boardState:  { ...game.boardState },
    inventories: Object.fromEntries(Object.entries(game.inventories).map(([p, inv]) => [p, { ...inv }])),
    available:   Object.fromEntries(Object.entries(game.available).map(([p, av]) => [p, { ...av }])),
    lp:          { ...game.lp },
    scores:      { ...game.scores },
    scorePiles:  game.scorePiles.map(p => [...p]),
    activated:   new Set(),
    setupDone:   true,
  };
  const evalFn = evaluateExpert;
  let movesLeft = 12;
  while (movesLeft-- > 0) {
    const move = bestMoveWithEval(state, player, depth, player, game.sunPos, evalFn);
    if (!move) break;
    const cur = evalFn(state, player, game.sunPos);
    const nxt = evalFn(applyMove(state, move, player), player, game.sunPos);
    if (nxt < cur) break;
    if (move.action === 'harvest') doHarvest(game, player, move.pieceId);
    else if (move.action === 'buy') doBuy(game, player, move.pieceId, move.toPosition);
    else doPlace(game, player, move.pieceId, move.toX, move.toY, move.from);
    state = applyMove(state, move, player);
  }
}

/** Run one basic-eval (medium/hard) AI turn on the live game state. */
function runBasicTurn(game, player, depth = 2) {
  game.activatedThisTurn = new Set();
  let state = {
    boardState:  { ...game.boardState },
    inventories: Object.fromEntries(Object.entries(game.inventories).map(([p, inv]) => [p, { ...inv }])),
    available:   Object.fromEntries(Object.entries(game.available).map(([p, av]) => [p, { ...av }])),
    lp:          { ...game.lp },
    scores:      { ...game.scores },
    scorePiles:  game.scorePiles.map(p => [...p]),
    activated:   new Set(),
    setupDone:   true,
  };
  const evalFn = evaluate;
  let movesLeft = 12;
  while (movesLeft-- > 0) {
    const move = bestMoveWithEval(state, player, depth, player, game.sunPos, evalFn);
    if (!move) break;
    const cur = evalFn(state, player, game.sunPos);
    const nxt = evalFn(applyMove(state, move, player), player, game.sunPos);
    if (nxt < cur) break;
    if (move.action === 'harvest') doHarvest(game, player, move.pieceId);
    else if (move.action === 'buy') doBuy(game, player, move.pieceId, move.toPosition);
    else doPlace(game, player, move.pieceId, move.toX, move.toY, move.from);
    state = applyMove(state, move, player);
  }
}

/** Run one NN AI turn on the live game state (depth 2, batch leaf eval). */
function runNNTurn(game, player, model) {
  game.activatedThisTurn = new Set();
  const revolution = game.revolutions || 0;
  let state = {
    boardState:  { ...game.boardState },
    inventories: Object.fromEntries(Object.entries(game.inventories).map(([p, inv]) => [p, { ...inv }])),
    available:   Object.fromEntries(Object.entries(game.available).map(([p, av]) => [p, { ...av }])),
    lp:          { ...game.lp },
    scores:      { ...game.scores },
    scorePiles:  game.scorePiles.map(p => [...p]),
    activated:   new Set(),
    setupDone:   true,
  };

  // Depth-2 with batch leaf evaluation for efficiency:
  // generate all depth-1 candidates, for each get best depth-2 follow-up,
  // evaluate all depth-2 leaf states in one batch call.
  let movesLeft = 12;
  while (movesLeft-- > 0) {
    const moves = getValidMoves(state, player);
    if (!moves.length) break;

    // Prune to MAX_CANDIDATES at depth-1 using a quick single-state eval
    let candidates = moves;
    if (candidates.length > MAX_CANDIDATES) {
      const d1States = candidates.map(m => applyMove(state, m, player));
      const d1Scores = nnBatchEval(model, d1States, player, game.sunPos, revolution);
      const indexed  = candidates.map((m, i) => ({ m, s: d1Scores[i], st: d1States[i] }));
      indexed.sort((a, b) => b.s - a.s);
      candidates = indexed.slice(0, MAX_CANDIDATES).map(x => x.m);
    }

    // For each candidate, find best depth-2 follow-up and evaluate
    const leafStates  = [];
    const candidateD1 = [];
    for (const move of candidates) {
      const d1State  = applyMove(state, move, player);
      const d2Moves  = getValidMoves(d1State, player);
      if (!d2Moves.length) {
        leafStates.push(d1State);
        candidateD1.push({ move, leafIdx: leafStates.length - 1 });
      } else {
        // Quick pick: best d2 move by single NN eval (batch all)
        const d2Candidates = d2Moves.slice(0, MAX_CANDIDATES);
        const d2States     = d2Candidates.map(m => applyMove(d1State, m, player));
        d2States.forEach(s => leafStates.push(s));
        candidateD1.push({ move, d2Start: leafStates.length - d2States.length, d2Len: d2States.length });
      }
    }

    const allScores = nnBatchEval(model, leafStates, player, game.sunPos, revolution);

    let bestMove = null, bestScore = -Infinity;
    for (const item of candidateD1) {
      let sc;
      if (item.leafIdx !== undefined) {
        sc = allScores[item.leafIdx];
      } else {
        // Best d2 score among the range
        sc = -Infinity;
        for (let i = item.d2Start; i < item.d2Start + item.d2Len; i++) {
          if (allScores[i] > sc) sc = allScores[i];
        }
      }
      if (sc > bestScore) { bestScore = sc; bestMove = item.move; }
    }

    if (!bestMove) break;

    // Stop if best available move makes things worse
    const currentScore = nnBatchEval(model, [state], player, game.sunPos, revolution)[0];
    if (bestScore < currentScore - 5) break; // tolerance of 5 units (≈ 0.025 normalized)

    if (bestMove.action === 'harvest') doHarvest(game, player, bestMove.pieceId);
    else if (bestMove.action === 'buy') doBuy(game, player, bestMove.pieceId, bestMove.toPosition);
    else doPlace(game, player, bestMove.pieceId, bestMove.toX, bestMove.toY, bestMove.from);
    state = applyMove(state, bestMove, player);
  }
}

// ─── Full game runner ─────────────────────────────────────────────────────────

/**
 * Run a complete game and return scores.
 * p1Config/p2Config: { type: 'expert'|'basic'|'nn', depth?: number, model?: tf.Model }
 */
function runGame(p1Config, p2Config) {
  const players = ['p1', 'p2'];
  const game    = createGame(players);
  doSetup(game);
  runPhotosynthesis(game);

  for (let cycle = 0; cycle < 19; cycle++) {
    const revolution   = Math.floor(cycle / 6);
    const isFinalRound = cycle === 18;
    const offset       = revolution % 2;
    const order        = offset === 0 ? players : [...players].reverse();

    for (const player of order) {
      const cfg = player === 'p1' ? p1Config : p2Config;
      game.revolutions = revolution;
      if (cfg.type === 'expert')     runExpertTurn(game, player, cfg.depth ?? 2);
      else if (cfg.type === 'basic') runBasicTurn(game, player, cfg.depth ?? 2);
      else if (cfg.type === 'nn')    runNNTurn(game, player, cfg.model);
    }

    if (isFinalRound) break;
    game.sunPos = (game.sunPos + 1) % 6;
    if (game.sunPos === 0) game.revolutions++;
    runPhotosynthesis(game);
  }

  for (const p of players) game.scores[p] += Math.floor(game.lp[p] / 3);
  return { p1: game.scores.p1, p2: game.scores.p2 };
}

// ─── Data collection ──────────────────────────────────────────────────────────

/**
 * Collect outcome-labelled samples from N expert-vs-expert games.
 * Each state is labelled with the FINAL game score differential (normalised).
 * This is identical in distribution to Phase 1b — no label scale mismatch.
 */
function collectExpertOutcomeData(nGames) {
  return collectOutcomeData(nGames, null);
}

/**
 * Collect training samples from N self-play games (expert-vs-expert or mixed).
 * States are labelled with the final score differential (outcome-based RL).
 * After the first benchmark, the NN plays p2 so it generates exploratory data.
 */
function collectOutcomeData(nGames, nnModel) {
  const samples = [];
  const players = ['p1', 'p2'];

  for (let g = 0; g < nGames; g++) {
    // First half: expert-vs-expert (clean baseline data)
    // Second half: NN plays alternating p1/p2 to avoid positional bias
    const useNN   = (nnModel !== null) && (g >= nGames / 2);
    const nnIsP1  = (g % 2 === 0); // alternate which side NN plays
    const game    = createGame(players);
    doSetup(game);
    runPhotosynthesis(game);

    const stateSamples = []; // { features, playerIdx }

    for (let cycle = 0; cycle < 19; cycle++) {
      const revolution   = Math.floor(cycle / 6);
      const isFinalRound = cycle === 18;
      const order        = (revolution % 2 === 0) ? players : [...players].reverse();

      for (const player of order) {
        const pIdx = players.indexOf(player);

        // Record state BEFORE the move
        const simState = {
          boardState:  { ...game.boardState },
          inventories: Object.fromEntries(Object.entries(game.inventories).map(([p, inv]) => [p, { ...inv }])),
          available:   Object.fromEntries(Object.entries(game.available).map(([p, av]) => [p, { ...av }])),
          lp:          { ...game.lp },
          scores:      { ...game.scores },
          scorePiles:  game.scorePiles.map(p => [...p]),
          activated:   new Set(),
          setupDone:   true,
        };
        stateSamples.push({ features: extractFeatures(simState, player, game.sunPos, revolution), playerIdx: pIdx });

        game.revolutions = revolution;
        const isNNPlayer = useNN && ((nnIsP1 && player === 'p1') || (!nnIsP1 && player === 'p2'));
        if (isNNPlayer) runNNTurn(game, player, nnModel);
        else            runExpertTurn(game, player, 2);
      }

      if (isFinalRound) break;
      game.sunPos = (game.sunPos + 1) % 6;
      if (game.sunPos === 0) game.revolutions++;
      runPhotosynthesis(game);
    }

    // LP conversion
    for (const p of players) game.scores[p] += Math.floor(game.lp[p] / 3);

    // Label all states with outcome from that player's perspective
    const diff = game.scores.p1 - game.scores.p2; // positive = p1 won
    for (const { features, playerIdx } of stateSamples) {
      const perspective = playerIdx === 0 ? diff : -diff;
      const target      = Math.max(-1, Math.min(1, perspective / OUTCOME_NORM));
      samples.push({ features, target });
    }
  }
  return samples;
}

// ─── Training ──────────────────────────────────────────────────────────────────

async function trainModel(model, samples, epochs, label) {
  if (samples.length < BATCH_SIZE) {
    console.log(`  [${label}] Only ${samples.length} samples — skipping`);
    return { loss: 0, mae: 0 };
  }

  // Shuffle in-place (Fisher-Yates)
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }

  const feats   = samples.map(s => Array.from(s.features));
  const targets = samples.map(s => [s.target]);
  const xs = tf.tensor2d(feats,   [samples.length, FEATURE_DIM]);
  const ys = tf.tensor2d(targets, [samples.length, 1]);

  let finalLoss = 0, finalMae = 0;
  await model.fit(xs, ys, {
    epochs,
    batchSize: BATCH_SIZE,
    validationSplit: 0.1,
    shuffle: true,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        finalLoss = logs.val_loss ?? logs.loss;
        finalMae  = logs.val_mae  ?? logs.mae;
        if ((epoch + 1) % 10 === 0) {
          const lStr = logs.val_loss !== undefined
            ? `val_loss=${logs.val_loss.toFixed(4)}  val_mae=${logs.val_mae.toFixed(4)}`
            : `loss=${logs.loss.toFixed(4)}  mae=${logs.mae.toFixed(4)}`;
          process.stdout.write(`    epoch ${String(epoch + 1).padStart(3)}/${epochs}  ${lStr}\n`);
        }
      }
    }
  });
  xs.dispose(); ys.dispose();
  return { loss: finalLoss, mae: finalMae };
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

/**
 * Run BENCHMARK_GAMES against each difficulty and return win rates.
 * NN always plays as p2 (half the games) and p1 (other half) for symmetry.
 */
function runBenchmark(model) {
  // All opponents at depth 2 for fast training-time benchmarks.
  // The eval function (basic vs expert) still distinguishes difficulty levels.
  const configs = {
    medium: { type: 'basic',  depth: 2 },
    hard:   { type: 'basic',  depth: 4 },
    expert: { type: 'expert', depth: 2 },
  };
  const results = {};

  for (const [label, oppCfg] of Object.entries(configs)) {
    let nnWins = 0, oppWins = 0, draws = 0;
    for (let i = 0; i < BENCHMARK_GAMES; i++) {
      const nnIsP1 = (i % 2 === 0);
      const p1Cfg  = nnIsP1 ? { type: 'nn', model } : oppCfg;
      const p2Cfg  = nnIsP1 ? oppCfg : { type: 'nn', model };
      const { p1, p2 } = runGame(p1Cfg, p2Cfg);
      const nnScore  = nnIsP1 ? p1 : p2;
      const oppScore = nnIsP1 ? p2 : p1;
      if      (nnScore > oppScore)  nnWins++;
      else if (oppScore > nnScore)  oppWins++;
      else                          draws++;
    }
    results[label] = { nnWins, oppWins, draws, nnFrac: nnWins / BENCHMARK_GAMES };
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log('  Photosynthesis NN Trainer  —  TensorFlow.js');
  console.log(`  Feature dim: ${FEATURE_DIM}  |  Architecture: ${FEATURE_DIM}→128→64→32→1`);
  console.log(`  Phase 1a: ${SUPERVISED_GAMES} supervised games  |  Phase 1b: ${RL_TOTAL_GAMES} RL games`);
  console.log(`  Target samples: ${SUPERVISED_GAMES * 38 + RL_TOTAL_GAMES * 38} (> 50,000)`);
  console.log(`${'═'.repeat(65)}\n`);

  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

  // TSV header
  const tsvHeader = [
    'timestamp', 'phase', 'total_games', 'total_samples', 'loss', 'mae',
    'vs_medium_w', 'vs_medium_l', 'vs_medium_d', 'vs_medium_pct',
    'vs_hard_w',   'vs_hard_l',   'vs_hard_d',   'vs_hard_pct',
    'vs_expert_w', 'vs_expert_l', 'vs_expert_d', 'vs_expert_pct',
  ].join('\t');
  fs.writeFileSync(TSV_FILE, tsvHeader + '\n');

  function writeTSVRow(phase, totalGames, totalSamples, loss, mae, benchmarkResults) {
    const r = benchmarkResults;
    const row = [
      new Date().toISOString(), phase, totalGames, totalSamples,
      loss.toFixed(6), mae.toFixed(6),
      r.medium.nnWins, r.medium.oppWins, r.medium.draws, (r.medium.nnFrac * 100).toFixed(1),
      r.hard.nnWins,   r.hard.oppWins,   r.hard.draws,   (r.hard.nnFrac   * 100).toFixed(1),
      r.expert.nnWins, r.expert.oppWins, r.expert.draws, (r.expert.nnFrac * 100).toFixed(1),
    ].join('\t');
    fs.appendFileSync(TSV_FILE, row + '\n');
  }

  let model;
  const modelJsonPath = path.join(MODEL_DIR, 'model.json');
  if (fs.existsSync(modelJsonPath)) {
    console.log(`Loading existing model from ${MODEL_DIR}`);
    model = await tf.loadLayersModel(`file://${modelJsonPath}`);
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
    console.log(`  Loaded. Params: ${model.countParams()}\n`);
  } else {
    console.log('Creating new model...');
    model = createModel();
    console.log(`  Params: ${model.countParams()}\n`);
  }

  const logLines = [
    `# NN Training Log`,
    ``,
    `Started: ${new Date().toISOString()}`,
    `Feature dim: ${FEATURE_DIM}  |  Arch: ${FEATURE_DIM}→128→64→32→1`,
    `Phase 1a: ${SUPERVISED_GAMES} expert-outcome games  |  Phase 1b: ${RL_TOTAL_GAMES} RL games (${RL_BATCH_SIZE}/batch)`,
    ``,
    `## Phase 1a — Expert games, outcome labels (same distribution as Phase 1b)`,
  ];

  const replayBuffer = [];
  let totalSamples   = 0;
  let bestNNFrac     = { medium: 0, hard: 0, expert: 0 };

  // ── Phase 1a: Supervised distillation ─────────────────────────────────────

  console.log(`── Phase 1a: Expert-outcome data (${SUPERVISED_GAMES} expert games) ──────────`);
  const t0 = Date.now();
  process.stdout.write(`  Generating data... `);
  const supervisedData = collectExpertOutcomeData(SUPERVISED_GAMES);
  totalSamples += supervisedData.length;
  process.stdout.write(`${supervisedData.length} samples in ${((Date.now()-t0)/1000).toFixed(1)}s\n`);

  console.log(`  Training (${EPOCHS_SUPERVISED} epochs):`);
  const t1 = Date.now();
  const { loss: sLoss, mae: sMae } = await trainModel(model, [...supervisedData], EPOCHS_SUPERVISED, '1a');
  console.log(`  Done in ${((Date.now()-t1)/1000).toFixed(1)}s  loss=${sLoss.toFixed(4)}  mae=${sMae.toFixed(4)}`);

  // Add supervised samples to replay buffer
  replayBuffer.push(...supervisedData);
  if (replayBuffer.length > REPLAY_MAX) replayBuffer.splice(0, replayBuffer.length - REPLAY_MAX);

  // First benchmark after supervised phase
  console.log(`\n  Benchmark after Phase 1a:`);
  const b0 = runBenchmark(model);
  for (const [d, r] of Object.entries(b0)) {
    console.log(`    vs ${d.padEnd(6)}: NN ${r.nnWins}W/${r.oppWins}L/${r.draws}D  (${(r.nnFrac*100).toFixed(0)}%)`);
    logLines.push(`| Phase1a | vs ${d} | ${(r.nnFrac*100).toFixed(0)}% |`);
    bestNNFrac[d] = Math.max(bestNNFrac[d], r.nnFrac);
  }
  writeTSVRow('1a', SUPERVISED_GAMES, totalSamples, sLoss, sMae, b0);

  // Save model after Phase 1a
  await model.save(`file://${MODEL_DIR}`);
  console.log(`  Model saved.\n`);

  logLines.push('', '## Phase 1b — RL self-play (outcome labels)', '',
    '| Batch | Games | Samples | Loss | MAE | vs medium | vs hard | vs expert | Saved |',
    '|-------|-------|---------|------|-----|-----------|---------|-----------|-------|');

  // ── Phase 1b: RL self-play ─────────────────────────────────────────────────

  const totalBatches  = Math.ceil(RL_TOTAL_GAMES / RL_BATCH_SIZE);
  let gamesCompleted  = 0;

  for (let batch = 1; batch <= totalBatches; batch++) {
    const batchGames = Math.min(RL_BATCH_SIZE, RL_TOTAL_GAMES - gamesCompleted);
    console.log(`── Phase 1b batch ${batch}/${totalBatches} (${batchGames} games) ─────────────────`);

    // Collect RL data
    process.stdout.write(`  Collecting data... `);
    const t2 = Date.now();
    const rlData = collectOutcomeData(batchGames, model);
    totalSamples += rlData.length;
    gamesCompleted += batchGames;
    process.stdout.write(`${rlData.length} samples in ${((Date.now()-t2)/1000).toFixed(1)}s  (total: ${totalSamples})\n`);

    // Add to replay buffer
    replayBuffer.push(...rlData);
    if (replayBuffer.length > REPLAY_MAX) replayBuffer.splice(0, replayBuffer.length - REPLAY_MAX);

    // Train on buffer sample
    const trainData = replayBuffer.length > 20000
      ? replayBuffer.slice(-20000)  // recent 20k for stability
      : [...replayBuffer];
    console.log(`  Training on ${trainData.length} samples (${EPOCHS_RL} epochs):`);
    const t3 = Date.now();
    const { loss: rLoss, mae: rMae } = await trainModel(model, [...trainData], EPOCHS_RL, `1b-${batch}`);
    console.log(`  Done in ${((Date.now()-t3)/1000).toFixed(1)}s  loss=${rLoss.toFixed(4)}  mae=${rMae.toFixed(4)}`);

    // Benchmark
    console.log(`  Benchmark:`);
    const t4 = Date.now();
    const br = runBenchmark(model);
    process.stdout.write(`    ${((Date.now()-t4)/1000).toFixed(1)}s  `);
    let savedThisBatch = false;
    for (const [d, r] of Object.entries(br)) {
      process.stdout.write(`vs ${d}: ${(r.nnFrac*100).toFixed(0)}%  `);
      if (r.nnFrac > bestNNFrac[d] + 0.03) {
        bestNNFrac[d] = r.nnFrac;
        savedThisBatch = true;
      }
    }
    process.stdout.write('\n');

    const bRow = `| ${String(batch).padStart(5)} | ${String(gamesCompleted).padStart(5)} | ${String(totalSamples).padStart(7)} | ${rLoss.toFixed(4)} | ${rMae.toFixed(4)} | ${(br.medium.nnFrac*100).toFixed(0)}% | ${(br.hard.nnFrac*100).toFixed(0)}% | ${(br.expert.nnFrac*100).toFixed(0)}% | ${savedThisBatch ? '✓' : ''} |`;
    logLines.push(bRow);
    fs.writeFileSync(LOG_FILE, logLines.join('\n') + '\n');
    writeTSVRow(`1b_batch${batch}`, gamesCompleted, totalSamples, rLoss, rMae, br);

    if (savedThisBatch) {
      await model.save(`file://${MODEL_DIR}`);
      console.log(`  ✓ New best — model saved`);
    }

    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`${'═'.repeat(65)}`);
  console.log(`Training complete.  Total samples: ${totalSamples}`);
  console.log(`Best win rates against:`);
  for (const [d, frac] of Object.entries(bestNNFrac)) {
    console.log(`  vs ${d.padEnd(6)}: ${(frac*100).toFixed(1)}%`);
  }
  console.log(`Model: ${MODEL_DIR}`);
  console.log(`Log:   ${LOG_FILE}`);

  logLines.push('', `## Final summary`, '',
    `Total samples: ${totalSamples}`,
    ...Object.entries(bestNNFrac).map(([d, f]) => `Best vs ${d}: ${(f*100).toFixed(1)}%`));
  fs.writeFileSync(LOG_FILE, logLines.join('\n') + '\n');
}

main().catch(err => { console.error(err); process.exit(1); });
