/**
 * ai_nn.js — Neural network AI for Photosynthesis (browser inference).
 *
 * Loads the model trained by nn_trainer_tf.js from /nn_model/model.json
 * and uses it as the evaluation function inside a depth-2 minimax search.
 *
 * Call loadNNModel() once at startup before using executeNNTurn().
 *
 * The same 68-feature state representation is used here and in the trainer.
 * Feature layout is defined in nn_trainer_tf.js — see FEATURE_DIM comment block.
 */

// ─── Feature extraction (must match nn_trainer_tf.js exactly) ─────────────────

const FEATURE_DIM = 68;
const ALL_COORDS_NN = [];
for (let y = -3; y <= 3; y++) {
  const mx = 6 - Math.abs(y);
  for (let x = -mx; x <= mx; x += 2) ALL_COORDS_NN.push([x, y]);
}

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
  for (let i = 0; i < ALL_COORDS_NN.length; i++) {
    const [x, y] = ALL_COORDS_NN[i];
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

// ─── Model loading ─────────────────────────────────────────────────────────────

let _model = null;
let _tf    = null;

/**
 * Load the trained NN model from /nn_model/model.json.
 * Must be called before executeNNTurn(). Safe to call multiple times.
 * Returns true if load succeeded, false if model not yet trained.
 */
export async function loadNNModel() {
  if (_model) return true;
  try {
    _tf = (await import('@tensorflow/tfjs')).default || await import('@tensorflow/tfjs');
    _model = await _tf.loadLayersModel('/nn_model/model.json');
    console.log('[ai_nn] Neural network model loaded.');
    return true;
  } catch (e) {
    console.warn('[ai_nn] No trained model found at /nn_model/model.json — NN AI unavailable.', e.message);
    return false;
  }
}

export function isNNModelLoaded() { return _model !== null; }

// ─── NN evaluation (batch inference) ──────────────────────────────────────────

function nnEvalBatch(states, aiPlayer, sunPos, revolution) {
  if (!_model || !_tf) return states.map(() => 0);
  const featureMatrix = states.map(s => Array.from(extractFeatures(s, aiPlayer, sunPos, revolution)));
  return _tf.tidy(() => {
    const input  = _tf.tensor2d(featureMatrix, [featureMatrix.length, FEATURE_DIM]);
    const output = _model.predict(input);
    // Scale back from normalized [-1,1] to score-like units for compatibility with minimax
    return Array.from(output.dataSync()).map(v => v * 200);
  });
}

// ─── NN-backed minimax (depth 2, batch leaves) ────────────────────────────────

// Imported lazily to avoid circular deps — same logic as ai_minimax.js
// We re-declare the minimum needed here. A future refactor may unify via a shared module.

function nnEvalFn(state, aiPlayer, sunPos, revolution) {
  const scores = nnEvalBatch([state], aiPlayer, sunPos, revolution);
  return scores[0];
}

/**
 * Execute a complete NN AI turn. Falls back to the provided fallbackEvalFn
 * if the model isn't loaded.
 *
 * @param {Function} executeMinimaxTurn — the minimax fallback (from ai_minimax.js)
 * @param {*} args — same args as executeMinimaxTurn
 */
export function executeNNTurn(executeMinimaxTurn, lpState, scoreState, aiPlayer, sunPos, revolution) {
  if (!_model) {
    // Fall back to expert minimax until model is trained
    return executeMinimaxTurn(lpState, scoreState, 'expert', aiPlayer, sunPos, revolution);
  }
  // Use the minimax turn with NN eval substituted
  // (nn difficulty maps to depth-2 NN eval in ai.js)
  return executeMinimaxTurn(lpState, scoreState, '_nn_internal_', aiPlayer, sunPos, revolution, nnEvalFn);
}

export { nnEvalFn, extractFeatures, FEATURE_DIM };
