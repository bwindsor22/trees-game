'use strict';
/**
 * Standalone test runner for Photosynthesis AI.
 * Run with:  PATH=/opt/homebrew/bin:$PATH node src/AI/simulation.js
 */

const { runFullGame, evaluate, evaluateExpert } = require('./sim_core');

const RUNS        = 10;
const players     = ['p1', 'p2', 'p3'];
const difficulties = ['easy', 'medium', 'hard'];

// easy = random depth-1, medium = depth-2 basic, hard = depth-4 basic
function makeConfig(difficulty) {
  if (difficulty === 'easy') {
    // Random: pick random move from depth-1 eval (slightly guided)
    const rndEval = (state, aiPlayer, sunPos) => evaluate(state, aiPlayer, sunPos) + Math.random() * 30;
    return { depth: 1, evalFn: rndEval };
  }
  if (difficulty === 'medium') return { depth: 2, evalFn: evaluate };
  if (difficulty === 'hard')   return { depth: 4, evalFn: evaluate };
  if (difficulty === 'expert') return { depth: 4, evalFn: evaluateExpert };
  throw new Error(`Unknown difficulty: ${difficulty}`);
}

const totals = {};
for (const p of players) totals[p] = { wins: 0, totalScore: 0 };

console.log(`Running ${RUNS} games: ${difficulties.join(' vs ')}\n`);

for (let run = 1; run <= RUNS; run++) {
  const configs = Object.fromEntries(players.map((p, i) => [p, makeConfig(difficulties[i])]));
  const { scores } = runFullGame(players, configs);
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  totals[sorted[0][0]].wins++;
  for (const p of players) totals[p].totalScore += scores[p];
  console.log(`Game ${run}: ${sorted.map(([p, s]) => `${difficulties[players.indexOf(p)]}=${s}`).join('  ')}`);
}

console.log('\n─── Summary ───');
for (const [i, p] of players.entries()) {
  console.log(`  ${difficulties[i].padEnd(6)}: ${totals[p].wins}/${RUNS} wins, avg ${(totals[p].totalScore / RUNS).toFixed(1)}`);
}
