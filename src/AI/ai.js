/**
 * AI for Photosynthesis (player 2).
 *
 * Difficulty levels control search depth:
 *   easy   (1) – picks from the top-3 moves at random (explorative, makes mistakes)
 *   medium (2) – greedy: always picks the best immediate move
 *   hard   (3) – 2-step lookahead: evaluates the best follow-up move after each candidate
 *
 * The evaluation function scores board positions for the AI (p2) relative to the human (p1).
 */

import { getBoardState, setCurrentPlayer, clearTurnActions, movePiece } from '../view/board/Game';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexDist(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return Math.max(dy, (dx + dy) / 2);
}

// All 37 valid board coordinates for a Photosynthesis hex board
const ALL_COORDS = [];
for (let y = -3; y <= 3; y++) {
  const maxX = 6 - Math.abs(y);
  for (let x = -maxX; x <= maxX; x += 2) {
    ALL_COORDS.push([x, y]);
  }
}

const GROWTH_CHAIN = { seed: 'tree-small', 'tree-small': 'tree-medium', 'tree-medium': 'tree-large' };
const MOVEMENT_COSTS = { seed: 1, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SLOT_COSTS = [1, 1, 1, 1,  2, 2, 3, 3,  3, 3, 4,  4, 5];
const SLOT_RANGES = {
  seed:        { start: 0, end: 3  },
  'tree-small':  { start: 4, end: 7  },
  'tree-medium': { start: 8, end: 10 },
  'tree-large':  { start: 11, end: 12 },
};
const TREE_RANGES = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

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

// ─── state snapshot (for lookahead without mutating module state) ─────────────

function snapshot(state) {
  return {
    boardState: { ...state.boardState },
    inventories: Object.fromEntries(Object.entries(state.inventories).map(([p, inv]) => [p, { ...inv }])),
    available: Object.fromEntries(Object.entries(state.available).map(([p, av]) => [p, { ...av }])),
    lp: { ...state.lp },
    scores: { ...state.scores },
    scorePiles: state.scorePiles.map(p => [...p]),
    activated: new Set(state.activated),
  };
}

function applyMove(state, move, player) {
  const s = snapshot(state);
  const inv = s.inventories[player];
  const avail = s.available[player];

  if (move.action === 'place' || move.action === 'grow') {
    const { pieceId, toX, toY, from } = move;
    const key = `${toX},${toY}`;
    let pieceType;

    if (from === 'inventory') {
      pieceType = inv[pieceId].type;
      const buyCost = slotCost(inv[pieceId].position);
      const moveCost = MOVEMENT_COSTS[pieceType] || 0;
      s.lp[player] = Math.max(0, s.lp[player] - buyCost - moveCost);
      delete inv[pieceId];
    } else {
      pieceType = avail[pieceId].type;
      const moveCost = MOVEMENT_COSTS[pieceType] || 0;
      s.lp[player] = Math.max(0, s.lp[player] - moveCost);
      delete avail[pieceId];
    }

    // Growing: displaced piece returns to inventory
    const existing = s.boardState[key];
    if (existing) {
      const openPos = findOpenSlot(existing.type, inv);
      if (openPos !== null) inv[existing.id] = { type: existing.type, position: openPos };
    }

    s.boardState[key] = { type: pieceType, id: pieceId, owner: player };
    s.activated.add(key);

  } else if (move.action === 'buy') {
    const { pieceId, toPosition } = move;
    const pieceType = inv[pieceId].type;
    const cost = slotCost(inv[pieceId].position);
    s.lp[player] = Math.max(0, s.lp[player] - cost);
    delete inv[pieceId];
    avail[pieceId] = { type: pieceType, position: toPosition };

  } else if (move.action === 'harvest') {
    const { pieceId } = move;
    const key = Object.keys(s.boardState).find(k => s.boardState[k].id === pieceId);
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
    if (openPos !== null) inv[pieceId] = { type: pieceType, position: openPos };
  }

  return s;
}

// ─── move generation ──────────────────────────────────────────────────────────

function getValidMoves(state, player) {
  const inv = state.inventories[player];
  const avail = state.available[player];
  const lp = state.lp[player];
  const moves = [];
  const setupDone = state.setupDone;

  if (!setupDone) return moves; // AI setup handled separately

  // Harvest large trees
  for (const [key, piece] of Object.entries(state.boardState)) {
    if (piece.owner !== player || piece.type !== 'tree-large' || state.activated.has(key)) continue;
    if (lp >= 4) moves.push({ action: 'harvest', pieceId: piece.id });
  }

  // Place/grow from available and inventory
  const sources = [
    ...Object.entries(avail).map(([id, p]) => ({ pieceId: id, type: p.type, from: 'available', cost: MOVEMENT_COSTS[p.type] || 0 })),
    ...Object.entries(inv).map(([id, p]) => ({ pieceId: id, type: p.type, from: 'inventory', cost: (MOVEMENT_COSTS[p.type] || 0) + slotCost(p.position) })),
  ];

  for (const src of sources) {
    if (src.cost > lp) continue;

    for (const [x, y] of ALL_COORDS) {
      const key = `${x},${y}`;
      if (state.activated.has(key)) continue;
      const existing = state.boardState[key];

      if (src.type === 'seed') {
        if (existing !== undefined) continue; // seeds only on empty
        const canReach = Object.entries(state.boardState).some(([k, piece]) => {
          if (piece.owner !== player || state.activated.has(k)) return false;
          const range = TREE_RANGES[piece.type];
          if (!range) return false;
          const [tx, ty] = k.split(',').map(Number);
          return hexDist(tx, ty, x, y) <= range;
        });
        if (!canReach) continue;
        moves.push({ action: 'place', pieceId: src.pieceId, toX: x, toY: y, from: src.from });
      } else {
        // Growing: must place the next size on an owned piece of prev size
        if (existing === undefined) continue;
        if (existing.owner !== player) continue;
        if (GROWTH_CHAIN[existing.type] !== src.type) continue;
        moves.push({ action: 'grow', pieceId: src.pieceId, toX: x, toY: y, from: src.from });
      }
    }
  }

  // Buy (inventory → available)
  for (const [id, piece] of Object.entries(inv)) {
    const cost = slotCost(piece.position);
    if (cost > lp) continue;
    // Find open available slot (any position 0-7 for seeds/small, simplified)
    const range = SLOT_RANGES[piece.type];
    if (!range) continue;
    const usedAvail = new Set(Object.values(avail).map(p => p.position));
    for (let pos = 0; pos <= 7; pos++) {
      if (!usedAvail.has(pos)) {
        moves.push({ action: 'buy', pieceId: id, toPosition: pos });
        break;
      }
    }
  }

  return moves;
}

// ─── evaluation ───────────────────────────────────────────────────────────────

const RING_BONUS = [4, 3, 2, 1]; // center → outer
const TREE_VALUE = { seed: 0.3, 'tree-small': 1, 'tree-medium': 2.2, 'tree-large': 4 };

function evaluate(state, aiPlayer = 'p2') {
  const aiScore = state.scores[aiPlayer] || 0;
  const aiLp = state.lp[aiPlayer] || 0;
  const opponents = Object.keys(state.scores).filter(p => p !== aiPlayer);
  const avgOppScore = opponents.length ? opponents.reduce((s, p) => s + (state.scores[p] || 0), 0) / opponents.length : 0;
  const avgOppLp = opponents.length ? opponents.reduce((s, p) => s + (state.lp[p] || 0), 0) / opponents.length : 0;
  // Score delta
  let score = (aiScore - avgOppScore) * 12;
  // LP delta (converts 3:1 at game end)
  score += (Math.floor(aiLp / 3) - Math.floor(avgOppLp / 3)) * 2;
  // Board position: weighted by ring and tree size
  for (const [key, piece] of Object.entries(state.boardState)) {
    const [x, y] = key.split(',').map(Number);
    const ring = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
    const val = RING_BONUS[ring] * (TREE_VALUE[piece.type] || 0);
    score += piece.owner === aiPlayer ? val : -val;
  }
  return score;
}

// ─── search ───────────────────────────────────────────────────────────────────

function bestMoveAtDepth(state, player, depth, aiPlayer) {
  const moves = getValidMoves(state, player);
  if (moves.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = applyMove(state, move, player);

    let score;
    if (depth <= 1) {
      score = evaluate(next, aiPlayer);
    } else {
      const followUp = bestMoveAtDepth(next, player, depth - 1, aiPlayer);
      score = followUp ? evaluate(applyMove(next, followUp, player), aiPlayer) : evaluate(next, aiPlayer);
    }

    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

// ─── outer API ────────────────────────────────────────────────────────────────

/**
 * Plan and execute an AI player's complete turn.
 *
 * @param {Object} lpState     all players' current light points { p1, p2, ... }
 * @param {Object} scoreState  all players' current scores { p1, p2, ... }
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {string} aiPlayer    which player the AI is controlling (default 'p2')
 */
export function executeAITurn(lpState, scoreState, difficulty, aiPlayer = 'p2') {
  const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;

  // Build simulation state from live Game.js state
  const live = getBoardState();
  let state = {
    boardState: live.boardState,
    inventories: live.inventories,
    available: live.available,
    lp: { ...lpState },
    scores: { ...scoreState },
    scorePiles: live.scorePiles,
    activated: new Set(),
    setupDone: Object.values(live.setupPlaced).every(v => v >= 2),
  };

  setCurrentPlayer(aiPlayer);
  clearTurnActions();

  let maxMoves = 8; // safety cap per turn
  while (maxMoves-- > 0) {
    let move;
    if (difficulty === 'easy') {
      const moves = getValidMoves(state, aiPlayer);
      if (moves.length === 0) break;
      const candidates = moves.slice(0, Math.min(3, moves.length));
      move = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      move = bestMoveAtDepth(state, aiPlayer, depth, aiPlayer);
    }

    if (!move) break;

    if (difficulty !== 'easy') {
      const currentScore = evaluate(state, aiPlayer);
      const nextState = applyMove(state, move, aiPlayer);
      if (evaluate(nextState, aiPlayer) <= currentScore) break;
    }

    // Execute in the real Game.js module
    if (move.action === 'harvest') {
      movePiece(move.pieceId, 0, 0, 'inventory');
    } else if (move.action === 'buy') {
      movePiece(move.pieceId, move.toPosition, 0, 'available');
    } else {
      movePiece(move.pieceId, move.toX, move.toY, 'board');
    }

    state = applyMove(state, move, aiPlayer);
  }
}

/**
 * Choose 2 outer-ring positions for AI setup placement.
 * Picks spots spread around the board and not already occupied.
 */
export function getAISetupPositions(boardState) {
  const outerRing = ALL_COORDS.filter(([x, y]) => hexDist(x, y, 0, 0) === 3);
  const free = outerRing.filter(([x, y]) => !boardState[`${x},${y}`]);

  // Pick two spots roughly opposite each other for good sun coverage
  if (free.length < 2) return free.slice(0, 2);

  // Sort by angular position and pick spread-out ones
  const withAngle = free.map(([x, y]) => ({ x, y, angle: Math.atan2(y, x) }));
  withAngle.sort((a, b) => a.angle - b.angle);

  const first = withAngle[Math.floor(withAngle.length * 0.1)];
  // Pick the one closest to opposite
  const targetAngle = first.angle + Math.PI;
  const second = withAngle.reduce((best, c) => {
    const d = Math.abs(((c.angle - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const bd = Math.abs(((best.angle - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    return d < bd ? c : best;
  });

  return [[first.x, first.y], [second.x, second.y]];
}
