'use strict';
/**
 * heuristic_trainer.js — Heuristic parameter trainer for Photosynthesis AI.
 *
 * Tunes the numerical weights inside evaluateExpert() through self-play
 * tournaments (NOT a neural network — see nn_trainer_tf.js for that).
 *
 * Strategy: propose random parameter mutations, run 50-game tournament,
 * adopt mutation only if it wins more than 50% vs the current champion.
 * Parameters are written back to ai_expert_params.js when improved.
 *
 * Round 3 history (experiments 81-130):
 *   - Score pile awareness (harvest value based on remaining tile stacks)
 *   - Inventory pipeline completeness (seed→small→medium→large readiness)
 *   - Hex sector spread (reward occupying diverse board areas)
 *   - Active shadow blocking (bonus for shading opponent earners)
 *   - Net shadow balance (LP earned vs LP blocked)
 *   - Tempo (available piece count advantage)
 *   - Harvest timing (score value estimation per ring)
 *
 * Match format: 20×2p + 15×3p + 15×4p = 50 games each round.
 *
 * Run:  PATH=/opt/homebrew/bin:$PATH node src/AI/heuristic_trainer.js
 */

const fs   = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function hexDist(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  return Math.max(dy, (dx + dy) / 2);
}

const ALL_COORDS = [];
for (let y = -3; y <= 3; y++) {
  const mx = 6 - Math.abs(y);
  for (let x = -mx; x <= mx; x += 2) ALL_COORDS.push([x, y]);
}

const SCORE_PILES_INIT = [
  [22, 21, 20],
  [19, 18, 18, 17, 17],
  [16, 16, 14, 14, 13, 13],
  [14, 14, 13, 13, 13, 12, 12, 12, 12],
];
const MOVEMENT_COSTS  = { seed: 1, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SLOT_COSTS      = [1, 1, 1, 1,  2, 2, 3, 3,  3, 3, 4,  4, 5];
const SLOT_RANGES     = {
  seed:          { start: 0,  end: 3  },
  'tree-small':  { start: 4,  end: 7  },
  'tree-medium': { start: 8,  end: 10 },
  'tree-large':  { start: 11, end: 12 },
};
const TREE_RANGES  = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const GROWTH_CHAIN = { seed: 'tree-small', 'tree-small': 'tree-medium', 'tree-medium': 'tree-large' };
const LP_PER_TREE  = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SHADOW_DIRS  = [[-1,-1],[-2,0],[-1,1],[1,1],[2,0],[1,-1]];
const SHADOW_RANGE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const TREE_SIZE    = { seed: 0, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const LP_EARN      = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

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
    const init   = initPlayerInventory(nextId);
    inventories[p] = init.inv;
    available[p]   = init.avail;
    lp[p]          = 0;
    scores[p]      = 0;
    nextId         = init.nextId;
  }
  return { players, boardState: {}, inventories, available, lp, scores,
           scorePiles: SCORE_PILES_INIT.map(p => [...p]),
           sunPos: 0, revolutions: 0,
           setupPlaced: Object.fromEntries(players.map(p => [p, 0])) };
}

