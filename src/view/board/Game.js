let boardState = {};
let piecesInInventory = {};
let piecesAvailable = {};
let setupTreesPlaced = 0;
const SETUP_TREES_NEEDED = 2;

// Tracks every board square acted upon this turn (planting, growing, or harvesting).
// No space can be acted upon twice in one turn.
let activatedSquaresThisTurn = new Set();

// Scoring token piles indexed by ring (0=center 4-leaf, 3=outer 1-leaf).
// Fallback: if the ring's pile is empty, take from the next pile (ring+1, less valuable).
const SCORE_PILES_INIT = [
  [22, 21, 20],                            // ring 0 (center): 4-leaf tokens
  [19, 18, 18, 17, 17],                    // ring 1: 3-leaf tokens
  [16, 16, 14, 14, 13, 13],               // ring 2: 2-leaf tokens
  [14, 14, 13, 13, 13, 12, 12, 12, 12],   // ring 3 (outer): 1-leaf tokens
];
let scorePiles = SCORE_PILES_INIT.map(p => [...p]);

let observers = [];

function emitChange(options = {}) {
  const fullOptions = {
    ...options,
    setupTreesPlaced,
    scorePiles: scorePiles.map(p => [...p]),
  };
  observers.forEach((o) => o && o(
    { ...boardState },
    { ...piecesInInventory },
    { ...piecesAvailable },
    fullOptions
  ));
}

export function observe(o) {
  observers.push(o);
  o({ ...boardState }, { ...piecesInInventory }, { ...piecesAvailable }, {
    setupTreesPlaced,
    scorePiles: scorePiles.map(p => [...p]),
  });
  return () => {
    observers = observers.filter((t) => t !== o);
  };
}

// Call this when the sun advances to a new turn.
export function clearTurnActions() {
  activatedSquaresThisTurn = new Set();
}

// Hex distance in doubled coordinate system
function hexDistance(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return Math.max(dy, (dx + dy) / 2);
}

// Growing: maps current board piece type → the type that can grow on top of it
const growthChain = {
  'seed': 'tree-small',
  'tree-small': 'tree-medium',
  'tree-medium': 'tree-large',
};

// Tree range for seed placement validation
const treeRanges = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

// Movement costs (LP to place from available → board)
const movementCosts = {
  'seed': 1,
  'tree-small': 1,
  'tree-medium': 2,
  'tree-large': 3,
};

// Inventory slot layout.
// Positions 0-3: seeds, 4-7: small trees, 8-10: medium trees, 11-12: large trees.
// Within each row, rightmost slot (highest position) = most expensive (topmost available space).
const INVENTORY_SLOT_COSTS = [1, 1, 1, 1,  2, 2, 3, 3,  3, 3, 4,  4, 5];

const INVENTORY_SLOT_RANGES = {
  'seed':        { start: 0,  end: 3  },
  'tree-small':  { start: 4,  end: 7  },
  'tree-medium': { start: 8,  end: 10 },
  'tree-large':  { start: 11, end: 12 },
};

function getSlotCost(position) {
  return INVENTORY_SLOT_COSTS[position] || 0;
}

// Returns the rightmost (highest-cost) empty slot for the given piece type.
function findOpenSlotForType(type) {
  const range = INVENTORY_SLOT_RANGES[type];
  if (!range) return null;
  const usedPositions = new Set(Object.values(piecesInInventory).map(p => p.position));
  for (let pos = range.end; pos >= range.start; pos--) {
    if (!usedPositions.has(pos)) return pos;
  }
  return null;
}

