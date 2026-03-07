/**
 * ai.js — AI entry point for Photosynthesis.
 *
 * Routes each difficulty to the appropriate implementation:
 *   easy / medium / hard / expert  →  ai_minimax.js (heuristic minimax)
 *   nn                             →  ai_nn.js (neural network eval + minimax)
 *
 * Exports:
 *   executeAITurn(lpState, scoreState, difficulty, aiPlayer, sunPos, revolution)
 *   getAISetupPositions(boardState)
 *   setExpertParams(params)
 */

import { executeMinimaxTurn, executeWithEval, getAISetupPositions, setExpertParams } from './ai_minimax';
import { loadNNModel, isNNModelLoaded, nnEvalFn } from './ai_nn';

export { getAISetupPositions, setExpertParams };

/**
 * Execute a complete AI turn and apply moves to Game.js module state.
 *
 * @param {Object}  lpState     { p1: N, p2: N, ... }
 * @param {Object}  scoreState  { p1: N, p2: N, ... }
 * @param {string}  difficulty  'easy' | 'medium' | 'hard' | 'expert' | 'nn'
 * @param {string}  aiPlayer    'p2' (default)
 * @param {number}  sunPos      0-5
 * @param {number}  revolution  0-2
 */
export function executeAITurn(lpState, scoreState, difficulty, aiPlayer = 'p2', sunPos = 0, revolution = 0) {
  if (difficulty === 'nn') {
    if (isNNModelLoaded()) {
      const evalFn = (state, player, sp) => nnEvalFn(state, player, sp, revolution);
      executeWithEval(lpState, scoreState, 2, evalFn, aiPlayer, sunPos);
    } else {
      // Fall back to expert heuristic until model is trained
      executeMinimaxTurn(lpState, scoreState, 'expert', aiPlayer, sunPos);
    }
  } else {
    executeMinimaxTurn(lpState, scoreState, difficulty, aiPlayer, sunPos);
  }
}

// Kick off NN model load in the background so it's ready when needed.
loadNNModel().catch(() => {});
