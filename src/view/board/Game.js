import { pieceValues } from './pieceValues';

let boardState = {};
let piecesInInventory = {};
let piecesAvailable = {};

let observers = [];

function emitChange(options = {}) {
  observers.forEach((o) => o && o(
    { ...boardState },
    { ...piecesInInventory },
    { ...piecesAvailable },
    options
  ));
}

export function observe(o) {
  observers.push(o);
  o({ ...boardState }, { ...piecesInInventory }, { ...piecesAvailable });
  return () => {
    observers = observers.filter((t) => t !== o);
  };
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

export function canMovePiece(pieceId, toX, toY, targetLocation, sunPoints) {
  if (targetLocation === 'board') {
    // Only allow moves from inventory or available to board (not board→board)
    const isFromInventory = pieceId in piecesInInventory;
    const isFromAvailable = pieceId in piecesAvailable;
    if (!isFromInventory && !isFromAvailable) return false;

    // Get the piece type and calculate the cost
    let pieceType;
    if (isFromInventory) {
      pieceType = piecesInInventory[pieceId].type;
    } else {
      pieceType = piecesAvailable[pieceId].type;
    }

    const movementCost = movementCosts[pieceType] || 0;
    const inventoryCost = isFromInventory ? (pieceValues[pieceType] || 0) : 0;
    const totalCost = movementCost + inventoryCost;

    // Check if there are enough sun points
    if (totalCost > sunPoints) return false;

    const boardKey = `${toX},${toY}`;

    // Seed placement: must be within range of at least one tree on the board
    if (pieceType === 'seed') {
      const canReach = Object.entries(boardState).some(([key, piece]) => {
        const range = treeRanges[piece.type];
        if (!range) return false;
        const [tx, ty] = key.split(',').map(Number);
        return hexDistance(tx, ty, toX, toY) <= range;
      });
      if (!canReach) return false;
    }

    // Empty square: always valid (after cost + seed-range checks)
    if (boardState[boardKey] === undefined) return true;

    // Occupied square: only valid if growing (placing the next size up)
    return growthChain[boardState[boardKey].type] === pieceType;
  }

  if (targetLocation === 'available') {
    // Only allow moves from inventory to available (not from board)
    const isFromInventory = pieceId in piecesInInventory;
    const isFromBoard = Object.values(boardState).some(piece => piece.id === pieceId);
    if (!isFromInventory || isFromBoard) return false;

    // Check if there are enough sun points for the piece value
    const pieceType = piecesInInventory[pieceId].type;
    const pieceValue = pieceValues[pieceType] || 0;
    if (pieceValue > sunPoints) return false;

    return true;
  }

  if (targetLocation === 'inventory') {
    // Allow harvesting large trees from the board back to inventory (costs 4 LP)
    const boardEntry = Object.entries(boardState).find(([, piece]) => piece.id === pieceId);
    if (!boardEntry) return false;
    const piece = boardEntry[1];
    if (piece.type !== 'tree-large') return false;
    return 4 <= sunPoints;
  }

  return true;
}

// Find the first open inventory slot position (0–12)
function findOpenInventorySlot() {
  const usedPositions = new Set(Object.values(piecesInInventory).map(p => p.position));
  for (let pos = 0; pos <= 12; pos++) {
    if (!usedPositions.has(pos)) return pos;
  }
  return null;
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
      const inventoryCost = fromLocation === 'inventory' ? (pieceValues[pieceType] || 0) : 0;
      const totalCost = movementCost + inventoryCost;

      // Growing: return displaced piece to inventory if there's room
      const existingPiece = boardState[boardKey];
      if (existingPiece) {
        const openPos = findOpenInventorySlot();
        if (openPos !== null) {
          piecesInInventory = {
            ...piecesInInventory,
            [existingPiece.id]: { type: existingPiece.type, position: openPos },
          };
        }
        // If no open slot, the displaced piece is discarded
      }

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

      emitChange({ sunPointsChange: -totalCost });
    }
  } else if (targetLocation === 'available') {
    if (piecesInInventory[pieceId]) {
      const pieceType = piecesInInventory[pieceId].type;
      const pieceValue = pieceValues[pieceType] || 0;

      piecesAvailable = {
        ...piecesAvailable,
        [pieceId]: { type: pieceType, position: toX },
      };

      const newInventory = { ...piecesInInventory };
      delete newInventory[pieceId];
      piecesInInventory = newInventory;

      emitChange({ sunPointsChange: -pieceValue });
    }
  } else if (targetLocation === 'inventory') {
    // Harvesting a large tree from the board
    const boardKey = Object.keys(boardState).find(key => boardState[key].id === pieceId);
    if (boardKey) {
      const pieceType = boardState[boardKey].type;
      const newBoardState = { ...boardState };
      delete newBoardState[boardKey];
      boardState = newBoardState;

      const openPos = findOpenInventorySlot();
      if (openPos !== null) {
        piecesInInventory = {
          ...piecesInInventory,
          [pieceId]: { type: pieceType, position: openPos },
        };
      }

      emitChange({ sunPointsChange: -4 });
    }
  }

  emitChange();
}

export function getBoardState() {
  return {
    boardState: { ...boardState },
    piecesInInventory: { ...piecesInInventory },
    piecesAvailable: { ...piecesAvailable },
  };
}

// Initialize inventory
const movementCosts = {
  'seed': 1,
  'tree-small': 1,
  'tree-medium': 2,
  'tree-large': 3,
};

function initializeInventory() {
  let id = 0;

  // Initialize available pieces first
  piecesAvailable = {
    [id++]: { type: 'seed', position: 0 },
    [id++]: { type: 'seed', position: 1 },
    [id++]: { type: 'tree-small', position: 2 },
    [id++]: { type: 'tree-small', position: 3 },
  };

  // Add seeds (Row 1)
  for (let i = 0; i < 4; i++) {
    piecesInInventory[id] = { type: 'seed', position: i };
    id++;
  }

  // Add small trees (Row 2)
  for (let i = 0; i < 4; i++) {
    piecesInInventory[id] = { type: 'tree-small', position: i + 4 };
    id++;
  }

  // Add medium trees (Row 3)
  for (let i = 0; i < 3; i++) {
    piecesInInventory[id] = { type: 'tree-medium', position: i + 8 };
    id++;
  }

  // Add large trees (Row 4)
  for (let i = 0; i < 2; i++) {
    piecesInInventory[id] = { type: 'tree-large', position: i + 11 };
    id++;
  }
}

initializeInventory();
