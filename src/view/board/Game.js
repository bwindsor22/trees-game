
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

export function canMovePiece(pieceId, toX, toY, targetLocation) {
  if (targetLocation === 'board') {
    // Only allow moves from inventory or available to board
    const isFromInventory = pieceId in piecesInInventory;
    const isFromAvailable = pieceId in piecesAvailable;
    if (!isFromInventory && !isFromAvailable) return false;
    
    const boardKey = `${toX},${toY}`;
    return boardState[boardKey] === undefined;
  }
  
  if (targetLocation === 'available') {
    // Only allow moves from inventory to available
    const isFromInventory = pieceId in piecesInInventory;
    const isFromBoard = Object.values(boardState).some(piece => piece.id === pieceId);
    return isFromInventory && !isFromBoard;
  }
  
  if (targetLocation === 'inventory') {
    // Don't allow moves to inventory
    return false;
  }
  
  return true;
}

export function movePiece(pieceId, toX, toY, targetLocation = 'board') {
  if (targetLocation === 'board') {
    let pieceType;
    let fromLocation;
    
    // Check if piece is from inventory
    if (piecesInInventory[pieceId]) {
      pieceType = piecesInInventory[pieceId].type;
      fromLocation = 'inventory';
    } 
    // Check if piece is from available
    else if (piecesAvailable[pieceId]) {
      pieceType = piecesAvailable[pieceId].type;
      fromLocation = 'available';
    }
    
    if (pieceType) {
      const boardKey = `${toX},${toY}`;
      const inventoryCost = fromLocation === 'inventory' ? (pieceValues[pieceType] || 0) : 0;
      const movementCost = movementCosts[pieceType] || 0;
      const totalCost = inventoryCost + movementCost;
      
      boardState = {
        ...boardState,
        [boardKey]: { type: pieceType, id: pieceId }
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
  } 
  else if (targetLocation === 'available') {
    if (piecesInInventory[pieceId]) {
      const pieceType = piecesInInventory[pieceId].type;
      const pieceValue = pieceValues[pieceType] || 0;
      
      piecesAvailable = {
        ...piecesAvailable,
        [pieceId]: { type: pieceType, position: toX }
      };
      
      const newInventory = { ...piecesInInventory };
      delete newInventory[pieceId];
      piecesInInventory = newInventory;
      
      emitChange({ sunPointsChange: -pieceValue });
    }
  }
  
  emitChange();
}

export function getBoardState() {
  return { 
    boardState: { ...boardState }, 
    piecesInInventory: { ...piecesInInventory },
    piecesAvailable: { ...piecesAvailable }
  };
}

// Initialize inventory
const movementCosts = {
  'seed': 0,
  'tree-small': 1,
  'tree-medium': 2,
  'tree-large': 3
};

function initializeInventory() {
  let id = 0;
  
  // Initialize available pieces first
  piecesAvailable = {
    [id++]: { type: 'seed', position: 0 },
    [id++]: { type: 'seed', position: 1 },
    [id++]: { type: 'tree-small', position: 2 },
    [id++]: { type: 'tree-small', position: 3 }
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