export function canMovePiece(pieceId, toX, toY, targetLocation, lp) {
  if (targetLocation === 'board') {
    const isFromInventory = pieceId in piecesInInventory;
    const isFromAvailable = pieceId in piecesAvailable;
    if (!isFromInventory && !isFromAvailable) return false;

    let pieceType;
    if (isFromInventory) pieceType = piecesInInventory[pieceId].type;
    else pieceType = piecesAvailable[pieceId].type;

    const movementCost = movementCosts[pieceType] || 0;
    const buyCost = isFromInventory ? getSlotCost(piecesInInventory[pieceId].position) : 0;
    const totalCost = movementCost + buyCost;
    if (totalCost > lp) return false;

    // Setup phase: only available pieces, only small trees, only outer ring
    if (setupTreesPlaced < SETUP_TREES_NEEDED) {
      if (!isFromAvailable) return false;
      if (pieceType !== 'tree-small') return false;
      if (hexDistance(toX, toY, 0, 0) !== 3) return false;
      return boardState[`${toX},${toY}`] === undefined;
    }

    const boardKey = `${toX},${toY}`;

    // Can't act on a space already activated this turn (planted, grown, or harvested)
    if (activatedSquaresThisTurn.has(boardKey)) return false;

    // Seed placement: must be within range of at least one tree that was not placed this turn
    if (pieceType === 'seed') {
      const canReach = Object.entries(boardState).some(([key, piece]) => {
        if (activatedSquaresThisTurn.has(key)) return false; // just placed, can't spread yet
        const range = treeRanges[piece.type];
        if (!range) return false;
        const [tx, ty] = key.split(',').map(Number);
        return hexDistance(tx, ty, toX, toY) <= range;
      });
      if (!canReach) return false;
    }

    if (boardState[boardKey] === undefined) {
      // After setup: only seeds on empty squares (small trees must grow from seeds)
      return pieceType === 'seed';
    }

    // Occupied square: only valid if growing (placing the next size up)
    return growthChain[boardState[boardKey].type] === pieceType;
  }

  if (targetLocation === 'available') {
    // Buying from store is not allowed during setup
    if (setupTreesPlaced < SETUP_TREES_NEEDED) return false;

    const isFromInventory = pieceId in piecesInInventory;
    const isFromBoard = Object.values(boardState).some(piece => piece.id === pieceId);
    if (!isFromInventory || isFromBoard) return false;

    const cost = getSlotCost(piecesInInventory[pieceId].position);
    if (cost > lp) return false;

    return true;
  }

  if (targetLocation === 'inventory') {
    // Allow harvesting large trees from the board (costs 4 LP)
    const boardEntry = Object.entries(boardState).find(([, piece]) => piece.id === pieceId);
    if (!boardEntry) return false;
    const piece = boardEntry[1];
    if (piece.type !== 'tree-large') return false;

    const boardKey = boardEntry[0];
    if (activatedSquaresThisTurn.has(boardKey)) return false;

    return 4 <= lp;
  }

  return true;
}

export function movePiece(pieceId, toX, toY, targetLocation = 'board') {
  if (targetLocation === 'board') {
    let pieceType;
    let fromLocation;

    if (piecesInInventory[pieceId]) {
      pieceType = piecesInInventory[pieceId].type;
      fromLocation = 'inventory';
    } else if (piecesAvailable[pieceId]) {
      pieceType = piecesAvailable[pieceId].type;
      fromLocation = 'available';
    }

    if (pieceType) {
      const boardKey = `${toX},${toY}`;
      const movementCost = movementCosts[pieceType] || 0;
      const buyCost = fromLocation === 'inventory' ? getSlotCost(piecesInInventory[pieceId].position) : 0;
      const totalCost = movementCost + buyCost;

      // Growing: return displaced piece to rightmost open slot for its type
      const existingPiece = boardState[boardKey];
      if (existingPiece) {
        const openPos = findOpenSlotForType(existingPiece.type);
        if (openPos !== null) {
          piecesInInventory = {
            ...piecesInInventory,
            [existingPiece.id]: { type: existingPiece.type, position: openPos },
          };
        }
      }

      // Activate this square — no further actions on it this turn
      activatedSquaresThisTurn = new Set([...activatedSquaresThisTurn, boardKey]);

      boardState = {
        ...boardState,
        [boardKey]: { type: pieceType, id: pieceId },
      };

      if (fromLocation === 'inventory') {
        const newInventory = { ...piecesInInventory };
        delete newInventory[pieceId];
        piecesInInventory = newInventory;
      } else {
        const newAvailable = { ...piecesAvailable };
        delete newAvailable[pieceId];
        piecesAvailable = newAvailable;
      }

      if (setupTreesPlaced < SETUP_TREES_NEEDED && pieceType === 'tree-small') {
        setupTreesPlaced++;
      }

      emitChange({ lpChange: -totalCost });
    }
  } else if (targetLocation === 'available') {
    if (piecesInInventory[pieceId]) {
      const pieceType = piecesInInventory[pieceId].type;
      const cost = getSlotCost(piecesInInventory[pieceId].position);

      piecesAvailable = {
        ...piecesAvailable,
        [pieceId]: { type: pieceType, position: toX },
      };

      const newInventory = { ...piecesInInventory };
      delete newInventory[pieceId];
      piecesInInventory = newInventory;

      emitChange({ lpChange: -cost });
    }
  } else if (targetLocation === 'inventory') {
    // Harvesting a large tree from the board
    const boardKey = Object.keys(boardState).find(key => boardState[key].id === pieceId);
    if (boardKey) {
      const [bx, by] = boardKey.split(',').map(Number);
      const ring = hexDistance(bx, by, 0, 0); // 0=center, 3=outer

      // Take from the matching ring's pile; fall back to next (less valuable) pile if empty
      let scoreValue = 0;
      for (let r = ring; r <= 3; r++) {
        if (scorePiles[r].length > 0) {
          scoreValue = scorePiles[r].shift();
          break;
        }
      }

      const pieceType = boardState[boardKey].type;
      const newBoardState = { ...boardState };
      delete newBoardState[boardKey];
      boardState = newBoardState;

      const openPos = findOpenSlotForType(pieceType);
      if (openPos !== null) {
        piecesInInventory = {
          ...piecesInInventory,
          [pieceId]: { type: pieceType, position: openPos },
        };
      }

      // Activate the now-empty square
      activatedSquaresThisTurn = new Set([...activatedSquaresThisTurn, boardKey]);

      emitChange({ lpChange: -4, scoreChange: scoreValue });
    }
  }

  emitChange();
}