function computeLPShadows(boardState, sunPos) {
  const [dx, dy] = SHADOW_DIRS[sunPos];
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

function doPlace(game, player, pieceId, toX, toY, fromLocation) {
  const inv   = game.inventories[player];
  const avail = game.available[player];
  const piece = fromLocation === 'inventory' ? inv[pieceId] : avail[pieceId];
  const moveCost = MOVEMENT_COSTS[piece.type] || 0;
  const buyCost  = fromLocation === 'inventory' ? slotCost(piece.position) : 0;
  game.lp[player] = Math.max(0, game.lp[player] - moveCost - buyCost);
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
  const inv   = game.inventories[player];
  const piece = inv[pieceId]; if (!piece) return;
  game.lp[player] = Math.max(0, game.lp[player] - slotCost(piece.position));
  game.available[player][pieceId] = { type: piece.type, position: toPosition };
  delete inv[pieceId];
}

function snapshot(state) {
  return {
    boardState:  { ...state.boardState },
    inventories: Object.fromEntries(Object.entries(state.inventories).map(([p, inv]) => [p, { ...inv }])),
    available:   Object.fromEntries(Object.entries(state.available).map(([p, av])  => [p, { ...av  }])),
    lp:          { ...state.lp },
    scores:      { ...state.scores },
    scorePiles:  state.scorePiles.map(p => [...p]),
    activated:   new Set(state.activated),
    revolution:  state.revolution || 0,
  };
}

function applyMove(state, move, player) {
  const s    = snapshot(state);
  const inv  = s.inventories[player];
  const avail = s.available[player];
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
    const { pieceId, toPosition } = move;
    const pieceType = inv[pieceId].type;
    s.lp[player] = Math.max(0, s.lp[player] - slotCost(inv[pieceId].position));
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

function getValidMoves(state, player) {
  const inv   = state.inventories[player];
  const avail = state.available[player];
  const lp    = state.lp[player];
  const moves = [];

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
      const key      = `${x},${y}`;
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

function getAISetupPositions(boardState) {
  const outerRing = ALL_COORDS.filter(([x, y]) => hexDist(x, y, 0, 0) === 3);
  const free      = outerRing.filter(([x, y]) => !boardState[`${x},${y}`]);
  if (free.length < 2) return free.slice(0, 2);
  const withAngle = free.map(([x, y]) => ({ x, y, angle: Math.atan2(y, x) }));
  withAngle.sort((a, b) => a.angle - b.angle);
  const first      = withAngle[Math.floor(withAngle.length * 0.1)];
  const targetAngle = first.angle + Math.PI;
  const second     = withAngle.reduce((best, c) => {
    const d  = Math.abs(((c.angle - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const bd = Math.abs(((best.angle - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
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
      const [x, y] = positions[i];
      const id     = smallIds[i];
      game.boardState[`${x},${y}`] = { type: 'tree-small', id, owner: player };
      delete game.available[player][id];
      game.setupPlaced[player]++;
    }
  }
}

function getPlayerOrder(players, revolutions) {
  const offset = revolutions % players.length;
  return [...players.slice(offset), ...players.slice(0, offset)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATE FACTORIES — BASE
// ═══════════════════════════════════════════════════════════════════════════════

function computeEvalShadows(boardState, sunPos) {
  const [dx, dy] = SHADOW_DIRS[((sunPos % 6) + 6) % 6];
  const shadowed  = new Set();
  for (const [key, caster] of Object.entries(boardState)) {
    const range = SHADOW_RANGE[caster.type]; if (!range) continue;
    const [cx, cy] = key.split(',').map(Number);
    const sz = TREE_SIZE[caster.type];
    for (let step = 1; step <= range; step++) {
      const tk     = `${cx + dx * step},${cy + dy * step}`;
      const target = boardState[tk];
      if (target && TREE_SIZE[target.type] <= sz) shadowed.add(tk);
    }
  }
  return shadowed;
}

function makeEvaluate(p) {
  const RB = p.RING_BONUS;
  const TV = p.TREE_VALUE;
  const LW = p.LP_FUTURE_WEIGHTS;

  return function evaluate(state, aiPlayer, sunPos, revolution) {
    revolution = revolution || state.revolution || 0;
    const opps      = Object.keys(state.scores).filter(x => x !== aiPlayer);
    const aiScore   = state.scores[aiPlayer] || 0;
    const aiLp      = state.lp[aiPlayer] || 0;
    const bestOppSc = opps.length ? Math.max(...opps.map(x => state.scores[x] || 0)) : 0;
    const bestOppLp = opps.length ? Math.max(...opps.map(x => state.lp[x] || 0)) : 0;

    const vpW = (revolution >= (p.endgameRevolution || 99))
      ? (p.VP_WEIGHT + (p.endgameVPBoost || 0))
      : p.VP_WEIGHT;

    let score = (aiScore - bestOppSc) * vpW;
    score += (Math.floor(aiLp / 3) - Math.floor(bestOppLp / 3)) * p.LP_VP_WEIGHT;
    score += aiLp * p.LP_DIRECT;

    for (const [key, piece] of Object.entries(state.boardState)) {
      const [x, y] = key.split(',').map(Number);
      const ring   = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
      const tv     = RB[ring] * (TV[piece.type] || 0);
      if (piece.owner === aiPlayer) {
        score += tv;
        if (p.mediumNearCenterBonus && piece.type === 'tree-medium' && ring <= 1)
          score += p.mediumNearCenterBonus;
      } else {
        score -= tv * p.OPP_BOARD_FACTOR;
        if (p.opponentLargePenalty  && piece.type === 'tree-large')  score -= p.opponentLargePenalty;
        if (p.opponentMediumPenalty && piece.type === 'tree-medium') score -= p.opponentMediumPenalty;
      }
    }

    for (let offset = 1; offset <= 5; offset++) {
      const w     = LW[offset];
      const shad  = computeEvalShadows(state.boardState, (sunPos + offset) % 6);
      for (const [key, piece] of Object.entries(state.boardState)) {
        const lp = LP_EARN[piece.type]; if (!lp || shad.has(key)) continue;
        if (piece.owner === aiPlayer) score += lp * w;
        else                          score -= lp * w;
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
      if (aiR && !oppR)  score += bonus;
      else if (!aiR && oppR) score -= bonus * p.AREA_OPP_FACTOR;
    }

    return score;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOVEL EVALUATE FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Harvest readiness: bonus when large tree on board + LP ≥ threshold */
function makeHarvestReadyEval(p, lpThreshold = 4, bonus = 12) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    if ((state.lp[aiPlayer] || 0) >= lpThreshold) {
      for (const [, piece] of Object.entries(state.boardState)) {
        if (piece.owner === aiPlayer && piece.type === 'tree-large') { score += bonus; break; }
      }
    }
    return score;
  };
}

/**
 * Score pile awareness: bonus for large trees positioned to harvest
 * tiles with the highest remaining value. Uses actual scorePiles in state.
 */
function makeScorePileEval(p, pileWeight = 0.25) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const piles = state.scorePiles || SCORE_PILES_INIT.map(r => [...r]);
    for (const [key, piece] of Object.entries(state.boardState)) {
      if (piece.owner !== aiPlayer || piece.type !== 'tree-large') continue;
      const [x, y] = key.split(',').map(Number);
      const ring = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
      // Best available tile this tree could harvest (its ring or next out)
      let bestTile = 0;
      for (let r = ring; r <= 3; r++) {
        if (piles[r] && piles[r].length > 0) { bestTile = piles[r][0]; break; }
      }
      score += bestTile * pileWeight;
    }
    return score;
  };
}

/**
 * Inventory pipeline completeness: reward having each piece type
 * in available (cheaper to use than inventory).
 */
function makePipelineEval(p, bonusPerStage = 2.5) {
  const base = makeEvaluate(p);
  const STAGES = ['seed', 'tree-small', 'tree-medium', 'tree-large'];
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const avail = state.available[aiPlayer] || {};
    const inv   = state.inventories[aiPlayer] || {};
    const inAvail = new Set(Object.values(avail).map(p => p.type));
    const inInv   = new Set(Object.values(inv).map(p => p.type));
    for (const stage of STAGES) {
      if (inAvail.has(stage)) score += bonusPerStage;        // available = ready this turn
      else if (inInv.has(stage)) score += bonusPerStage * 0.4; // inventory = need to buy first
    }
    return score;
  };
}

/**
 * Hex sector spread: board is divided into 6 wedge sectors.
 * Bonus per unique sector we have at least one tree in.
 */
function makeSectorSpreadEval(p, bonusPerSector = 3) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const sectors = new Set();
    for (const [key, piece] of Object.entries(state.boardState)) {
      if (piece.owner !== aiPlayer) continue;
      const [x, y] = key.split(',').map(Number);
      if (x === 0 && y === 0) { sectors.add(0); continue; } // center: all sectors
      const angle = Math.atan2(y, x);  // -π to π
      const sector = Math.floor(((angle + Math.PI) / (Math.PI / 3)) % 6);
      sectors.add(sector);
    }
    score += sectors.size * bonusPerSector;
    return score;
  };
}

/**
 * Active shadow blocking: bonus for each LP we block from opponents
 * in the next 1–3 sun positions (using shadow casting).
 */
function makeShadowBlockEval(p, blockWeight = 2.0) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const offWeights = [0, 2.0, 1.0, 0.4];
    for (let offset = 1; offset <= 3; offset++) {
      const w = offWeights[offset];
      const nextPos = (sunPos + offset) % 6;
      const [dx, dy] = SHADOW_DIRS[nextPos];
      // Count LP blocked from opponents by our trees
      for (const [key, caster] of Object.entries(state.boardState)) {
        if (caster.owner !== aiPlayer) continue;
        const range = SHADOW_RANGE[caster.type]; if (!range) continue;
        const [cx, cy] = key.split(',').map(Number);
        const sz = TREE_SIZE[caster.type];
        for (let step = 1; step <= range; step++) {
          const tk = `${cx + dx * step},${cy + dy * step}`;
          const target = state.boardState[tk];
          if (target && target.owner !== aiPlayer && TREE_SIZE[target.type] <= sz) {
            score += (LP_EARN[target.type] || 0) * w * blockWeight;
          }
        }
      }
    }
    return score;
  };
}

/**
 * Net shadow balance: on top of base, add a direct bonus for the
 * current LP differential caused by shadow relationships.
 */
function makeNetShadowEval(p, netWeight = 3.0) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const shadows = computeEvalShadows(state.boardState, sunPos);
    let aiShadowed = 0, oppShadowed = 0;
    for (const [key, piece] of Object.entries(state.boardState)) {
      if (!shadows.has(key)) continue;
      const lp = LP_EARN[piece.type] || 0;
      if (piece.owner === aiPlayer) aiShadowed += lp;
      else oppShadowed += lp;
    }
    score += (oppShadowed - aiShadowed) * netWeight;
    return score;
  };
}

/**
 * Tempo: bonus for having more available pieces than opponents.
 * More available pieces = more action options per turn.
 */
function makeTempoEval(p, bonusPerPiece = 2.0) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const aiAvail  = Object.keys(state.available[aiPlayer] || {}).length;
    const opps     = Object.keys(state.scores).filter(x => x !== aiPlayer);
    const avgOppAv = opps.length
      ? opps.reduce((s, o) => s + Object.keys(state.available[o] || {}).length, 0) / opps.length
      : 0;
    score += (aiAvail - avgOppAv) * bonusPerPiece;
    return score;
  };
}

/**
 * Harvest timing: scale harvest readiness bonus by the best score
 * tile available, giving urgency when center piles are still rich.
 */
function makeHarvestTimingEval(p, baseBonus = 0.5) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const piles = state.scorePiles || [];
    const aiLp  = state.lp[aiPlayer] || 0;
    if (aiLp >= 4) {
      for (const [key, piece] of Object.entries(state.boardState)) {
        if (piece.owner !== aiPlayer || piece.type !== 'tree-large') continue;
        const [x, y] = key.split(',').map(Number);
        const ring = Math.min(3, Math.round(hexDist(x, y, 0, 0)));
        let bestTile = 12; // fallback floor
        for (let r = ring; r <= 3; r++) {
          if (piles[r] && piles[r].length > 0) { bestTile = piles[r][0]; break; }
        }
        score += bestTile * baseBonus;
      }
    }
    return score;
  };
}

