'use strict';
/**
 * nn_trainer_phase1.js — Phase 1 distillation trainer.
 *
 * Strategy: play expert-vs-expert games and label each board position
 * with evaluateExpert(state, player, sunPos) / EVAL_NORM.
 * Because labels are deterministic (same position → same score), the
 * NN converges quickly and reliably.  After 2.5 h we expect ~8,000 games
 * and ~300 k samples.  The resulting checkpoint is ready for Phase 2.
 *
 * Run:
 *   PATH=/opt/homebrew/bin:$PATH node src/AI/nn_trainer_phase1.js
 */

const _util = require('util');
if (typeof _util.isNullOrUndefined !== 'function') {
  _util.isNullOrUndefined = (v) => v === null || v === undefined;
}

const tf   = require('@tensorflow/tfjs-node');
const fs   = require('fs');
const path = require('path');

const {
  ALL_COORDS, COORD_INDEX, createGame, runPhotosynthesis, doSetup,
  doPlace, doHarvest, doBuy,
  applyMove, getValidMoves,
  evaluate, evaluateExpert,
  runTurnWithEval,
} = require('./sim_core');

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL_DIR       = path.resolve(__dirname, '../../public/nn_model');
const LOG_FILE        = path.resolve(__dirname, 'nn_phase1_log.md');
const FEATURE_DIM     = 68;

const BATCH_GAMES     = 200;   // games per training batch
const BENCHMARK_GAMES = 10;    // games per difficulty in benchmark
const EPOCHS          = 100;
const MINI_BATCH      = 256;
const REPLAY_MAX      = 100_000;

// evaluateExpert scores are roughly ±600. Divide by EVAL_NORM → ≈[-1,1].
// We clamp at ±1 after normalising.
const EVAL_NORM = 400;

// ─── Feature extraction (identical to nn_trainer_tf.js) ───────────────────────

const PIECE_WEIGHT = { seed: 0.1, 'tree-small': 0.25, 'tree-medium': 0.5, 'tree-large': 1.0 };
const PILE_SIZES   = [3, 5, 6, 9];
const STAGES       = ['seed', 'tree-small', 'tree-medium', 'tree-large'];

function extractFeatures(state, aiPlayer, sunPos, revolution) {
  const features  = new Float32Array(FEATURE_DIM);
  const opponents = Object.keys(state.scores).filter(p => p !== aiPlayer);
  const oppPlayer = opponents[0] || null;

  const cellMap = {};
  for (const [key, piece] of Object.entries(state.boardState)) {
    const w = PIECE_WEIGHT[piece.type] || 0;
    cellMap[key] = piece.owner === aiPlayer ? w : -w;
  }
  for (let i = 0; i < ALL_COORDS.length; i++) {
    const [x, y] = ALL_COORDS[i];
    features[i] = cellMap[`${x},${y}`] || 0;
  }

  const aiLp  = state.lp[aiPlayer] || 0;
  const oppLp = oppPlayer ? (state.lp[oppPlayer] || 0) : 0;
  const aiSc  = state.scores[aiPlayer] || 0;
  const oppSc = oppPlayer ? (state.scores[oppPlayer] || 0) : 0;
  features[37] = Math.min(aiLp  / 20, 2);
  features[38] = Math.min(oppLp / 20, 2);
  features[39] = Math.max(-2, Math.min(2, (aiSc - oppSc) / 50));
  features[40] = Math.min(Math.floor(aiLp / 3) / 10, 2);

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

  features[57 + ((sunPos % 6 + 6) % 6)] = 1;
  features[63] = Math.min((revolution || 0) / 2, 1);
  if (state.scorePiles) {
    for (let r = 0; r < 4; r++) {
      features[64 + r] = (state.scorePiles[r] ? state.scorePiles[r].length : 0) / PILE_SIZES[r];
    }
  }
  return features;
}

// ─── Model ────────────────────────────────────────────────────────────────────

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

async function saveModel(model) {
  await model.save(`file://${MODEL_DIR}`);
}