// Returns a human-readable explanation of why a board placement is invalid,
// or null if the move is valid. Used to show tooltips during drag.
export function getDropHint(pieceId, toX, toY, lp) {
  const isFromInventory = pieceId in piecesInInventory;
  const isFromAvailable = pieceId in piecesAvailable;

  if (!isFromInventory && !isFromAvailable) {
    const boardEntry = Object.entries(boardState).find(([, piece]) => piece.id === pieceId);
    if (boardEntry && boardEntry[1].type === 'tree-large') {
      return "Drag large trees to the harvest area on the left to collect them.";
    }
    return "Trees cannot be moved once placed.";
  }

  let pieceType;
  if (isFromInventory) pieceType = piecesInInventory[pieceId].type;
  else pieceType = piecesAvailable[pieceId].type;

  const movementCost = movementCosts[pieceType] || 0;
  const buyCost = isFromInventory ? getSlotCost(piecesInInventory[pieceId].position) : 0;
  const totalCost = movementCost + buyCost;
  if (totalCost > lp) return `Need ${totalCost} light points (you have ${lp}).`;

  if (setupTreesPlaced < SETUP_TREES_NEEDED) {
    if (!isFromAvailable) return "During setup, use only your available pieces (not the store).";
    if (pieceType !== 'tree-small') return "During setup, only small trees can be placed.";
    if (hexDistance(toX, toY, 0, 0) !== 3) return "During setup, place trees on the outer ring only.";
  }

  const boardKey = `${toX},${toY}`;

  if (activatedSquaresThisTurn.has(boardKey)) return "This space was already used this turn.";

  if (pieceType === 'seed' && boardState[boardKey] === undefined) {
    const eligibleTreeReaches = Object.entries(boardState).some(([key, piece]) => {
      if (activatedSquaresThisTurn.has(key)) return false;
      const range = treeRanges[piece.type];
      if (!range) return false;
      const [tx, ty] = key.split(',').map(Number);
      return hexDistance(tx, ty, toX, toY) <= range;
    });
    if (!eligibleTreeReaches) {
      const anyTreeReaches = Object.entries(boardState).some(([key, piece]) => {
        const range = treeRanges[piece.type];
        if (!range) return false;
        const [tx, ty] = key.split(',').map(Number);
        return hexDistance(tx, ty, toX, toY) <= range;
      });
      return anyTreeReaches
        ? "Trees placed this turn cannot spread seeds until next turn."
        : "Seeds must be planted within range of one of your trees.";
    }
  }

  if (boardState[boardKey] === undefined) {
    if (pieceType !== 'seed') {
      return "Trees must be grown from seeds. Plant a seed here first.";
    }
  } else {
    if (growthChain[boardState[boardKey].type] !== pieceType) {
      const current = boardState[boardKey].type;
      const needed = growthChain[current];
      return needed
        ? `This square needs a ${needed.replace('tree-', '')} tree to grow next.`
        : "Large trees cannot grow further.";
    }
  }

  return null;
}

export function getBoardState() {
  return {
    boardState: { ...boardState },
    piecesInInventory: { ...piecesInInventory },
    piecesAvailable: { ...piecesAvailable },
  };
}

function initializeInventory() {
  let id = 0;

  piecesAvailable = {
    [id++]: { type: 'seed', position: 0 },
    [id++]: { type: 'seed', position: 1 },
    [id++]: { type: 'tree-small', position: 2 },
    [id++]: { type: 'tree-small', position: 3 },
  };

  for (let i = 0; i < 4; i++) { piecesInInventory[id] = { type: 'seed', position: i }; id++; }
  for (let i = 0; i < 4; i++) { piecesInInventory[id] = { type: 'tree-small', position: i + 4 }; id++; }
  for (let i = 0; i < 3; i++) { piecesInInventory[id] = { type: 'tree-medium', position: i + 8 }; id++; }
  for (let i = 0; i < 2; i++) { piecesInInventory[id] = { type: 'tree-large', position: i + 11 }; id++; }
}

initializeInventory();