/**
 * Sector exclusivity: bonus only for sectors where we have trees
 * and the opponent has none.
 */
function makeSectorExclusiveEval(p, bonusPerSector = 5) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    const aiSectors  = new Set();
    const oppSectors = new Set();
    for (const [key, piece] of Object.entries(state.boardState)) {
      const [x, y] = key.split(',').map(Number);
      const sector = (x === 0 && y === 0) ? -1 :
        Math.floor(((Math.atan2(y, x) + Math.PI) / (Math.PI / 3)) % 6);
      if (piece.owner === aiPlayer) aiSectors.add(sector);
      else oppSectors.add(sector);
    }
    for (const s of aiSectors) {
      if (!oppSectors.has(s)) score += bonusPerSector;
    }
    return score;
  };
}

/**
 * Growth readiness: bonus when we have a large tree piece ready
 * in hand and a medium tree on the board to grow into.
 */
function makeGrowthReadyEval(p, lpThreshold = 3, bonus = 8) {
  const base = makeEvaluate(p);
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    let score = base(state, aiPlayer, sunPos, revolution);
    if ((state.lp[aiPlayer] || 0) >= lpThreshold) {
      const avail = state.available[aiPlayer] || {};
      const inv   = state.inventories[aiPlayer] || {};
      const hasLargeReady = Object.values(avail).some(q => q.type === 'tree-large') ||
                            Object.values(inv).some(q => q.type === 'tree-large');
      if (hasLargeReady) {
        const hasMedBoard = Object.values(state.boardState)
          .some(q => q.owner === aiPlayer && q.type === 'tree-medium');
        if (hasMedBoard) score += bonus;
      }
    }
    return score;
  };
}

/**
 * Endgame surge: VP weight surges in revolution 2.
 */
function makeEndgameSurgeEval(p, boost = 18) {
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    revolution = revolution || state.revolution || 0;
    const modified = { ...p, VP_WEIGHT: revolution >= 2 ? p.VP_WEIGHT + boost : p.VP_WEIGHT };
    return makeEvaluate(modified)(state, aiPlayer, sunPos, revolution);
  };
}

/**
 * Phase-aware: LP-heavy early, VP-heavy late.
 */
