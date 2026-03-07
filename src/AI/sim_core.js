'use strict';
/**
 * sim_core.js — shared Photosynthesis game simulation (CommonJS).
 *
 * Used by simulation.js, nn_trainer_tf.js, and future Node.js trainers.
 * ai.js duplicates some of this for the browser (Vite/ES-module context).
 */

// ─── Hex helpers ──────────────────────────────────────────────────────────────

function hexDist(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  return Math.max(dy, (dx + dy) / 2);
}

const ALL_COORDS = [];
for (let y = -3; y <= 3; y++) {
  const mx = 6 - Math.abs(y);
  for (let x = -mx; x <= mx; x += 2) ALL_COORDS.push([x, y]);
}

// Maps each coord to its index in ALL_COORDS for fast lookup
const COORD_INDEX = new Map(ALL_COORDS.map(([x, y], i) => [`${x},${y}`, i]));

// ─── Game constants ────────────────────────────────────────────────────────────

const SCORE_PILES_INIT = [
  [22, 21, 20],
  [19, 18, 18, 17, 17],
  [16, 16, 14, 14, 13, 13],
  [14, 14, 13, 13, 13, 12, 12, 12, 12],
];

const MOVEMENT_COSTS = { seed: 1, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SLOT_COSTS     = [1, 1, 1, 1,  2, 2, 3, 3,  3, 3, 4,  4, 5];
const SLOT_RANGES    = {
  seed:          { start: 0,  end: 3  },
  'tree-small':  { start: 4,  end: 7  },
  'tree-medium': { start: 8,  end: 10 },
  'tree-large':  { start: 11, end: 12 },
};
const TREE_RANGES  = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const GROWTH_CHAIN = { seed: 'tree-small', 'tree-small': 'tree-medium', 'tree-medium': 'tree-large' };
const LP_PER_TREE  = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const LP_EARN      = LP_PER_TREE; // alias used by evaluate functions
const SHADOW_DIRS  = [[-1,-1],[-2,0],[-1,1],[1,1],[2,0],[1,-1]];
const SHADOW_RANGE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const TREE_SIZE    = { seed: 0, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

function slotCost(pos) { return SLOT_COSTS[pos] || 0; }

function findOpenSlot(type, inv) {
  const range = SLOT_RANGES[type];
  if (!range) return null;
  const used = new Set(Object.values(inv).map(p => p.position));
  for (let pos = range.end; pos >= range.start; pos--) {
    if (!used.has(pos)) return pos;
  }
  return null;
}

// ─── Game initialisation ──────────────────────────────────────────────────────

function initPlayerInventory(startId) {
  let id = startId;
  const avail = {}, inv = {};
  avail[id++] = { type: 'seed',       position: 0 };
  avail[id++] = { type: 'seed',       position: 1 };
  avail[id++] = { type: 'tree-small', position: 2 };
  avail[id++] = { type: 'tree-small', position: 3 };
  for (let i = 0; i < 4; i++) inv[id++] = { type: 'seed',        position: i };
  for (let i = 0; i < 4; i++) inv[id++] = { type: 'tree-small',  position: i + 4 };
  for (let i = 0; i < 3; i++) inv[id++] = { type: 'tree-medium', position: i + 8 };
  for (let i = 0; i < 2; i++) inv[id++] = { type: 'tree-large',  position: i + 11 };
  return { avail, inv, nextId: id };
}

function createGame(players) {
  const inventories = {}, available = {}, lp = {}, scores = {};
  let nextId = 0;
  for (const p of players) {
    const init = initPlayerInventory(nextId);
    inventories[p] = init.inv;
    available[p]   = init.avail;
    lp[p] = 0; scores[p] = 0;
    nextId = init.nextId;
  }
  return {
    players, boardState: {}, inventories, available, lp, scores,
    scorePiles: SCORE_PILES_INIT.map(p => [...p]),
    sunPos: 0, revolutions: 0,
    setupPlaced: Object.fromEntries(players.map(p => [p, 0])),
  };
}

// ─── Photosynthesis ───────────────────────────────────────────────────────────

function computeLPShadows(boardState, sunPos) {
  const [dx, dy] = SHADOW_DIRS[((sunPos % 6) + 6) % 6];
  const shadowed  = new Set();
  for (const [key, caster] of Object.entries(boardState)) {
    const range = SHADOW_RANGE[caster.type]; if (!range) continue;
    const [cx, cy] = key.split(',').map(Number);
    const sz = TREE_SIZE[caster.type];
    for (let step = 1; step <= range; step++) {
      const tk = `${cx + dx * step},${cy + dy * step}`;
      const target = boardState[tk];
      if (target && TREE_SIZE[target.type] <= sz) shadowed.add(tk);
    }
  }
  return shadowed;
}

function runPhotosynthesis(game) {
  const shadows = computeLPShadows(game.boardState, game.sunPos);
  for (const p of game.players) {
    let gained = 0;
    for (const [key, piece] of Object.entries(game.boardState)) {
      if (piece.owner !== p) continue;
      const lp = LP_PER_TREE[piece.type];
      if (lp && !shadows.has(key)) gained += lp;
    }
    game.lp[p] += gained;
  }
}

// ─── Move execution (mutates live game state) ─────────────────────────────────

function doPlace(game, player, pieceId, toX, toY, fromLocation) {
  const inv = game.inventories[player], avail = game.available[player];
  const piece = fromLocation === 'inventory' ? inv[pieceId] : avail[pieceId];
  game.lp[player] = Math.max(0, game.lp[player]
    - (MOVEMENT_COSTS[piece.type] || 0)
    - (fromLocation === 'inventory' ? slotCost(piece.position) : 0));
  const boardKey = `${toX},${toY}`;
  const existing = game.boardState[boardKey];
  if (existing) {
    const openPos = findOpenSlot(existing.type, inv);
    if (openPos !== null) inv[existing.id] = { type: existing.type, position: openPos };
  }
  game.boardState[boardKey] = { type: piece.type, id: pieceId, owner: player };
  if (game.activatedThisTurn) game.activatedThisTurn.add(boardKey);
  if (fromLocation === 'inventory') delete inv[pieceId]; else delete avail[pieceId];
}

function doHarvest(game, player, pieceId) {
  const boardKey = Object.keys(game.boardState).find(k => game.boardState[k].id === pieceId);
  if (!boardKey) return;
  const [bx, by] = boardKey.split(',').map(Number);
  const ring = Math.round(hexDist(bx, by, 0, 0));
  let scoreVal = 0;
  for (let r = ring; r <= 3; r++) {
    if (game.scorePiles[r].length > 0) { scoreVal = game.scorePiles[r].shift(); break; }
  }
  const pieceType = game.boardState[boardKey].type;
  delete game.boardState[boardKey];
  game.lp[player] = Math.max(0, game.lp[player] - 4);
  game.scores[player] += scoreVal;
  if (game.activatedThisTurn) game.activatedThisTurn.add(boardKey);
  const openPos = findOpenSlot(pieceType, game.inventories[player]);
  if (openPos !== null) game.inventories[player][pieceId] = { type: pieceType, position: openPos };
}

function doBuy(game, player, pieceId, toPosition) {
  const inv = game.inventories[player], piece = inv[pieceId];
  if (!piece) return;
  game.lp[player] = Math.max(0, game.lp[player] - slotCost(piece.position));
  game.available[player][pieceId] = { type: piece.type, position: toPosition };
  delete inv[pieceId];
}

// ─── Simulation state helpers (immutable lookahead) ───────────────────────────

function snapshotState(state) {
  return {
    boardState:  { ...state.boardState },
    inventories: Object.fromEntries(Object.entries(state.inventories).map(([p, inv]) => [p, { ...inv }])),
    available:   Object.fromEntries(Object.entries(state.available).map(([p, av]) => [p, { ...av }])),
    lp:          { ...state.lp },
    scores:      { ...state.scores },
    scorePiles:  state.scorePiles.map(p => [...p]),
    activated:   new Set(state.activated),
  };
}

function applyMove(state, move, player) {
  const s = snapshotState(state);
  const inv = s.inventories[player], avail = s.available[player];

  if (move.action === 'place' || move.action === 'grow') {
    const { pieceId, toX, toY, from } = move;
    const key = `${toX},${toY}`;
    let pieceType;
    if (from === 'inventory') {
      pieceType = inv[pieceId].type;
      s.lp[player] = Math.max(0, s.lp[player] - slotCost(inv[pieceId].position) - (MOVEMENT_COSTS[pieceType] || 0));
      delete inv[pieceId];
    } else {
      pieceType = avail[pieceId].type;
      s.lp[player] = Math.max(0, s.lp[player] - (MOVEMENT_COSTS[pieceType] || 0));
      delete avail[pieceId];
    }
    const existing = s.boardState[key];
    if (existing) {
      const openPos = findOpenSlot(existing.type, inv);
      if (openPos !== null) inv[existing.id] = { type: existing.type, position: openPos };
    }
    s.boardState[key] = { type: pieceType, id: pieceId, owner: player };
    s.activated.add(key);

  } else if (move.action === 'buy') {
    const pieceType = inv[move.pieceId].type;
    s.lp[player] = Math.max(0, s.lp[player] - slotCost(inv[move.pieceId].position));
    delete inv[move.pieceId];
    avail[move.pieceId] = { type: pieceType, position: move.toPosition };

  } else if (move.action === 'harvest') {
    const key = Object.keys(s.boardState).find(k => s.boardState[k].id === move.pieceId);
    if (!key) return s;
    const [bx, by] = key.split(',').map(Number);
    const ring = Math.round(hexDist(bx, by, 0, 0));
    let scoreVal = 0;
    for (let r = ring; r <= 3; r++) {
      if (s.scorePiles[r].length > 0) { scoreVal = s.scorePiles[r].shift(); break; }
    }
    const pieceType = s.boardState[key].type;
    delete s.boardState[key];
    s.lp[player] = Math.max(0, s.lp[player] - 4);
    s.scores[player] += scoreVal;
    s.activated.add(key);
    const openPos = findOpenSlot(pieceType, inv);
    if (openPos !== null) inv[move.pieceId] = { type: pieceType, position: openPos };
  }
  return s;
}

// ─── Move generation ──────────────────────────────────────────────────────────

function getValidMoves(state, player) {
  const inv = state.inventories[player], avail = state.available[player];
  const lp = state.lp[player], moves = [];

  for (const [key, piece] of Object.entries(state.boardState)) {
    if (piece.owner !== player || piece.type !== 'tree-large' || state.activated.has(key)) continue;
    if (lp >= 4) moves.push({ action: 'harvest', pieceId: piece.id });
  }

  const sources = [
    ...Object.entries(avail).map(([id, p]) => ({ pieceId: id, type: p.type, from: 'available', cost: MOVEMENT_COSTS[p.type] || 0 })),
    ...Object.entries(inv).map(([id, p])   => ({ pieceId: id, type: p.type, from: 'inventory',  cost: (MOVEMENT_COSTS[p.type] || 0) + slotCost(p.position) })),
  ];

  for (const src of sources) {
    if (src.cost > lp) continue;
    for (const [x, y] of ALL_COORDS) {
      const key = `${x},${y}`;
      if (state.activated.has(key)) continue;
      const existing = state.boardState[key];
      if (src.type === 'seed') {
        if (existing !== undefined) continue;
        const canReach = Object.entries(state.boardState).some(([k, piece]) => {
          if (piece.owner !== player || state.activated.has(k)) return false;
          const r = TREE_RANGES[piece.type]; if (!r) return false;
          const [tx, ty] = k.split(',').map(Number);
          return hexDist(tx, ty, x, y) <= r;
        });
        if (!canReach) continue;
        moves.push({ action: 'place', pieceId: src.pieceId, toX: x, toY: y, from: src.from });
      } else {
        if (!existing || existing.owner !== player) continue;
        if (GROWTH_CHAIN[existing.type] !== src.type) continue;
        moves.push({ action: 'grow', pieceId: src.pieceId, toX: x, toY: y, from: src.from });
      }
    }
  }

  for (const [id, piece] of Object.entries(inv)) {
    const cost = slotCost(piece.position);
    if (cost > lp || !SLOT_RANGES[piece.type]) continue;
    const usedAvail = new Set(Object.values(avail).map(p => p.position));
    for (let pos = 0; pos <= 7; pos++) {
      if (!usedAvail.has(pos)) { moves.push({ action: 'buy', pieceId: id, toPosition: pos }); break; }
    }
  }
  return moves;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function getAISetupPositions(boardState) {
  const outerRing = ALL_COORDS.filter(([x, y]) => hexDist(x, y, 0, 0) === 3);
  const free      = outerRing.filter(([x, y]) => !boardState[`${x},${y}`]);
  if (free.length < 2) return free.slice(0, 2);
  const withAngle = free.map(([x, y]) => ({ x, y, angle: Math.atan2(y, x) }));
  withAngle.sort((a, b) => a.angle - b.angle);
  const first = withAngle[Math.floor(withAngle.length * 0.1)];
  const tgt   = first.angle + Math.PI;
  const second = withAngle.reduce((best, c) => {
    const d  = Math.abs(((c.angle - tgt + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const bd = Math.abs(((best.angle - tgt + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    return d < bd ? c : best;
  });
  return [[first.x, first.y], [second.x, second.y]];
}

function doSetup(game) {
  for (const player of game.players) {
    const positions = getAISetupPositions(game.boardState);
    const smallIds  = Object.entries(game.available[player])
      .filter(([, p]) => p.type === 'tree-small').map(([id]) => id);
    for (let i = 0; i < Math.min(2, positions.length, smallIds.length); i++) {
      const [x, y] = positions[i], id = smallIds[i];
      game.boardState[`${x},${y}`] = { type: 'tree-small', id, owner: player };
      delete game.available[player][id];
      game.setupPlaced[player]++;
    }
  }
}

// ─── Evaluation: basic heuristic ──────────────────────────────────────────────

const BASIC_RING_BONUS = [8, 5.5, 3, 1];
const BASIC_TREE_VALUE = { seed: 0.4, 'tree-small': 2, 'tree-medium': 4.5, 'tree-large': 10 };
const BASIC_LP_WEIGHTS = [0, 5, 3, 1.8, 1, 0.5];

function evaluate(state, aiPlayer, sunPos) {
  const opponents    = Object.keys(state.scores).filter(p => p !== aiPlayer);
  const aiScore      = state.scores[aiPlayer] || 0;
  const aiLp         = state.lp[aiPlayer] || 0;
  const bestOppScore = opponents.length ? Math.max(...opponents.map(p => state.scores[p] || 0)) : 0;
  const bestOppLp    = opponents.length ? Math.max(...opponents.map(p => state.lp[p] || 0)) : 0;

  let score = (aiScore - bestOppScore) * 20;
  score += (Math.floor(aiLp / 3) - Math.floor(bestOppLp / 3)) * 4;
  score += aiLp * 0.5;

  for (const [key, piece] of Object.entries(state.boardState)) {
    const [x, y] = key.split(',').map(Number);
    const ring    = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
    const tv      = BASIC_RING_BONUS[ring] * (BASIC_TREE_VALUE[piece.type] || 0);
    score += piece.owner === aiPlayer ? tv : -tv * 0.9;
  }

  for (let offset = 1; offset <= 5; offset++) {
    const w = BASIC_LP_WEIGHTS[offset];
    const shad = computeLPShadows(state.boardState, (sunPos + offset) % 6);
    for (const [key, piece] of Object.entries(state.boardState)) {
      const lp = LP_EARN[piece.type]; if (!lp || shad.has(key)) continue;
      if (piece.owner === aiPlayer) score += lp * w; else score -= lp * w;
    }
  }

  for (const [cx, cy] of ALL_COORDS) {
    const key = `${cx},${cy}`;
    if (state.boardState[key]) continue;
    const ring = Math.min(3, Math.round(hexDist(cx, cy, 0, 0)));
    if (ring > 1) continue;
    let aiR = false, oppR = false;
    for (const [k, piece] of Object.entries(state.boardState)) {
      const r = TREE_RANGES[piece.type]; if (!r) continue;
      const [tx, ty] = k.split(',').map(Number);
      if (hexDist(tx, ty, cx, cy) > r) continue;
      if (piece.owner === aiPlayer) aiR = true; else oppR = true;
      if (aiR && oppR) break;
    }
    const cb = ring === 0 ? 5 : 2.5;
    if (aiR && !oppR) score += cb;
    else if (!aiR && oppR) score -= cb * 0.7;
  }
  return score;
}

// ─── Evaluation: expert heuristic (trained via 130-round self-play) ───────────
// See ai_expert_params.js and improvements.md for training history.

const EXPERT_PARAMS = {
  VP_WEIGHT: 25, LP_VP_WEIGHT: 6, LP_DIRECT: 0.8,
  RING_BONUS: [10, 7, 3, 1],
  TREE_VALUE: { seed: 0.4, 'tree-small': 2, 'tree-medium': 4.5, 'tree-large': 10 },
  LP_FUTURE_WEIGHTS: [0, 7, 3, 1.8, 1, 0.5],
  OPP_BOARD_FACTOR: 0.9, AREA_CENTER_BONUS: 5, AREA_RING1_BONUS: 2.5, AREA_OPP_FACTOR: 0.7,
};

function evaluateExpert(state, aiPlayer, sunPos) {
  const ep        = EXPERT_PARAMS;
  const opponents = Object.keys(state.scores).filter(x => x !== aiPlayer);
  const aiScore   = state.scores[aiPlayer] || 0;
  const aiLp      = state.lp[aiPlayer] || 0;
  const bestOppScore = opponents.length ? Math.max(...opponents.map(x => state.scores[x] || 0)) : 0;
  const bestOppLp    = opponents.length ? Math.max(...opponents.map(x => state.lp[x] || 0)) : 0;

  let score = (aiScore - bestOppScore) * ep.VP_WEIGHT;
  score += (Math.floor(aiLp / 3) - Math.floor(bestOppLp / 3)) * ep.LP_VP_WEIGHT;
  score += aiLp * ep.LP_DIRECT;

  for (const [key, piece] of Object.entries(state.boardState)) {
    const [x, y] = key.split(',').map(Number);
    const ring = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
    const tv   = ep.RING_BONUS[ring] * (ep.TREE_VALUE[piece.type] || 0);
    score += piece.owner === aiPlayer ? tv : -tv * ep.OPP_BOARD_FACTOR;
  }

  for (let offset = 1; offset <= 5; offset++) {
    const w = ep.LP_FUTURE_WEIGHTS[offset];
    const shad = computeLPShadows(state.boardState, (sunPos + offset) % 6);
    for (const [key, piece] of Object.entries(state.boardState)) {
      const lp = LP_EARN[piece.type]; if (!lp || shad.has(key)) continue;
      if (piece.owner === aiPlayer) score += lp * w; else score -= lp * w;
    }
  }

  for (const [cx, cy] of ALL_COORDS) {
    const key = `${cx},${cy}`;
    if (state.boardState[key]) continue;
    const ring = Math.min(3, Math.round(hexDist(cx, cy, 0, 0)));
    if (ring > 1) continue;
    let aiR = false, oppR = false;
    for (const [k, piece] of Object.entries(state.boardState)) {
      const r = TREE_RANGES[piece.type]; if (!r) continue;
      const [tx, ty] = k.split(',').map(Number);
      if (hexDist(tx, ty, cx, cy) > r) continue;
      if (piece.owner === aiPlayer) aiR = true; else oppR = true;
      if (aiR && oppR) break;
    }
    const bonus = ring === 0 ? ep.AREA_CENTER_BONUS : ep.AREA_RING1_BONUS;
    if (aiR && !oppR) score += bonus;
    else if (!aiR && oppR) score -= bonus * ep.AREA_OPP_FACTOR;
  }

  // Pipeline completeness (v122)
  const STAGES = ['seed', 'tree-small', 'tree-medium', 'tree-large'];
  const inAvail = new Set(Object.values(state.available[aiPlayer] || {}).map(q => q.type));
  const inInv   = new Set(Object.values(state.inventories[aiPlayer] || {}).map(q => q.type));
  for (const stage of STAGES) {
    if (inAvail.has(stage)) score += 1.25; else if (inInv.has(stage)) score += 0.50;
  }

  // Harvest readiness
  for (const [, piece] of Object.entries(state.boardState)) {
    if (piece.owner === aiPlayer && piece.type === 'tree-large') {
      if (aiLp >= 4) score += 6;
      break;
    }
  }
  return score;
}

// ─── Minimax search ───────────────────────────────────────────────────────────

const MAX_CANDIDATES = 15;

/**
 * Find the best move using minimax search to `depth` levels.
 * evalFn(state, aiPlayer, sunPos) → number
 */
function bestMoveWithEval(state, player, depth, aiPlayer, sunPos, evalFn) {
  let moves = getValidMoves(state, player);
  if (!moves.length) return null;
  if (moves.length > MAX_CANDIDATES && depth > 1) {
    const scored = moves.map(m => ({ m, sc: evalFn(applyMove(state, m, player), aiPlayer, sunPos) }));
    scored.sort((a, b) => b.sc - a.sc);
    moves = scored.slice(0, MAX_CANDIDATES).map(x => x.m);
  }
  let best = null, bestScore = -Infinity;
  for (const move of moves) {
    const next = applyMove(state, move, player);
    let sc;
    if (depth <= 1) sc = evalFn(next, aiPlayer, sunPos);
    else {
      const fu = bestMoveWithEval(next, player, depth - 1, aiPlayer, sunPos, evalFn);
      sc = fu ? evalFn(applyMove(next, fu, player), aiPlayer, sunPos) : evalFn(next, aiPlayer, sunPos);
    }
    if (sc > bestScore) { bestScore = sc; best = move; }
  }
  return best;
}

/**
 * Run a complete AI turn on the live game object using the given eval function.
 * Mutates game (doPlace/doHarvest/doBuy) and returns nothing.
 */
function runTurnWithEval(game, player, depth, evalFn) {
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

/**
 * Run a full game. Each player's difficulty maps to a depth + evalFn.
 * playerConfigs: { p1: { depth, evalFn }, p2: { depth, evalFn }, ... }
 * Returns { scores, lp }
 */
function runFullGame(players, playerConfigs) {
  const game = createGame(players);
  doSetup(game);
  runPhotosynthesis(game);

  for (let cycle = 0; cycle < 19; cycle++) {
    const revolution   = Math.floor(cycle / 6);
    const isFinalRound = cycle === 18;
    // Rotate player order each revolution
    const offset = revolution % players.length;
    const order  = [...players.slice(offset), ...players.slice(0, offset)];

    for (const player of order) {
      const cfg = playerConfigs[player];
      runTurnWithEval(game, player, cfg.depth, cfg.evalFn);
    }

    if (isFinalRound) break;
    game.sunPos = (game.sunPos + 1) % 6;
    if (game.sunPos === 0) game.revolutions++;
    runPhotosynthesis(game);
  }

  for (const p of players) game.scores[p] += Math.floor(game.lp[p] / 3);
  return { scores: { ...game.scores }, lp: { ...game.lp } };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Hex
  hexDist, ALL_COORDS, COORD_INDEX,
  // Constants
  SCORE_PILES_INIT, MOVEMENT_COSTS, SLOT_COSTS, SLOT_RANGES,
  TREE_RANGES, GROWTH_CHAIN, LP_PER_TREE, LP_EARN,
  SHADOW_DIRS, SHADOW_RANGE, TREE_SIZE,
  // Utilities
  slotCost, findOpenSlot,
  // Game lifecycle
  initPlayerInventory, createGame, runPhotosynthesis, computeLPShadows,
  doPlace, doHarvest, doBuy, doSetup, getAISetupPositions,
  // Simulation
  snapshotState, applyMove, getValidMoves,
  // Evaluation
  evaluate, evaluateExpert, EXPERT_PARAMS,
  // Search
  MAX_CANDIDATES, bestMoveWithEval, runTurnWithEval, runFullGame,
};
