// Game.js - Modified to support React state management

// Track all pieces on the board and their types
let boardState = {}; // Format: {"x,y": {type: "seed", id: "unique-id"}}
let piecesInInventory = {}; // Format: {id: {type: "seed", position: inventoryIndex}}

// Generate initial inventory with all pieces
function initializeInventory() {
  let id = 0;
  
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

// Initialize inventory at module load
initializeInventory();

let observers = [];

function emitChange() {
  observers.forEach((o) => o && o({ ...boardState }, { ...piecesInInventory }));
}

export function observe(o) {
  observers.push(o);
  
  // Immediately call the observer with the current state
  o({ ...boardState }, { ...piecesInInventory });
  
  return () => {
    observers = observers.filter((t) => t !== o);
  };
}

const PIECE_COSTS = {
  'seed': 1,
  'tree-small': 2,
  'tree-medium': 3,
  'tree-large': 4
};

export function getPieceCost(type) {
  return PIECE_COSTS[type] || 0;
}

export function canMovePiece(pieceId, toX, toY, targetLocation, sunPoints) {
  // If moving to board, check if the position is already occupied and if enough sun points
  if (targetLocation === 'board' && piecesInInventory[pieceId]) {
    const boardKey = `${toX},${toY}`;
    const pieceType = piecesInInventory[pieceId].type;
    const cost = PIECE_COSTS[pieceType];
    
    return boardState[boardKey] === undefined && sunPoints >= cost;
  }
  
  // Allow moving to inventory freely
  return true;
}

export function movePiece(pieceId, toX, toY, targetLocation = 'board') {
  // Moving piece from inventory to board
  if (piecesInInventory[pieceId] && targetLocation === 'board') {
    const pieceType = piecesInInventory[pieceId].type;
    const boardKey = `${toX},${toY}`;
    
    // Add piece to board
    boardState = {
      ...boardState,
      [boardKey]: { type: pieceType, id: pieceId }
    };
    
    // Remove from inventory
    const newInventory = { ...piecesInInventory };
    delete newInventory[pieceId];
    piecesInInventory = newInventory;
  } 
  // Moving piece from board to inventory
  else if (targetLocation === 'inventory') {
    // Find piece on board
    let boardKey = null;
    let pieceType = null;
    
    for (const key in boardState) {
      if (boardState[key].id === pieceId) {
        boardKey = key;
        pieceType = boardState[key].type;
        break;
      }
    }
    
    if (boardKey) {
      // Add to inventory
      piecesInInventory = {
        ...piecesInInventory,
        [pieceId]: { type: pieceType, position: toX }
      };
      
      // Remove from board
      const newBoardState = { ...boardState };
      delete newBoardState[boardKey];
      boardState = newBoardState;
    }
  }
  // Moving piece on the board
  else if (targetLocation === 'board') {
    // Find piece on board
    let oldBoardKey = null;
    let pieceType = null;
    
    for (const key in boardState) {
      if (boardState[key].id === pieceId) {
        oldBoardKey = key;
        pieceType = boardState[key].type;
        break;
      }
    }
    
    if (oldBoardKey) {
      // Create new board state
      const newBoardState = { ...boardState };
      
      // Add to new position
      const newBoardKey = `${toX},${toY}`;
      newBoardState[newBoardKey] = { type: pieceType, id: pieceId };
      
      // Remove from old position
      delete newBoardState[oldBoardKey];
      
      // Update board state
      boardState = newBoardState;
    }
  }
  
  // Notify observers of the changes
  emitChange();
}

export function getBoardState() {
  return { boardState: { ...boardState }, piecesInInventory: { ...piecesInInventory } };
}