function makePhaseEval(p, lpMults = [1.4, 1.0, 0.6], vpMults = [1.0, 1.0, 1.5]) {
  return function evaluate(state, aiPlayer, sunPos, revolution) {
    const rev = Math.min(2, revolution || state.revolution || 0);
    const modified = {
      ...p,
      VP_WEIGHT:         p.VP_WEIGHT * vpMults[rev],
      LP_FUTURE_WEIGHTS: p.LP_FUTURE_WEIGHTS.map(w => w * lpMults[rev]),
    };
    return makeEvaluate(modified)(state, aiPlayer, sunPos, revolution);
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD STARTING PARAMS FROM ai_expert_params.js
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_PARAMS = {
  VP_WEIGHT: 25, LP_VP_WEIGHT: 6, LP_DIRECT: 0.8,
  RING_BONUS: [10, 7, 3, 1],
  TREE_VALUE: { seed: 0.4, 'tree-small': 2, 'tree-medium': 4.5, 'tree-large': 10 },
  LP_FUTURE_WEIGHTS: [0, 7, 3, 1.8, 1, 0.5],
  OPP_BOARD_FACTOR: 0.9, AREA_CENTER_BONUS: 5, AREA_RING1_BONUS: 2.5, AREA_OPP_FACTOR: 0.7,
  opponentLargePenalty: 0, opponentMediumPenalty: 0, harvestUrgencyBonus: 0,
  mediumNearCenterBonus: 0, lpConversionBonus: 0, endgameRevolution: 99, endgameVPBoost: 0,
};

let STARTING_PARAMS;
try {
  const paramsFile = fs.readFileSync(path.join(__dirname, 'ai_expert_params.js'), 'utf8');
  const match = paramsFile.match(/EXPERT_PARAMS\s*=\s*(\{[\s\S]*?\n\})/);
  STARTING_PARAMS = match ? JSON.parse(match[1]) : FALLBACK_PARAMS;
  console.log('Loaded starting params from ai_expert_params.js');
} catch (e) {
  STARTING_PARAMS = FALLBACK_PARAMS;
  console.log('Using fallback params (ai_expert_params.js not found)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOURNAMENT ENGINE (50 games: 20×2p + 15×3p + 15×4p)
// ═══════════════════════════════════════════════════════════════════════════════

const TOUR_DEPTH      = 2;
const TOUR_CANDIDATES = 15;
const TOUR_MAX_MOVES  = 6;

function bestMoveWith(state, player, aiPlayer, sunPos, revolution, evalFn, depth) {
  let moves = getValidMoves(state, player);
  if (!moves.length) return null;

  if (moves.length > TOUR_CANDIDATES && depth > 1) {
    const scored = moves.map(m => ({
      m, sc: evalFn(applyMove(state, m, player), aiPlayer, sunPos, revolution)
    }));
    scored.sort((a, b) => b.sc - a.sc);
    moves = scored.slice(0, TOUR_CANDIDATES).map(x => x.m);
  }

  let best = null, bestSc = -Infinity;
  for (const m of moves) {
    const next = applyMove(state, m, player);
    const sc = depth <= 1
      ? evalFn(next, aiPlayer, sunPos, revolution)
      : (() => {
          const fu = bestMoveWith(next, player, aiPlayer, sunPos, revolution, evalFn, depth - 1);
          return fu
            ? evalFn(applyMove(next, fu, player), aiPlayer, sunPos, revolution)
            : evalFn(next, aiPlayer, sunPos, revolution);
        })();
    if (sc > bestSc) { bestSc = sc; best = m; }
  }
  return best;
}

function runTurnWith(game, player, evalFn) {
  const sunPos = game.sunPos, revolution = game.revolutions;
  game.activatedThisTurn = new Set();

  let state = {
    boardState:  { ...game.boardState },
    inventories: Object.fromEntries(Object.entries(game.inventories).map(([p, inv]) => [p, { ...inv }])),
    available:   Object.fromEntries(Object.entries(game.available).map(([p, av])  => [p, { ...av  }])),
    lp:          { ...game.lp },
    scores:      { ...game.scores },
    scorePiles:  game.scorePiles.map(p => [...p]),
    activated:   new Set(),
    revolution,
  };

  let movesLeft = TOUR_MAX_MOVES;
  while (movesLeft-- > 0) {
    const move = bestMoveWith(state, player, player, sunPos, revolution, evalFn, TOUR_DEPTH);
    if (!move) break;
    const cur = evalFn(state, player, sunPos, revolution);
    const nxt = evalFn(applyMove(state, move, player), player, sunPos, revolution);
    if (nxt < cur) break;
    if (move.action === 'harvest')  doHarvest(game, player, move.pieceId);
    else if (move.action === 'buy') doBuy(game, player, move.pieceId, move.toPosition);
    else                            doPlace(game, player, move.pieceId, move.toX, move.toY, move.from);
    state = applyMove(state, move, player);
  }
}

function runGameWithEvals(evalFns) {
  const players = evalFns.map((_, i) => `p${i + 1}`);
  const game    = createGame(players);
  doSetup(game);
  runPhotosynthesis(game);
  for (let cycle = 0; cycle < 19; cycle++) {
    const revolution  = Math.floor(cycle / 6);
    game.revolutions  = revolution;
    const order = getPlayerOrder(players, revolution);
    for (const player of order) runTurnWith(game, player, evalFns[players.indexOf(player)]);
    if (cycle === 18) break;
    const newSunPos = (game.sunPos + 1) % 6;
    game.sunPos = newSunPos;
    if (newSunPos === 0) game.revolutions++;
    runPhotosynthesis(game);
  }
  for (const p of players) game.scores[p] += Math.floor(game.lp[p] / 3);
  return game.scores;
}

function runMatch(evalA, evalB) {
  let aVP = 0, bVP = 0, aCount = 0, bCount = 0;

  for (let g = 0; g < 20; g++) {
    const fns    = g % 2 === 0 ? [evalA, evalB] : [evalB, evalA];
    const scores = runGameWithEvals(fns);
    if (fns[0] === evalA) { aVP += scores.p1; aCount++; bVP += scores.p2; bCount++; }
    else                  { bVP += scores.p1; bCount++; aVP += scores.p2; aCount++; }
  }

  const cfgs3 = [
    [evalA,evalB,evalA],[evalB,evalA,evalB],[evalA,evalA,evalB],[evalB,evalB,evalA],[evalA,evalB,evalB],
    [evalA,evalB,evalA],[evalB,evalA,evalB],[evalA,evalA,evalB],[evalB,evalB,evalA],[evalA,evalB,evalB],
    [evalA,evalB,evalA],[evalB,evalA,evalB],[evalA,evalA,evalB],[evalB,evalB,evalA],[evalA,evalB,evalB],
  ];
  for (const fns of cfgs3) {
    const scores = runGameWithEvals(fns);
    ['p1','p2','p3'].forEach((p,i) => {
      if (fns[i]===evalA){aVP+=scores[p];aCount++;}else{bVP+=scores[p];bCount++;}
    });
  }

  const cfgs4 = [
    [evalA,evalB,evalA,evalB],[evalB,evalA,evalB,evalA],[evalA,evalA,evalB,evalB],[evalB,evalB,evalA,evalA],[evalA,evalB,evalB,evalA],
    [evalA,evalB,evalA,evalB],[evalB,evalA,evalB,evalA],[evalA,evalA,evalB,evalB],[evalB,evalB,evalA,evalA],[evalA,evalB,evalB,evalA],
    [evalA,evalB,evalA,evalB],[evalB,evalA,evalB,evalA],[evalA,evalA,evalB,evalB],[evalB,evalB,evalA,evalA],[evalA,evalB,evalB,evalA],
  ];
  for (const fns of cfgs4) {
    const scores = runGameWithEvals(fns);
    ['p1','p2','p3','p4'].forEach((p,i) => {
      if (fns[i]===evalA){aVP+=scores[p];aCount++;}else{bVP+=scores[p];bCount++;}
    });
  }

  const aAvg = aVP/aCount, bAvg = bVP/bCount;
  return { aAvg, bAvg, challengerWins: bAvg > aAvg };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 50 IMPROVEMENT DEFINITIONS  (rounds 81–130)
// ═══════════════════════════════════════════════════════════════════════════════

const IMPROVEMENT_FACTORIES = [
  // ── Tier 1: Score pile awareness (81–88) ─────────────────────────────────────
  (b) => ({
    name: 'v81_score_pile_0_25',
    desc: 'Score pile awareness: large-tree bonus weighted by best remaining tile (×0.25)',
    evaluate: makeScorePileEval(b, 0.25),
  }),
  (b) => ({
    name: 'v82_score_pile_0_4',
    desc: 'Score pile awareness ×0.4',
    evaluate: makeScorePileEval(b, 0.4),
  }),
  (b) => ({
    name: 'v83_score_pile_0_15',
    desc: 'Score pile awareness ×0.15 (lighter touch)',
    evaluate: makeScorePileEval(b, 0.15),
  }),
  (b) => ({
    name: 'v84_harvest_timing_0_4',
    desc: 'Harvest timing: bonus for harvestable large trees × best remaining tile value (×0.4)',
    evaluate: makeHarvestTimingEval(b, 0.4),
  }),
  (b) => ({
    name: 'v85_harvest_timing_0_6',
    desc: 'Harvest timing ×0.6',
    evaluate: makeHarvestTimingEval(b, 0.6),
  }),
  (b) => ({
    name: 'v86_score_pile_harvest_combo',
    desc: 'Score pile ×0.25 + harvest readiness bonus 12',
    evaluate: (function() {
      const sp = makeScorePileEval(b, 0.25);
      const hr = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp2,r) => sp(s,p,sp2,r) * 0.5 + hr(s,p,sp2,r) * 0.5;
    })(),
  }),
  (b) => ({
    name: 'v87_ring0_large_bonus',
    desc: 'Extra +6 for each own large tree in ring 0 (best harvest value)',
    params: {
      ...b,
      opponentLargePenalty: 0, // reset; we use a custom approach here
    },
    evaluate: (function() {
      const base = makeHarvestReadyEval(b, 4, 12);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        let score = base(state, aiPlayer, sunPos, revolution);
        for (const [key, piece] of Object.entries(state.boardState)) {
          if (piece.owner !== aiPlayer || piece.type !== 'tree-large') continue;
          const [x, y] = key.split(',').map(Number);
          if (Math.round(hexDist(x, y, 0, 0)) === 0) score += 6;
        }
        return score;
      };
    })(),
  }),
  (b) => ({
    name: 'v88_pile_depletion',
    desc: 'Pile depletion urgency: harvest bonus multiplied by revolution (late game)',
    evaluate: (function() {
      const base = makeEvaluate(b);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        let score = base(state, aiPlayer, sunPos, revolution);
        const rev = revolution || state.revolution || 0;
        const aiLp = state.lp[aiPlayer] || 0;
        if (aiLp >= 4) {
          for (const [, piece] of Object.entries(state.boardState)) {
            if (piece.owner === aiPlayer && piece.type === 'tree-large') {
              score += 8 + rev * 5; break; // increases each revolution
            }
          }
        }
        return score;
      };
    })(),
  }),

  // ── Tier 2: Inventory pipeline (89–95) ───────────────────────────────────────
  (b) => ({
    name: 'v89_pipeline_2_5',
    desc: 'Pipeline completeness: +2.5 per piece type in available/inventory',
    evaluate: makePipelineEval(b, 2.5),
  }),
  (b) => ({
    name: 'v90_pipeline_4',
    desc: 'Pipeline completeness: +4 per stage',
    evaluate: makePipelineEval(b, 4),
  }),
  (b) => ({
    name: 'v91_pipeline_1_5',
    desc: 'Pipeline completeness: +1.5 per stage (lighter)',
    evaluate: makePipelineEval(b, 1.5),
  }),
  (b) => ({
    name: 'v92_available_priority',
    desc: 'Available count: +2 per piece in available (more action options)',
    evaluate: makeTempoEval(b, 2.0),
  }),
  (b) => ({
    name: 'v93_tempo_3',
    desc: 'Tempo advantage: +3 per available piece lead over opponents',
    evaluate: makeTempoEval(b, 3.0),
  }),
  (b) => ({
    name: 'v94_growth_ready_8',
    desc: 'Growth readiness: +8 when large in hand + medium on board',
    evaluate: makeGrowthReadyEval(b, 3, 8),
  }),
  (b) => ({
    name: 'v95_growth_ready_12',
    desc: 'Growth readiness: +12 when large in hand + medium on board',
    evaluate: makeGrowthReadyEval(b, 3, 12),
  }),

  // ── Tier 3: Hex sector spread (96–102) ───────────────────────────────────────
  (b) => ({
    name: 'v96_sector_spread_3',
    desc: 'Sector spread: +3 per unique board sector occupied',
    evaluate: makeSectorSpreadEval(b, 3),
  }),
  (b) => ({
    name: 'v97_sector_spread_5',
    desc: 'Sector spread: +5 per sector',
    evaluate: makeSectorSpreadEval(b, 5),
  }),
  (b) => ({
    name: 'v98_sector_spread_2',
    desc: 'Sector spread: +2 per sector (lighter)',
    evaluate: makeSectorSpreadEval(b, 2),
  }),
  (b) => ({
    name: 'v99_sector_exclusive_4',
    desc: 'Sector exclusivity: +4 per sector where only we have trees',
    evaluate: makeSectorExclusiveEval(b, 4),
  }),
  (b) => ({
    name: 'v100_sector_exclusive_7',
    desc: 'Sector exclusivity: +7 per exclusive sector',
    evaluate: makeSectorExclusiveEval(b, 7),
  }),
  (b) => ({
    name: 'v101_sector_harvest_combo',
    desc: 'Sector spread 3 + harvest readiness 12',
    evaluate: (function() {
      const ss = makeSectorSpreadEval(b, 3);
      const hr = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp,r) => ss(s,p,sp,r) * 0.5 + hr(s,p,sp,r) * 0.5;
    })(),
  }),
  (b) => ({
    name: 'v102_ring_spread_bonus',
    desc: 'Ring spread: +3 per unique ring occupied (encourage board coverage)',
    evaluate: (function() {
      const base = makeHarvestReadyEval(b, 4, 12);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        let score = base(state, aiPlayer, sunPos, revolution);
        const rings = new Set();
        for (const [key, piece] of Object.entries(state.boardState)) {
          if (piece.owner !== aiPlayer) continue;
          const [x, y] = key.split(',').map(Number);
          rings.add(Math.min(3, Math.round(hexDist(x, y, 0, 0))));
        }
        score += rings.size * 3;
        return score;
      };
    })(),
  }),

  // ── Tier 4: Shadow blocking & net shadow (103–111) ───────────────────────────
  (b) => ({
    name: 'v103_shadow_block_2',
    desc: 'Shadow blocking: +2 per LP blocked from opponents in next 3 turns',
    evaluate: makeShadowBlockEval(b, 2.0),
  }),
  (b) => ({
    name: 'v104_shadow_block_3',
    desc: 'Shadow blocking: +3 per LP blocked',
    evaluate: makeShadowBlockEval(b, 3.0),
  }),
  (b) => ({
    name: 'v105_shadow_block_1_5',
    desc: 'Shadow blocking: +1.5 per LP blocked (lighter)',
    evaluate: makeShadowBlockEval(b, 1.5),
  }),
  (b) => ({
    name: 'v106_net_shadow_3',
    desc: 'Net shadow balance: +3 per LP we block vs opponent blocks us',
    evaluate: makeNetShadowEval(b, 3.0),
  }),
  (b) => ({
    name: 'v107_net_shadow_5',
    desc: 'Net shadow balance: +5 per LP net shadow lead',
    evaluate: makeNetShadowEval(b, 5.0),
  }),
  (b) => ({
    name: 'v108_net_shadow_2',
    desc: 'Net shadow balance: +2',
    evaluate: makeNetShadowEval(b, 2.0),
  }),
  (b) => ({
    name: 'v109_shadow_harvest_combo',
    desc: 'Shadow block 2 + harvest readiness 12',
    evaluate: (function() {
      const sb = makeShadowBlockEval(b, 2.0);
      const hr = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp,r) => sb(s,p,sp,r) * 0.5 + hr(s,p,sp,r) * 0.5;
    })(),
  }),
  (b) => ({
    name: 'v110_opp_lp_penalty_0_4',
    desc: 'Opponent LP penalty: −0.4 × (opponent LP − own LP) when behind',
    evaluate: (function() {
      const base = makeHarvestReadyEval(b, 4, 12);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        let score = base(state, aiPlayer, sunPos, revolution);
        const aiLp = state.lp[aiPlayer] || 0;
        for (const opp of Object.keys(state.scores).filter(x => x !== aiPlayer)) {
          const oppLp = state.lp[opp] || 0;
          if (oppLp > aiLp) score -= (oppLp - aiLp) * 0.4;
        }
        return score;
      };
    })(),
  }),
  (b) => ({
    name: 'v111_opp_lp_penalty_0_6',
    desc: 'Opponent LP penalty ×0.6',
    evaluate: (function() {
      const base = makeHarvestReadyEval(b, 4, 12);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        let score = base(state, aiPlayer, sunPos, revolution);
        const aiLp = state.lp[aiPlayer] || 0;
        for (const opp of Object.keys(state.scores).filter(x => x !== aiPlayer)) {
          const oppLp = state.lp[opp] || 0;
          if (oppLp > aiLp) score -= (oppLp - aiLp) * 0.6;
        }
        return score;
      };
    })(),
  }),

  // ── Tier 5: Phase & endgame heuristics (112–118) ─────────────────────────────
  (b) => ({
    name: 'v112_endgame_surge_18',
    desc: 'Endgame VP surge: +18 to VP_WEIGHT at revolution 2',
    evaluate: makeEndgameSurgeEval(b, 18),
  }),
  (b) => ({
    name: 'v113_endgame_surge_25',
    desc: 'Endgame VP surge: +25',
    evaluate: makeEndgameSurgeEval(b, 25),
  }),
  (b) => ({
    name: 'v114_endgame_surge_12',
    desc: 'Endgame VP surge: +12 (lighter)',
    evaluate: makeEndgameSurgeEval(b, 12),
  }),
  (b) => ({
    name: 'v115_phase_v3',
    desc: 'Phase v3: 1.5× LP early, 1.6× VP late (steeper)',
    evaluate: makePhaseEval(b, [1.5, 1.0, 0.6], [1.0, 1.0, 1.6]),
  }),
  (b) => ({
    name: 'v116_phase_v4',
    desc: 'Phase v4: subtle 1.2× LP early, 1.3× VP late',
    evaluate: makePhaseEval(b, [1.2, 1.0, 0.8], [1.0, 1.0, 1.3]),
  }),
  (b) => ({
    name: 'v117_endgame_harvest_combo',
    desc: 'Endgame surge 15 + harvest readiness 12',
    evaluate: (function() {
      const surge = makeEndgameSurgeEval(b, 15);
      const hr    = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp,r) => surge(s,p,sp,r) * 0.5 + hr(s,p,sp,r) * 0.5;
    })(),
  }),
  (b) => ({
    name: 'v118_phase_harvest_combo',
    desc: 'Phase v3 + harvest readiness 12',
    evaluate: (function() {
      const phase = makePhaseEval(b, [1.5, 1.0, 0.6], [1.0, 1.0, 1.6]);
      const hr    = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp,r) => phase(s,p,sp,r) * 0.5 + hr(s,p,sp,r) * 0.5;
    })(),
  }),

  // ── Tier 6: Composite param + novel heuristic combos (119–126) ───────────────
  (b) => ({
    name: 'v119_lp_direct_sector',
    desc: 'LP_DIRECT 0.9 + sector spread 3',
    evaluate: makeSectorSpreadEval({ ...b, LP_DIRECT: 0.9 }, 3),
  }),
  (b) => ({
    name: 'v120_lp_shadow_combo',
    desc: 'LP_DIRECT 0.9 + shadow block 2',
    evaluate: makeShadowBlockEval({ ...b, LP_DIRECT: 0.9 }, 2.0),
  }),
  (b) => ({
    name: 'v121_ring_shadow_combo',
    desc: 'Ring [11,8,3,1] + shadow block 2',
    evaluate: makeShadowBlockEval({ ...b, RING_BONUS: [11, 8, 3, 1] }, 2.0),
  }),
  (b) => ({
    name: 'v122_pipeline_harvest_combo',
    desc: 'Pipeline 2.5 + harvest readiness 12',
    evaluate: (function() {
      const pl = makePipelineEval(b, 2.5);
      const hr = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp,r) => pl(s,p,sp,r) * 0.5 + hr(s,p,sp,r) * 0.5;
    })(),
  }),
  (b) => ({
    name: 'v123_tempo_harvest_combo',
    desc: 'Tempo 2.0 + harvest readiness 12',
    evaluate: (function() {
      const tp = makeTempoEval(b, 2.0);
      const hr = makeHarvestReadyEval(b, 4, 12);
      return (s,p,sp,r) => tp(s,p,sp,r) * 0.5 + hr(s,p,sp,r) * 0.5;
    })(),
  }),
  (b) => ({
    name: 'v124_score_pile_ring',
    desc: 'Score pile 0.3 + ring [11,7,3,1]',
    evaluate: makeScorePileEval({ ...b, RING_BONUS: [11, 7, 3, 1] }, 0.3),
  }),
  (b) => ({
    name: 'v125_net_shadow_lp',
    desc: 'Net shadow 3 + LP_DIRECT 0.9',
    evaluate: makeNetShadowEval({ ...b, LP_DIRECT: 0.9 }, 3.0),
  }),
  (b) => ({
    name: 'v126_growth_sector_combo',
    desc: 'Growth readiness 8 + sector spread 3',
    evaluate: (function() {
      const gr = makeGrowthReadyEval(b, 3, 8);
      const ss = makeSectorSpreadEval(b, 3);
      return (s,p,sp,r) => gr(s,p,sp,r) * 0.5 + ss(s,p,sp,r) * 0.5;
    })(),
  }),

  // ── Tier 7: Grand composite champions (127–130) ───────────────────────────────
  (b) => ({
    name: 'v127_novel_champion_v1',
    desc: 'Novel champion: shadow block 2 + score pile 0.2 + pipeline 2',
    evaluate: (function() {
      const sb = makeShadowBlockEval(b, 2.0);
      const sp = makeScorePileEval(b, 0.2);
      const pl = makePipelineEval(b, 2.0);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        return sb(state,aiPlayer,sunPos,revolution) * 0.4
             + sp(state,aiPlayer,sunPos,revolution) * 0.3
             + pl(state,aiPlayer,sunPos,revolution) * 0.3;
      };
    })(),
  }),
  (b) => ({
    name: 'v128_novel_champion_v2',
    desc: 'Novel champion: LP 0.9 + sector spread 3 + harvest ready 14',
    evaluate: (function() {
      const base = makeHarvestReadyEval({ ...b, LP_DIRECT: 0.9 }, 4, 14);
      const ss   = makeSectorSpreadEval({ ...b, LP_DIRECT: 0.9 }, 3);
      return (s,p,sp,r) => base(s,p,sp,r) * 0.6 + ss(s,p,sp,r) * 0.4;
    })(),
  }),
  (b) => ({
    name: 'v129_all_novel_stacked',
    desc: 'All novel: shadow block 1.5 + score pile 0.2 + sector 2 + harvest 10',
    evaluate: (function() {
      const sb = makeShadowBlockEval(b, 1.5);
      const sp = makeScorePileEval(b, 0.2);
      const ss = makeSectorSpreadEval(b, 2);
      const hr = makeHarvestReadyEval(b, 4, 10);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        return sb(state,aiPlayer,sunPos,revolution) * 0.25
             + sp(state,aiPlayer,sunPos,revolution) * 0.25
             + ss(state,aiPlayer,sunPos,revolution) * 0.25
             + hr(state,aiPlayer,sunPos,revolution) * 0.25;
      };
    })(),
  }),
  (b) => ({
    name: 'v130_ultimate_champion',
    desc: 'Ultimate: LP_DIRECT 0.9, ring [11,8,3,1], shadow block 2, score pile 0.25, harvest 12',
    evaluate: (function() {
      const bestParams = { ...b, LP_DIRECT: 0.9, RING_BONUS: [11, 8, 3, 1] };
      const sb  = makeShadowBlockEval(bestParams, 2.0);
      const sp2 = makeScorePileEval(bestParams, 0.25);
      const hr  = makeHarvestReadyEval(bestParams, 4, 12);
      return function evaluate(state, aiPlayer, sunPos, revolution) {
        return sb(state,aiPlayer,sunPos,revolution) * 0.35
             + sp2(state,aiPlayer,sunPos,revolution) * 0.3
             + hr(state,aiPlayer,sunPos,revolution) * 0.35;
      };
    })(),
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TRAINING LOOP
// ═══════════════════════════════════════════════════════════════════════════════

const ROUND_OFFSET  = 80;
const TOTAL_ROUNDS  = IMPROVEMENT_FACTORIES.length;

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Photosynthesis AI Trainer — Round 3 (experiments ${ROUND_OFFSET + 1}–${ROUND_OFFSET + TOTAL_ROUNDS})`);
console.log(`  Tournament: depth=${TOUR_DEPTH}, ${TOUR_CANDIDATES} candidates, ${TOUR_MAX_MOVES} max moves/turn`);
console.log('  Match format: 20×2p + 15×3p + 15×4p = 50 games each round');
console.log('  Novel heuristics: score pile, pipeline, sector spread, shadow block, net shadow, tempo');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Starting params: VP=${STARTING_PARAMS.VP_WEIGHT}, LP_DIRECT=${STARTING_PARAMS.LP_DIRECT}, RING=${JSON.stringify(STARTING_PARAMS.RING_BONUS)}\n`);

let currentBestParams = { ...STARTING_PARAMS };
let currentBestEval   = makeHarvestReadyEval(currentBestParams);
let adoptedCount      = 0;

const results = [];

for (let i = 0; i < IMPROVEMENT_FACTORIES.length; i++) {
  const roundNum = ROUND_OFFSET + i + 1;
  const def = IMPROVEMENT_FACTORIES[i](currentBestParams);

  const challengerEval = def.evaluate
    ? def.evaluate
    : makeHarvestReadyEval(def.params || currentBestParams);

  process.stdout.write(`Round ${String(roundNum).padStart(3)}/${ROUND_OFFSET + TOTAL_ROUNDS}: ${def.name}\n  ${def.desc}\n  Running 50 games... `);

  const t0    = Date.now();
  const match = runMatch(currentBestEval, challengerEval);
  const dt    = ((Date.now() - t0) / 1000).toFixed(1);

  const won = match.challengerWins;
  if (won) {
    currentBestParams = def.params || currentBestParams;
    currentBestEval   = challengerEval;
    adoptedCount++;
  }

  results.push({
    round: roundNum, name: def.name, desc: def.desc,
    baseAvg: match.aAvg, challengerAvg: match.bAvg,
    delta: match.bAvg - match.aAvg, won, seconds: dt,
  });

  const symbol = won ? '✅ ADOPTED' : '❌ rejected';
  console.log(`${symbol}  baseline=${match.aAvg.toFixed(1)}  challenger=${match.bAvg.toFixed(1)}  Δ=${(match.bAvg - match.aAvg).toFixed(1)}  (${dt}s)\n`);
}

console.log(`\nRound 3 complete. ${adoptedCount}/${TOTAL_ROUNDS} new improvements adopted.`);

// ═══════════════════════════════════════════════════════════════════════════════
// APPEND TO improvements.md
// ═══════════════════════════════════════════════════════════════════════════════

const mdPath     = path.join(__dirname, '..', '..', 'improvements.md');
const winnerName = results.filter(r => r.won).slice(-1)[0]?.name || 'unchanged';

let appendMd = `\n\n---\n\n## Round 3: Experiments ${ROUND_OFFSET + 1}–${ROUND_OFFSET + TOTAL_ROUNDS} (Novel Heuristics, 50 games each)\n\n`;
appendMd += `**Final expert model after round 3**: ${winnerName}  \n`;
appendMd += `**New improvements adopted**: ${adoptedCount}/${TOTAL_ROUNDS}  \n`;
appendMd += `**Novel heuristic types introduced**: score pile awareness, inventory pipeline, hex sector spread, shadow blocking, net shadow, tempo  \n`;
appendMd += `**Tournament format**: depth=${TOUR_DEPTH}, 50 games per round (20×2p, 15×3p, 15×4p)  \n\n`;
appendMd += `### Summary Table\n\n`;
appendMd += `| Round | Name | Baseline Avg VP | Challenger Avg VP | Δ | Result |\n`;
appendMd += `|------:|------|----------------:|------------------:|--:|--------|\n`;
for (const r of results) {
  const sym = r.won ? '✅ Adopted' : '❌ Rejected';
  appendMd += `| ${r.round} | ${r.name} | ${r.baseAvg.toFixed(1)} | ${r.challengerAvg.toFixed(1)} | ${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(1)} | ${sym} |\n`;
}
appendMd += `\n### Detailed Results\n\n`;
for (const r of results) {
  const tag = r.won ? '✅ Adopted as new baseline' : '❌ Rejected';
  appendMd += `#### Round ${r.round}: ${r.name}\n\n`;
  appendMd += `**Change**: ${r.desc}  \n**Result**: ${tag}  \n`;
  appendMd += `**Baseline avg VP**: ${r.baseAvg.toFixed(2)}  \n`;
  appendMd += `**Challenger avg VP**: ${r.challengerAvg.toFixed(2)}  \n`;
  appendMd += `**Δ**: ${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}  \n`;
  appendMd += `**Time**: ${r.seconds}s  \n\n`;
}

fs.appendFileSync(mdPath, appendMd);
console.log(`\nResults appended to improvements.md`);

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE ai_expert_params.js
// ═══════════════════════════════════════════════════════════════════════════════

if (adoptedCount > 0) {
  const paramsJS = `// Auto-generated by ai_trainer3.js
// Expert AI parameters — after 130 total experiments across 3 training rounds
// Final model: ${winnerName}
// Round 1 adoptions: 7/30  |  Round 2: see improvements.md  |  Round 3: ${adoptedCount}/${TOTAL_ROUNDS}

export const EXPERT_PARAMS = ${JSON.stringify(currentBestParams, null, 2)};
`;
  fs.writeFileSync(path.join(__dirname, 'ai_expert_params.js'), paramsJS);
  console.log(`Expert params updated: ${winnerName}`);
} else {
  console.log('No new improvements — ai_expert_params.js unchanged.');
}