async function loadOrCreate() {
  if (fs.existsSync(path.join(MODEL_DIR, 'model.json'))) {
    console.log(`Loading existing model from ${MODEL_DIR}`);
    const m = await tf.loadLayersModel(`file://${MODEL_DIR}/model.json`);
    m.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
    console.log(`  Loaded. Params: ${m.countParams()}`);
    return m;
  }
  const m = createModel();
  console.log(`Created new model. Params: ${m.countParams()}`);
  return m;
}

// ─── NN inference (for benchmark) ─────────────────────────────────────────────

function nnBatchEval(model, states, aiPlayer, sunPos, revolution) {
  if (!states.length) return [];
  const matrix = states.map(s => Array.from(extractFeatures(s, aiPlayer, sunPos, revolution)));
  return tf.tidy(() => {
    const out = model.predict(tf.tensor2d(matrix, [matrix.length, FEATURE_DIM]));
    return Array.from(out.dataSync()).map(v => v * EVAL_NORM);
  });
}

function runNNTurn(game, player, model) {
  const rev = game.revolutions || 0;
  runTurnWithEval(game, player, 2,
    (state, p, sp) => nnBatchEval(model, [state], p, sp, rev)[0]);
}

// ─── Random AI (easy benchmark) ───────────────────────────────────────────────

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

// ─── Distillation data collection ─────────────────────────────────────────────
//
// Play nGames of expert-vs-expert.  At the START of each player's turn, record
// (features, label) where label = evaluateExpert(state, player, sunPos) / EVAL_NORM
// clamped to [-1, 1].  This is the teacher signal.

