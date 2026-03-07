'use strict';
/**
 * nn_trainer_tf.js — Neural network trainer for Photosynthesis.
 *
 * Training strategy:
 *   Phase 1a — Expert-game warm-up (200 games):
 *     Expert plays both sides; each state is labelled with the FINAL game
 *     outcome (score diff / OUTCOME_NORM → ≈[-1,1]).
 *
 *   Phase 1b — NN-vs-NN self-play (1,200 games = ~45,600 samples):
 *     NN plays both sides so the value function is calibrated to its OWN play,
 *     not to expert play.  Labels: final score diff (normalised).
 *     Benchmarks every 150 games vs easy / medium / hard / expert.
 *
 * Total samples: ~53,200 (> 50,000 target)
 *
 * Run with:
 *   PATH=/opt/homebrew/bin:$PATH node src/AI/nn_trainer_tf.js
 */

// Shim util.isNullOrUndefined — removed in Node.js 22+ but needed by tfjs-node.
const _util = require('util');
if (typeof _util.isNullOrUndefined !== 'function') {
  _util.isNullOrUndefined = (v) => v === null || v === undefined;
}
const tf   = require('@tensorflow/tfjs-node');
const fs   = require('fs');
const path = require('path');

const {
  ALL_COORDS, createGame, runPhotosynthesis, doSetup,
  doPlace, doHarvest, doBuy,
  applyMove, getValidMoves,
  evaluate, evaluateExpert,
  runTurnWithEval,
} = require('./sim_core');

// ─── Configuration ────────────────────────────────────────────────────────────

const MODEL_DIR   = path.resolve(__dirname, '../../public/nn_model');
const LOG_FILE    = path.resolve(__dirname, 'nn_training_log.md');
const TSV_FILE    = path.resolve(__dirname, 'nn_training_data.tsv');
const FEATURE_DIM = 68;

const SUPERVISED_GAMES  = 200;
const RL_TOTAL_GAMES    = 1200;
const RL_BATCH_SIZE     = 150;
const BENCHMARK_GAMES   = 20;   // games per difficulty per benchmark

const EPOCHS_SUPERVISED = 100;
const EPOCHS_RL         = 100;
const BATCH_SIZE        = 256;
const REPLAY_MAX        = 55000;

// Final score diff / OUTCOME_NORM → ≈[-1,1]
const OUTCOME_NORM = 30;

// ─── Feature extraction (68 dimensions) ───────────────────────────────────────
//
// [0:37]  Board cells (ALL_COORDS order):
//           ai piece  → +weight (seed:0.1, small:0.25, medium:0.5, large:1.0)
//           opp piece → -weight
//           empty     →  0
// [37]    ai_lp / 20
// [38]    opp_lp / 20
// [39]    (ai_score - opp_score) / 50
// [40]    floor(ai_lp/3) / 10  (LP→VP conversion potential)
// [41:45] AI inventory presence flags: seed, small, medium, large
// [45:49] Opp inventory presence flags
// [49:53] AI available presence flags
// [53:57] Opp available presence flags
// [57:63] Sun position one-hot (6 values)
// [63]    revolution / 2
// [64:68] Score pile remaining fractions (rings 0-3)

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
    features[41 + i] = aiInv.has(STAGES[i]) ? 1 : 0;
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
// 68 → Dense(128,relu) → Dropout(0.1) → Dense(64,relu) → Dense(32,relu) → Dense(1,linear)
// Output in [-1,1]: +1 = win, -1 = loss

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

// ─── NN inference ─────────────────────────────────────────────────────────────

/** Batch-evaluate an array of states. Returns scores in [-OUTCOME_NORM, +OUTCOME_NORM]. */
function nnBatchEval(model, states, aiPlayer, sunPos, revolution) {
  if (!states.length) return [];
  const matrix = states.map(s => Array.from(extractFeatures(s, aiPlayer, sunPos, revolution)));
  return tf.tidy(() => {
    const out = model.predict(tf.tensor2d(matrix, [matrix.length, FEATURE_DIM]));
    return Array.from(out.dataSync()).map(v => v * OUTCOME_NORM);
  });
}

// ─── AI turn runners ──────────────────────────────────────────────────────────

/**
 * NN turn using the same runTurnWithEval infrastructure as expert/basic.
 * Stopping logic is identical to expert: stop when the best available move
 * makes the eval decrease.  Single-state evals — no subtle batch-indexing bugs.
 */
function runNNTurn(game, player, model) {
  const rev = game.revolutions || 0;
  runTurnWithEval(game, player, 2,
    (state, p, sp) => nnBatchEval(model, [state], p, sp, rev)[0]);
}

