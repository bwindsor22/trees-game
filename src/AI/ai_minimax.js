/**
 * ai_minimax.js — Minimax AI for Photosynthesis.
 *
 * Exports:
 *   executeMinimaxTurn(lpState, scoreState, difficulty, aiPlayer, sunPos, revolution)
 *   getAISetupPositions(boardState)
 *
 * Difficulties:
 *   easy   — random top-3 move selection
 *   medium — greedy depth-2 (best immediate move)
 *   hard   — depth-4 minimax (basic heuristic)
 *   expert — depth-4 minimax (trained heuristic, 130-round self-play)
 */

import { getBoardState, setCurrentPlayer, clearTurnActions, movePiece } from '../view/board/Game';

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

// ─── Game constants ────────────────────────────────────────────────────────────

const GROWTH_CHAIN   = { seed: 'tree-small', 'tree-small': 'tree-medium', 'tree-medium': 'tree-large' };
const MOVEMENT_COSTS = { seed: 1, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SLOT_COSTS     = [1, 1, 1, 1,  2, 2, 3, 3,  3, 3, 4,  4, 5];
const SLOT_RANGES    = {
  seed:          { start: 0,  end: 3  },
  'tree-small':  { start: 4,  end: 7  },
  'tree-medium': { start: 8,  end: 10 },
  'tree-large':  { start: 11, end: 12 },
};
const TREE_RANGES = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SHADOW_DIRS = [[-1,-1],[-2,0],[-1,1],[1,1],[2,0],[1,-1]];
const SHADOW_RANGE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const TREE_SIZE   = { seed: 0, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const LP_EARN     = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

function slotCost(pos) { return SLOT_COSTS[pos] || 0; }

function findOpenSlot(type, inv) {
  const range = SLOT_RANGES[type]; if (!range) return null;
  const used = new Set(Object.values(inv).map(p => p.position));
  for (let pos = range.end; pos >= range.start; pos--) {
    if (!used.has(pos)) return pos;
  }
  return null;
}

// ─── Shadow computation ────────────────────────────────────────────────────────

function computeEvalShadows(boardState, sunPos) {
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

// ─── Immutable lookahead ───────────────────────────────────────────────────────

function snapshot(state) {
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
  const s = snapshot(state);
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
      const op = findOpenSlot(existing.type, inv);
      if (op !== null) inv[existing.id] = { type: existing.type, position: op };
    }
    s.boardState[key] = { type: pieceType, id: pieceId, owner: player };
    s.activated.add(key);

  } else if (move.action === 'buy') {
    const pt = inv[move.pieceId].type;
    s.lp[player] = Math.max(0, s.lp[player] - slotCost(inv[move.pieceId].position));
    delete inv[move.pieceId];
    avail[move.pieceId] = { type: pt, position: move.toPosition };

  } else if (move.action === 'harvest') {
    const key = Object.keys(s.boardState).find(k => s.boardState[k].id === move.pieceId);
    if (!key) return s;
    const [bx, by] = key.split(',').map(Number);
    const ring = Math.round(hexDist(bx, by, 0, 0));
    let scoreVal = 0;
    for (let r = ring; r <= 3; r++) {
      if (s.scorePiles[r].length > 0) { scoreVal = s.scorePiles[r].shift(); break; }
    }
    const pt = s.boardState[key].type;
    delete s.boardState[key];
    s.lp[player] = Math.max(0, s.lp[player] - 4);
    s.scores[player] += scoreVal;
    s.activated.add(key);
    const op = findOpenSlot(pt, inv);
    if (op !== null) inv[move.pieceId] = { type: pt, position: op };
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

// ─── Basic evaluation ─────────────────────────────────────────────────────────

const RING_BONUS = [8, 5.5, 3, 1];
const TREE_VALUE = { seed: 0.4, 'tree-small': 2, 'tree-medium': 4.5, 'tree-large': 10 };

function evaluate(state, aiPlayer, sunPos) {
  const opponents    = Object.keys(state.scores).filter(p => p !== aiPlayer);
  const aiScore      = state.scores[aiPlayer] || 0;
  const aiLp         = state.lp[aiPlayer] || 0;
  const bestOppScore = opponents.length ? Math.max(...opponents.map(p => state.scores[p] || 0)) : 0;
  const bestOppLp    = opponents.length ? Math.max(...opponents.map(p => state.lp[p] || 0)) : 0;

  let score = (aiScore - bestOppScore) * 20;
  score += (Math.floor(aiLp / 3) - Math.floor(bestOppLp / 3)) * 4;
  score += aiLp * 0.5;

  const LP_WEIGHTS = [0, 5, 3, 1.8, 1, 0.5];
  for (const [key, piece] of Object.entries(state.boardState)) {
    const [x, y] = key.split(',').map(Number);
    const ring    = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
    const tv      = RING_BONUS[ring] * (TREE_VALUE[piece.type] || 0);
    score += piece.owner === aiPlayer ? tv : -tv * 0.9;
  }
  for (let offset = 1; offset <= 5; offset++) {
    const w = LP_WEIGHTS[offset];
    const shad = computeEvalShadows(state.boardState, (sunPos + offset) % 6);
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

// ─── Expert evaluation (trained, 130-round self-play) ──────────────────────────

let _expertParams = null;
function getExpertParams() {
  if (_expertParams) return _expertParams;
  _expertParams = {
    VP_WEIGHT: 25, LP_VP_WEIGHT: 6, LP_DIRECT: 0.8,
    RING_BONUS: [10, 7, 3, 1],
    TREE_VALUE: { seed: 0.4, 'tree-small': 2, 'tree-medium': 4.5, 'tree-large': 10 },
    LP_FUTURE_WEIGHTS: [0, 7, 3, 1.8, 1, 0.5],
    OPP_BOARD_FACTOR: 0.9, AREA_CENTER_BONUS: 5, AREA_RING1_BONUS: 2.5, AREA_OPP_FACTOR: 0.7,
  };
  return _expertParams;
}

export function setExpertParams(params) { _expertParams = params; }

function evaluateExpert(state, aiPlayer, sunPos) {
  const p = getExpertParams();
  const opponents    = Object.keys(state.scores).filter(x => x !== aiPlayer);
  const aiScore      = state.scores[aiPlayer] || 0;
  const aiLp         = state.lp[aiPlayer] || 0;
  const bestOppScore = opponents.length ? Math.max(...opponents.map(x => state.scores[x] || 0)) : 0;
  const bestOppLp    = opponents.length ? Math.max(...opponents.map(x => state.lp[x] || 0)) : 0;

  let score = (aiScore - bestOppScore) * p.VP_WEIGHT;
  score += (Math.floor(aiLp / 3) - Math.floor(bestOppLp / 3)) * p.LP_VP_WEIGHT;
  score += aiLp * p.LP_DIRECT;

  for (const [key, piece] of Object.entries(state.boardState)) {
    const [x, y] = key.split(',').map(Number);
    const ring = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
    const tv   = p.RING_BONUS[ring] * (p.TREE_VALUE[piece.type] || 0);
    score += piece.owner === aiPlayer ? tv : -tv * p.OPP_BOARD_FACTOR;
  }

  for (let offset = 1; offset <= 5; offset++) {
    const w = p.LP_FUTURE_WEIGHTS[offset];
    const shad = computeEvalShadows(state.boardState, (sunPos + offset) % 6);
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
    const bonus = ring === 0 ? p.AREA_CENTER_BONUS : p.AREA_RING1_BONUS;
    if (aiR && !oppR) score += bonus;
    else if (!aiR && oppR) score -= bonus * p.AREA_OPP_FACTOR;
  }

  const STAGES = ['seed', 'tree-small', 'tree-medium', 'tree-large'];
  const inAvail = new Set(Object.values(state.available[aiPlayer] || {}).map(q => q.type));
  const inInv   = new Set(Object.values(state.inventories[aiPlayer] || {}).map(q => q.type));
  for (const stage of STAGES) {
    if (inAvail.has(stage)) score += 1.25; else if (inInv.has(stage)) score += 0.50;
  }

  for (const [, piece] of Object.entries(state.boardState)) {
    if (piece.owner === aiPlayer && piece.type === 'tree-large') {
      if (aiLp >= 4) score += 6;
      break;
    }
  }
  return score;
}

// ─── Minimax search ───────────────────────────────────────────────────────────

const EXPERT_MAX_CANDIDATES = 15;

function bestMoveAtDepth(state, player, depth, aiPlayer, sunPos, evalFn) {
  let moves = getValidMoves(state, player);
  if (!moves.length) return null;
  if (moves.length > EXPERT_MAX_CANDIDATES && depth > 1) {
    const scored = moves.map(m => ({ m, sc: evalFn(applyMove(state, m, player), aiPlayer, sunPos) }));
    scored.sort((a, b) => b.sc - a.sc);
    moves = scored.slice(0, EXPERT_MAX_CANDIDATES).map(x => x.m);
  }
  let best = null, bestScore = -Infinity;
  for (const move of moves) {
    const next = applyMove(state, move, player);
    let sc;
    if (depth <= 1) sc = evalFn(next, aiPlayer, sunPos);
    else {
      const fu = bestMoveAtDepth(next, player, depth - 1, aiPlayer, sunPos, evalFn);
      sc = fu ? evalFn(applyMove(next, fu, player), aiPlayer, sunPos) : evalFn(next, aiPlayer, sunPos);
    }
    if (sc > bestScore) { bestScore = sc; best = move; }
  }
  return best;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a complete minimax AI turn and apply moves to Game.js.
 */
export function executeMinimaxTurn(lpState, scoreState, difficulty, aiPlayer = 'p2', sunPos = 0) {
  const isExpert = difficulty === 'expert';
  const depth    = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 4;

  const live = getBoardState();
  let state = {
    boardState:  live.boardState,
    inventories: live.inventories,
    available:   live.available,
    lp:          { ...lpState },
    scores:      { ...scoreState },
    scorePiles:  live.scorePiles,
    activated:   new Set(),
    setupDone:   Object.values(live.setupPlaced).every(v => v >= 2),
  };

  const evalFn = isExpert
    ? evaluateExpert
    : evaluate;

  setCurrentPlayer(aiPlayer);
  clearTurnActions();

  const maxMoves = (difficulty === 'hard' || isExpert) ? 12 : 8;
  let movesLeft  = maxMoves;
  while (movesLeft-- > 0) {
    let move;
    if (difficulty === 'easy') {
      const moves = getValidMoves(state, aiPlayer);
      if (!moves.length) break;
      const candidates = moves.slice(0, Math.min(3, moves.length));
      move = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      move = bestMoveAtDepth(state, aiPlayer, depth, aiPlayer, sunPos, evalFn);
    }
    if (!move) break;

    const cur = evalFn(state, aiPlayer, sunPos);
    const nxt = evalFn(applyMove(state, move, aiPlayer), aiPlayer, sunPos);
    if (difficulty !== 'easy' && nxt < cur) break;

    if (move.action === 'harvest')   movePiece(move.pieceId, 0, 0, 'inventory');
    else if (move.action === 'buy')  movePiece(move.pieceId, move.toPosition, 0, 'available');
    else                              movePiece(move.pieceId, move.toX, move.toY, 'board');

    state = applyMove(state, move, aiPlayer);
  }
}

/**
 * Execute a turn using a custom evaluation function and depth.
 * Used by ai_nn.js to plug in the neural-network evaluator.
 */
export function executeWithEval(lpState, scoreState, depth, customEvalFn, aiPlayer = 'p2', sunPos = 0) {
  const live = getBoardState();
  let state = {
    boardState:  live.boardState,
    inventories: live.inventories,
    available:   live.available,
    lp:          { ...lpState },
    scores:      { ...scoreState },
    scorePiles:  live.scorePiles,
    activated:   new Set(),
    setupDone:   Object.values(live.setupPlaced).every(v => v >= 2),
  };

  setCurrentPlayer(aiPlayer);
  clearTurnActions();

  let movesLeft = 12;
  while (movesLeft-- > 0) {
    const move = bestMoveAtDepth(state, aiPlayer, depth, aiPlayer, sunPos, customEvalFn);
    if (!move) break;
    const cur = customEvalFn(state, aiPlayer, sunPos);
    const nxt = customEvalFn(applyMove(state, move, aiPlayer), aiPlayer, sunPos);
    if (nxt < cur) break;
    if (move.action === 'harvest')  movePiece(move.pieceId, 0, 0, 'inventory');
    else if (move.action === 'buy') movePiece(move.pieceId, move.toPosition, 0, 'available');
    else                            movePiece(move.pieceId, move.toX, move.toY, 'board');
    state = applyMove(state, move, aiPlayer);
  }
}

/**
 * Choose 2 outer-ring positions for AI setup placement.
 */
export function getAISetupPositions(boardState) {
  const outerRing = ALL_COORDS.filter(([x, y]) => hexDist(x, y, 0, 0) === 3);
  const free = outerRing.filter(([x, y]) => !boardState[`${x},${y}`]);
  if (free.length < 2) return free.slice(0, 2);
  const withAngle = free.map(([x, y]) => ({ x, y, angle: Math.atan2(y, x) }));
  withAngle.sort((a, b) => a.angle - b.angle);
  const first = withAngle[Math.floor(withAngle.length * 0.1)];
  const targetAngle = first.angle + Math.PI;
  const second = withAngle.reduce((best, c) => {
    const d  = Math.abs(((c.angle - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const bd = Math.abs(((best.angle - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    return d < bd ? c : best;
  });
  return [[first.x, first.y], [second.x, second.y]];
}