function collectDistillData(nGames) {
  const samples = [];   // { features: Float32Array, label: number }

  for (let g = 0; g < nGames; g++) {
    const game = createGame(['p1', 'p2']);
    doSetup(game);

    for (let rev = 0; rev < 3; rev++) {
      game.revolutions = rev;
      for (let sun = 0; sun < 6; sun++) {
        game.sunPosition = sun;
        runPhotosynthesis(game, sun);

        for (const player of ['p1', 'p2']) {
          // Snapshot state BEFORE the turn — this is what the NN must learn to eval
          const snap = {
            boardState:  { ...game.boardState },
            inventories: Object.fromEntries(Object.entries(game.inventories).map(([p, inv]) => [p, { ...inv }])),
            available:   Object.fromEntries(Object.entries(game.available).map(([p, av]) => [p, { ...av }])),
            lp:          { ...game.lp },
            scores:      { ...game.scores },
            scorePiles:  game.scorePiles.map(p => [...p]),
          };

          const rawLabel = evaluateExpert(snap, player, sun);
          const label = Math.max(-1, Math.min(1, rawLabel / EVAL_NORM));
          samples.push({ features: extractFeatures(snap, player, sun, rev), label });

          // Play the turn
          runTurnWithEval(game, player, 2, evaluateExpert);
          game.activatedThisTurn = new Set();
        }
      }
    }
  }

  return samples;
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

function benchmark(model, nGames) {
  const results = {};
  for (const [name, runOpp] of [
    ['easy',   (g, p) => runRandomTurn(g, p)],
    ['medium', (g, p) => runTurnWithEval(g, p, 2, evaluate)],
    ['expert', (g, p) => runTurnWithEval(g, p, 2, evaluateExpert)],
  ]) {
    let wins = 0;
    for (let i = 0; i < nGames; i++) {
      const game = createGame(['p1', 'p2']);
      doSetup(game);
      for (let rev = 0; rev < 3; rev++) {
        game.revolutions = rev;
        for (let sun = 0; sun < 6; sun++) {
          game.sunPosition = sun;
          runPhotosynthesis(game, sun);
          runNNTurn(game, 'p1', model);
          game.activatedThisTurn = new Set();
          runOpp(game, 'p2');
          game.activatedThisTurn = new Set();
        }
      }
      const p1Final = (game.scores.p1 || 0) + Math.floor((game.lp.p1 || 0) / 3);
      const p2Final = (game.scores.p2 || 0) + Math.floor((game.lp.p2 || 0) / 3);
      if (p1Final > p2Final) wins++;
    }
    results[name] = Math.round((wins / nGames) * 100);
  }
  return results;
}

// ─── Training loop ────────────────────────────────────────────────────────────

async function train(model, replay, samples) {
  if (replay.length + samples.length > REPLAY_MAX) {
    replay.splice(0, replay.length + samples.length - REPLAY_MAX);
  }
  replay.push(...samples);

  // Shuffle
  for (let i = replay.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [replay[i], replay[j]] = [replay[j], replay[i]];
  }

  const xs = tf.tensor2d(replay.map(s => Array.from(s.features)), [replay.length, FEATURE_DIM]);
  const ys = tf.tensor2d(replay.map(s => [s.label]),              [replay.length, 1]);

  const history = await model.fit(xs, ys, {
    epochs: EPOCHS, batchSize: MINI_BATCH,
    validationSplit: 0.1, shuffle: true, verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 20 === 0) {
          console.log(`    epoch ${String(epoch + 1).padStart(3)}/${EPOCHS}  val_loss=${logs.val_loss.toFixed(4)}  val_mae=${logs.val_mae.toFixed(4)}`);
        }
      },
    },
  });
  xs.dispose(); ys.dispose();
  const last = history.history.loss;
  return { loss: last[last.length - 1], mae: history.history.mae[history.history.mae.length - 1] };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const MAX_MS    = 2.5 * 60 * 60 * 1000;   // 2.5 hours

  console.log('═'.repeat(65));
  console.log('  Photosynthesis NN Trainer  —  Phase 1 Distillation');
  console.log(`  Feature dim: ${FEATURE_DIM}  |  Architecture: ${FEATURE_DIM}→128→64→32→1`);
  console.log(`  Teacher: evaluateExpert  |  Batch: ${BATCH_GAMES} games  |  Norm: ${EVAL_NORM}`);
  console.log('═'.repeat(65));

  const model  = await loadOrCreate();
  const replay = [];
  const logLines = ['# Phase 1 Distillation Log', '', `Started: ${new Date().toISOString()}`, ''];

  let totalGames = 0;
  let batch      = 0;

  while (Date.now() - startTime < MAX_MS) {
    batch++;
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log(`\n── Batch ${batch}  (${elapsed} min elapsed, ${totalGames} games so far) ─────`);

    // Collect
    const t0 = Date.now();
    process.stdout.write(`  Collecting ${BATCH_GAMES} expert-vs-expert games...`);
    const samples = collectDistillData(BATCH_GAMES);
    totalGames += BATCH_GAMES;
    const collectSec = ((Date.now() - t0) / 1000).toFixed(1);
    const totalSamples = Math.min(replay.length + samples.length, REPLAY_MAX);
    console.log(` ${samples.length} samples in ${collectSec}s  (replay: ${totalSamples})`);

    // Train
    process.stdout.write(`  Training on ${totalSamples} samples (${EPOCHS} epochs):\n`);
    const t1 = Date.now();
    const { loss, mae } = await train(model, replay, samples);
    const trainSec = ((Date.now() - t1) / 1000).toFixed(1);
    console.log(`  Done in ${trainSec}s  loss=${loss.toFixed(4)}  mae=${mae.toFixed(4)}`);

    // Benchmark
    process.stdout.write(`  Benchmark (${BENCHMARK_GAMES} games each):`);
    const t2 = Date.now();
    const res = benchmark(model, BENCHMARK_GAMES);
    const benchSec = ((Date.now() - t2) / 1000).toFixed(1);
    const line = Object.entries(res).map(([k, v]) => `vs ${k}: ${v}%`).join('  ');
    console.log(`  ${benchSec}s  ${line}`);

    // Save checkpoint
    await saveModel(model);

    // Log
    logLines.push(`## Batch ${batch}  (${totalGames} games)`);
    logLines.push(`- collect: ${collectSec}s, train: ${trainSec}s, bench: ${benchSec}s`);
    logLines.push(`- loss=${loss.toFixed(4)} mae=${mae.toFixed(4)}`);
    logLines.push(`- ${line}`);
    logLines.push('');
    fs.writeFileSync(LOG_FILE, logLines.join('\n'));
  }

  const totalMin = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  Done. ${totalGames} games, ${batch} batches, ${totalMin} min.`);
  console.log('═'.repeat(65));
}

main().catch(e => { console.error(e); process.exit(1); });