/**
 * Random AI: picks a uniformly random legal move each iteration until LP runs
 * out.  Used as the "easy" benchmark baseline.
 */
function runRandomTurn(game, player) {
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
  let movesLeft = 12;
  while (movesLeft-- > 0) {
    const moves = getValidMoves(state, player);
    if (!moves.length) break;
    const move = moves[Math.floor(Math.random() * moves.length)];
    if      (move.action === 'harvest') doHarvest(game, player, move.pieceId);
    else if (move.action === 'buy')     doBuy(game, player, move.pieceId, move.toPosition);
    else                                doPlace(game, player, move.pieceId, move.toX, move.toY, move.from);
    state = applyMove(state, move, player);
  }
}

// ─── Full game runner ─────────────────────────────────────────────────────────

/** p1Config/p2Config: { type: 'expert'|'basic'|'nn'|'random', depth?, model? } */
function runGame(p1Config, p2Config) {
  const players = ['p1', 'p2'];
  const game    = createGame(players);
  doSetup(game);
  runPhotosynthesis(game);

  for (let cycle = 0; cycle < 19; cycle++) {
    const revolution   = Math.floor(cycle / 6);
    const isFinalRound = cycle === 18;
    const order        = revolution % 2 === 0 ? players : [...players].reverse();

    for (const player of order) {
      const cfg = player === 'p1' ? p1Config : p2Config;
      game.revolutions = revolution;
      if      (cfg.type === 'expert') runTurnWithEval(game, player, cfg.depth ?? 2, evaluateExpert);
      else if (cfg.type === 'basic')  runTurnWithEval(game, player, cfg.depth ?? 2, evaluate);
      else if (cfg.type === 'nn')     runNNTurn(game, player, cfg.model);
      else if (cfg.type === 'random') runRandomTurn(game, player);
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
 * Collect outcome-labelled samples from nGames games.
 * p1Type / p2Type: 'expert' | 'nn'
 * nnModel: required when either type is 'nn'
 *
 * States are labelled with the final score differential from each player's
 * perspective, normalised to [-1, 1].
 */
function collectData(nGames, p1Type, p2Type, nnModel) {
  const samples = [];
  const players = ['p1', 'p2'];

  for (let g = 0; g < nGames; g++) {
    const game = createGame(players);
    doSetup(game);
    runPhotosynthesis(game);

    const stateSamples = [];

    for (let cycle = 0; cycle < 19; cycle++) {
      const revolution   = Math.floor(cycle / 6);
      const isFinalRound = cycle === 18;
      const order        = (revolution % 2 === 0) ? players : [...players].reverse();

      for (const player of order) {
        const pIdx = players.indexOf(player);
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
        const playerType = player === 'p1' ? p1Type : p2Type;
        if (playerType === 'nn') runNNTurn(game, player, nnModel);
        else                     runTurnWithEval(game, player, 2, evaluateExpert);
      }

      if (isFinalRound) break;
      game.sunPos = (game.sunPos + 1) % 6;
      if (game.sunPos === 0) game.revolutions++;
      runPhotosynthesis(game);
    }

    for (const p of players) game.scores[p] += Math.floor(game.lp[p] / 3);
    const diff = game.scores.p1 - game.scores.p2;
    for (const { features, playerIdx } of stateSamples) {
      const perspective = playerIdx === 0 ? diff : -diff;
      samples.push({ features, target: Math.max(-1, Math.min(1, perspective / OUTCOME_NORM)) });
    }
  }
  return samples;
}

// ─── Training ─────────────────────────────────────────────────────────────────

async function trainModel(model, samples, epochs, label) {
  if (samples.length < BATCH_SIZE) {
    console.log(`  [${label}] Only ${samples.length} samples — skipping`);
    return { loss: 0, mae: 0 };
  }

  // Fisher-Yates shuffle
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }

  const xs = tf.tensor2d(samples.map(s => Array.from(s.features)), [samples.length, FEATURE_DIM]);
  const ys = tf.tensor2d(samples.map(s => [s.target]),             [samples.length, 1]);

  let finalLoss = 0, finalMae = 0;
  await model.fit(xs, ys, {
    epochs, batchSize: BATCH_SIZE, validationSplit: 0.1, shuffle: true, verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        finalLoss = logs.val_loss ?? logs.loss;
        finalMae  = logs.val_mae  ?? logs.mae;
        if ((epoch + 1) % 20 === 0) {
          const s = logs.val_loss !== undefined
            ? `val_loss=${logs.val_loss.toFixed(4)}  val_mae=${logs.val_mae.toFixed(4)}`
            : `loss=${logs.loss.toFixed(4)}  mae=${logs.mae.toFixed(4)}`;
          process.stdout.write(`    epoch ${String(epoch+1).padStart(3)}/${epochs}  ${s}\n`);
        }
      }
    }
  });
  xs.dispose(); ys.dispose();
  return { loss: finalLoss, mae: finalMae };
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

function runBenchmark(model) {
  const oppConfigs = {
    easy:   { type: 'random' },
    medium: { type: 'basic',  depth: 2 },
    hard:   { type: 'basic',  depth: 4 },
    expert: { type: 'expert', depth: 2 },
  };
  const results = {};

  for (const [label, oppCfg] of Object.entries(oppConfigs)) {
    let nnWins = 0, oppWins = 0, draws = 0;
    for (let i = 0; i < BENCHMARK_GAMES; i++) {
      const nnIsP1 = (i % 2 === 0);
      const { p1, p2 } = runGame(
        nnIsP1 ? { type: 'nn', model } : oppCfg,
        nnIsP1 ? oppCfg : { type: 'nn', model }
      );
      const nnScore  = nnIsP1 ? p1 : p2;
      const oppScore = nnIsP1 ? p2 : p1;
      if      (nnScore > oppScore) nnWins++;
      else if (oppScore > nnScore) oppWins++;
      else                         draws++;
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
  console.log(`  Phase 1a: ${SUPERVISED_GAMES} expert games  |  Phase 1b: ${RL_TOTAL_GAMES} NN-vs-NN games`);
  console.log(`  Target samples: ${(SUPERVISED_GAMES + RL_TOTAL_GAMES) * 38} (> 50,000)`);
  console.log(`${'═'.repeat(65)}\n`);

  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

  // TSV header
  const tsvCols = ['timestamp', 'phase', 'total_games', 'total_samples', 'loss', 'mae'];
  for (const d of DIFFICULTIES) tsvCols.push(`vs_${d}_w`, `vs_${d}_l`, `vs_${d}_d`, `vs_${d}_pct`);
  fs.writeFileSync(TSV_FILE, tsvCols.join('\t') + '\n');

  function writeTSVRow(phase, totalGames, totalSamples, loss, mae, br) {
    const row = [new Date().toISOString(), phase, totalGames, totalSamples, loss.toFixed(6), mae.toFixed(6)];
    for (const d of DIFFICULTIES) {
      const r = br[d];
      row.push(r.nnWins, r.oppWins, r.draws, (r.nnFrac * 100).toFixed(1));
    }
    fs.appendFileSync(TSV_FILE, row.join('\t') + '\n');
  }

  // Load or create model
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
    `# NN Training Log`, ``,
    `Started: ${new Date().toISOString()}`,
    `Arch: ${FEATURE_DIM}→128→64→32→1`,
    `Phase 1a: ${SUPERVISED_GAMES} expert-vs-expert games`,
    `Phase 1b: ${RL_TOTAL_GAMES} NN-vs-NN games (${RL_BATCH_SIZE}/batch)`,
    ``, `## Phase 1a — Expert games, outcome labels`,
  ];

  const replayBuffer = [];
  let totalSamples   = 0;
  let bestNNFrac     = Object.fromEntries(DIFFICULTIES.map(d => [d, 0]));

  // ── Phase 1a: Expert-outcome warm-up ─────────────────────────────────────

  console.log(`── Phase 1a: Expert games (${SUPERVISED_GAMES}) ───────────────────────────────`);
  let t = Date.now();
  process.stdout.write('  Generating data... ');
  const phase1aData = collectData(SUPERVISED_GAMES, 'expert', 'expert', null);
  totalSamples += phase1aData.length;
  process.stdout.write(`${phase1aData.length} samples in ${((Date.now()-t)/1000).toFixed(1)}s\n`);
  replayBuffer.push(...phase1aData);

  console.log(`  Training (${EPOCHS_SUPERVISED} epochs):`);
  t = Date.now();
  const { loss: sLoss, mae: sMae } = await trainModel(model, [...phase1aData], EPOCHS_SUPERVISED, '1a');
  console.log(`  Done in ${((Date.now()-t)/1000).toFixed(1)}s  loss=${sLoss.toFixed(4)}  mae=${sMae.toFixed(4)}\n`);

  console.log('  Benchmark after Phase 1a:');
  t = Date.now();
  const b0 = runBenchmark(model);
  process.stdout.write(`    ${((Date.now()-t)/1000).toFixed(1)}s  `);
  for (const [d, r] of Object.entries(b0)) {
    process.stdout.write(`vs ${d}: ${r.nnWins}W/${r.oppWins}L  `);
    logLines.push(`| Phase1a | vs ${d} | ${r.nnWins}W/${r.oppWins}L/${r.draws}D | ${(r.nnFrac*100).toFixed(0)}% |`);
    bestNNFrac[d] = Math.max(bestNNFrac[d], r.nnFrac);
  }
  process.stdout.write('\n');
  writeTSVRow('1a', SUPERVISED_GAMES, totalSamples, sLoss, sMae, b0);

  await model.save(`file://${MODEL_DIR}`);
  console.log('  Model saved.\n');

  logLines.push('', '## Phase 1b — NN-vs-NN self-play', '',
    `| Batch | Games | Samples | Loss | MAE | vs easy | vs medium | vs hard | vs expert | Saved |`,
    `|-------|-------|---------|------|-----|---------|-----------|---------|-----------|-------|`);

  // ── Phase 1b: NN-vs-NN self-play ──────────────────────────────────────────

  const totalBatches = Math.ceil(RL_TOTAL_GAMES / RL_BATCH_SIZE);
  let gamesCompleted = 0;

  for (let batch = 1; batch <= totalBatches; batch++) {
    const batchGames = Math.min(RL_BATCH_SIZE, RL_TOTAL_GAMES - gamesCompleted);
    console.log(`── Phase 1b batch ${batch}/${totalBatches} (${batchGames} NN-vs-NN games) ────────────`);

    t = Date.now();
    process.stdout.write('  Collecting data... ');
    const rlData = collectData(batchGames, 'nn', 'nn', model);
    totalSamples += rlData.length;
    gamesCompleted += batchGames;
    process.stdout.write(`${rlData.length} samples in ${((Date.now()-t)/1000).toFixed(1)}s  (total: ${totalSamples})\n`);

    replayBuffer.push(...rlData);
    if (replayBuffer.length > REPLAY_MAX) replayBuffer.splice(0, replayBuffer.length - REPLAY_MAX);

    const trainData = replayBuffer.length > 20000 ? replayBuffer.slice(-20000) : [...replayBuffer];
    console.log(`  Training on ${trainData.length} samples (${EPOCHS_RL} epochs):`);
    t = Date.now();
    const { loss: rLoss, mae: rMae } = await trainModel(model, [...trainData], EPOCHS_RL, `1b-${batch}`);
    console.log(`  Done in ${((Date.now()-t)/1000).toFixed(1)}s  loss=${rLoss.toFixed(4)}  mae=${rMae.toFixed(4)}`);

    console.log('  Benchmark:');
    t = Date.now();
    const br = runBenchmark(model);
    process.stdout.write(`    ${((Date.now()-t)/1000).toFixed(1)}s  `);
    let savedThisBatch = false;
    for (const [d, r] of Object.entries(br)) {
      process.stdout.write(`vs ${d}: ${(r.nnFrac*100).toFixed(0)}%  `);
      if (r.nnFrac > bestNNFrac[d] + 0.03) { bestNNFrac[d] = r.nnFrac; savedThisBatch = true; }
    }
    process.stdout.write('\n');

    logLines.push(
      `| ${String(batch).padStart(5)} | ${String(gamesCompleted).padStart(5)} | ${String(totalSamples).padStart(7)}` +
      ` | ${rLoss.toFixed(4)} | ${rMae.toFixed(4)}` +
      ` | ${(br.easy.nnFrac*100).toFixed(0)}%` +
      ` | ${(br.medium.nnFrac*100).toFixed(0)}%` +
      ` | ${(br.hard.nnFrac*100).toFixed(0)}%` +
      ` | ${(br.expert.nnFrac*100).toFixed(0)}%` +
      ` | ${savedThisBatch ? '✓' : ''} |`
    );
    fs.writeFileSync(LOG_FILE, logLines.join('\n') + '\n');
    writeTSVRow(`1b_batch${batch}`, gamesCompleted, totalSamples, rLoss, rMae, br);

    if (savedThisBatch) {
      await model.save(`file://${MODEL_DIR}`);
      console.log('  ✓ New best — model saved');
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`${'═'.repeat(65)}`);
  console.log(`Training complete.  Total samples: ${totalSamples}`);
  for (const [d, frac] of Object.entries(bestNNFrac)) {
    console.log(`  vs ${d.padEnd(6)}: ${(frac*100).toFixed(1)}%`);
  }
  console.log(`Model: ${MODEL_DIR}`);
  console.log(`Log:   ${LOG_FILE}`);

  logLines.push('', '## Final summary', '', `Total samples: ${totalSamples}`,
    ...Object.entries(bestNNFrac).map(([d, f]) => `Best vs ${d}: ${(f*100).toFixed(1)}%`));
  fs.writeFileSync(LOG_FILE, logLines.join('\n') + '\n');
}

main().catch(err => { console.error(err); process.exit(1); });
