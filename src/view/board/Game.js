// N-player game state (playerList is configurable)
let playerList = ['p1', 'p2'];
let boardState = {};
let inventories = {};
let available = {};
let setupPlaced = {};
const SETUP_TREES_NEEDED = 2;

function allPlayersSetupDone() {
  return playerList.every(p => (setupPlaced[p] || 0) >= SETUP_TREES_NEEDED);
}

// The player whose pieces are currently being interacted with
let currentPlayer = 'p1';

// Tracks every board square acted upon this turn (planting, growing, or harvesting).
// No space can be acted upon twice in one turn.
let activatedSquaresThisTurn = new Set();

// Scoring token piles indexed by ring (0=center 4-leaf, 3=outer 1-leaf).
const SCORE_PILES_INIT = [
  [22, 21, 20],
  [19, 18, 18, 17, 17],
  [16, 16, 14, 14, 13, 13],
  [14, 14, 13, 13, 13, 12, 12, 12, 12],
];
let scorePiles = SCORE_PILES_INIT.map(p => [...p]);

let observers = [];

function snapAll(obj) {
  return Object.fromEntries(playerList.map(p => [p, { ...obj[p] }]));
}

function emitChange(options = {}) {
  const fullOptions = {
    ...options,
    setupPlaced: { ...setupPlaced },
    scorePiles: scorePiles.map(p => [...p]),
    currentPlayer,
  };
  observers.forEach((o) => o && o(
    { ...boardState },
    snapAll(inventories),
    snapAll(available),
    fullOptions
  ));
}

export function observe(o) {
  observers.push(o);
  o(
    { ...boardState },
    snapAll(inventories),
    snapAll(available),
    {
      setupPlaced: { ...setupPlaced },
      scorePiles: scorePiles.map(p => [...p]),
      currentPlayer,
    }
  );
  return () => {
    observers = observers.filter((t) => t !== o);
  };
}

export function clearTurnActions() {
  activatedSquaresThisTurn = new Set();
}

export function setCurrentPlayer(player) {
  currentPlayer = player;
}

export function getCurrentPlayer() {
  return currentPlayer;
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

function findOpenSlotForType(type, player) {
  const range = INVENTORY_SLOT_RANGES[type];
  if (!range) return null;
  const usedPositions = new Set(Object.values(inventories[player]).map(p => p.position));
  for (let pos = range.end; pos >= range.start; pos--) {
    if (!usedPositions.has(pos)) return pos;
  }
  return null;
}

export function canMovePiece(pieceId, toX, toY, targetLocation, lp) {
  const inv = inventories[currentPlayer];
  const avail = available[currentPlayer];
  const setupDone = allPlayersSetupDone();

  if (targetLocation === 'board') {
    const isFromInventory = pieceId in inv;
    const isFromAvailable = pieceId in avail;
    if (!isFromInventory && !isFromAvailable) return false;

    let pieceType;
    if (isFromInventory) pieceType = inv[pieceId].type;
    else pieceType = avail[pieceId].type;

    // Setup phase: initial placement is FREE (no LP cost) per rulebook
    if (!setupDone) {
      if (setupPlaced[currentPlayer] >= SETUP_TREES_NEEDED) return false;
      if (!isFromAvailable) return false;
      if (pieceType !== 'tree-small') return false;
      if (hexDistance(toX, toY, 0, 0) !== 3) return false;
      return boardState[`${toX},${toY}`] === undefined;
    }

    const movementCost = movementCosts[pieceType] || 0;
    const buyCost = isFromInventory ? getSlotCost(inv[pieceId].position) : 0;
    const totalCost = movementCost + buyCost;
    if (totalCost > lp) return false;

    const boardKey = `${toX},${toY}`;
    if (activatedSquaresThisTurn.has(boardKey)) return false;

    // Seeds: must be within range of own tree not placed this turn
    if (pieceType === 'seed') {
      const canReach = Object.entries(boardState).some(([key, piece]) => {
        if (piece.owner !== currentPlayer) return false;
        if (activatedSquaresThisTurn.has(key)) return false;
        const range = treeRanges[piece.type];
        if (!range) return false;
        const [tx, ty] = key.split(',').map(Number);
        return hexDistance(tx, ty, toX, toY) <= range;
      });
      if (!canReach) return false;
    }

    if (boardState[boardKey] === undefined) {
      return pieceType === 'seed';
    }

    // Can only grow your own pieces
    if (boardState[boardKey].owner !== currentPlayer) return false;
    return growthChain[boardState[boardKey].type] === pieceType;
  }

  if (targetLocation === 'available') {
    if (!setupDone) return false;
    const isFromInventory = pieceId in inv;
    if (!isFromInventory) return false;
    const cost = getSlotCost(inv[pieceId].position);
    if (cost > lp) return false;
    return true;
  }

  if (targetLocation === 'inventory') {
    const boardEntry = Object.entries(boardState).find(([, piece]) => piece.id === pieceId);
    if (!boardEntry) return false;
    const piece = boardEntry[1];
    if (piece.type !== 'tree-large') return false;
    if (piece.owner !== currentPlayer) return false;
    const boardKey = boardEntry[0];
    if (activatedSquaresThisTurn.has(boardKey)) return false;
    return 4 <= lp;
  }

  return true;
}

export function movePiece(pieceId, toX, toY, targetLocation = 'board') {
  const inv = inventories[currentPlayer];
  const avail = available[currentPlayer];

  if (targetLocation === 'board') {
    let pieceType;
    let fromLocation;

    if (inv[pieceId]) {
      pieceType = inv[pieceId].type;
      fromLocation = 'inventory';
    } else if (avail[pieceId]) {
      pieceType = avail[pieceId].type;
      fromLocation = 'available';
    }

    if (pieceType) {
      const boardKey = `${toX},${toY}`;
      const setupDone = allPlayersSetupDone();
      const movementCost = setupDone ? (movementCosts[pieceType] || 0) : 0; // free during setup
      const buyCost = (setupDone && fromLocation === 'inventory') ? getSlotCost(inv[pieceId].position) : 0;
      const totalCost = movementCost + buyCost;

      // Growing: displaced piece returns to current player's inventory
      const existingPiece = boardState[boardKey];
      if (existingPiece) {
        const openPos = findOpenSlotForType(existingPiece.type, currentPlayer);
        if (openPos !== null) {
          inventories = {
            ...inventories,
            [currentPlayer]: {
              ...inventories[currentPlayer],
              [existingPiece.id]: { type: existingPiece.type, position: openPos },
            },
          };
        }
      }

      activatedSquaresThisTurn = new Set([...activatedSquaresThisTurn, boardKey]);

      boardState = {
        ...boardState,
        [boardKey]: { type: pieceType, id: pieceId, owner: currentPlayer },
      };

      if (fromLocation === 'inventory') {
        const newInv = { ...inventories[currentPlayer] };
        delete newInv[pieceId];
        inventories = { ...inventories, [currentPlayer]: newInv };
      } else {
        const newAvail = { ...available[currentPlayer] };
        delete newAvail[pieceId];
        available = { ...available, [currentPlayer]: newAvail };
      }

      if (setupPlaced[currentPlayer] < SETUP_TREES_NEEDED && pieceType === 'tree-small') {
        setupPlaced = { ...setupPlaced, [currentPlayer]: setupPlaced[currentPlayer] + 1 };
      }

      emitChange({ lpChange: -totalCost });
    }
  } else if (targetLocation === 'available') {
    if (inv[pieceId]) {
      const pieceType = inv[pieceId].type;
      const cost = getSlotCost(inv[pieceId].position);

      available = {
        ...available,
        [currentPlayer]: {
          ...available[currentPlayer],
          [pieceId]: { type: pieceType, position: toX },
        },
      };

      const newInv = { ...inventories[currentPlayer] };
      delete newInv[pieceId];
      inventories = { ...inventories, [currentPlayer]: newInv };

      emitChange({ lpChange: -cost });
    }
  } else if (targetLocation === 'inventory') {
    // Harvesting a large tree from the board
    const boardKey = Object.keys(boardState).find(key => boardState[key].id === pieceId);
    if (boardKey) {
      const [bx, by] = boardKey.split(',').map(Number);
      const ring = hexDistance(bx, by, 0, 0);

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

      const openPos = findOpenSlotForType(pieceType, currentPlayer);
      if (openPos !== null) {
        inventories = {
          ...inventories,
          [currentPlayer]: {
            ...inventories[currentPlayer],
            [pieceId]: { type: pieceType, position: openPos },
          },
        };
      }

      activatedSquaresThisTurn = new Set([...activatedSquaresThisTurn, boardKey]);
      emitChange({ lpChange: -4, scoreChange: scoreValue });
    }
  }

  emitChange();
}

export function getDropHint(pieceId, toX, toY, lp) {
  const inv = inventories[currentPlayer];
  const avail = available[currentPlayer];
  const isFromInventory = pieceId in inv;
  const isFromAvailable = pieceId in avail;
  const setupDone = allPlayersSetupDone();

  if (!isFromInventory && !isFromAvailable) {
    const boardEntry = Object.entries(boardState).find(([, piece]) => piece.id === pieceId);
    if (boardEntry) {
      if (boardEntry[1].type === 'tree-large' && boardEntry[1].owner === currentPlayer) {
        return "Drag large trees to the harvest area on the left to collect them.";
      }
      if (boardEntry[1].owner !== currentPlayer) {
        return "You cannot move the opponent's pieces.";
      }
    }
    return "Trees cannot be moved once placed.";
  }

  let pieceType;
  if (isFromInventory) pieceType = inv[pieceId].type;
  else pieceType = avail[pieceId].type;

  if (!setupDone) {
    // Setup placement is free — no LP check
    if (!isFromAvailable) return "During setup, use only your available pieces (not the store).";
    if (pieceType !== 'tree-small') return "During setup, only small trees can be placed.";
    if (hexDistance(toX, toY, 0, 0) !== 3) return "During setup, place trees on the outer ring only.";
  } else {
    const movementCost = movementCosts[pieceType] || 0;
    const buyCost = isFromInventory ? getSlotCost(inv[pieceId].position) : 0;
    const totalCost = movementCost + buyCost;
    if (totalCost > lp) return `Need ${totalCost} light points (you have ${lp}).`;
  }

  const boardKey = `${toX},${toY}`;
  if (activatedSquaresThisTurn.has(boardKey)) return "This space was already used this turn.";

  if (pieceType === 'seed' && boardState[boardKey] === undefined) {
    const eligibleTreeReaches = Object.entries(boardState).some(([key, piece]) => {
      if (piece.owner !== currentPlayer) return false;
      if (activatedSquaresThisTurn.has(key)) return false;
      const range = treeRanges[piece.type];
      if (!range) return false;
      const [tx, ty] = key.split(',').map(Number);
      return hexDistance(tx, ty, toX, toY) <= range;
    });
    if (!eligibleTreeReaches) {
      const anyOwnTreeReaches = Object.entries(boardState).some(([key, piece]) => {
        if (piece.owner !== currentPlayer) return false;
        const range = treeRanges[piece.type];
        if (!range) return false;
        const [tx, ty] = key.split(',').map(Number);
        return hexDistance(tx, ty, toX, toY) <= range;
      });
      return anyOwnTreeReaches
        ? "Trees placed this turn cannot spread seeds until next turn."
        : "Seeds must be planted within range of one of your trees.";
    }
  }

  if (boardState[boardKey] === undefined) {
    if (pieceType !== 'seed') return "Trees must be grown from seeds. Plant a seed here first.";
  } else {
    if (boardState[boardKey].owner !== currentPlayer) return "You cannot grow on the opponent's pieces.";
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
    inventories: snapAll(inventories),
    available: snapAll(available),
    setupPlaced: { ...setupPlaced },
    scorePiles: scorePiles.map(p => [...p]),
    currentPlayer,
    activatedSquaresThisTurn: new Set(activatedSquaresThisTurn),
  };
}

export function getPlayerList() {
  return [...playerList];
}

function initPlayerInventory(player, startId) {
  let id = startId;
  available[player] = {
    [id++]: { type: 'seed', position: 0 },
    [id++]: { type: 'seed', position: 1 },
    [id++]: { type: 'tree-small', position: 2 },
    [id++]: { type: 'tree-small', position: 3 },
  };
  for (let i = 0; i < 4; i++) { inventories[player][id] = { type: 'seed', position: i }; id++; }
  for (let i = 0; i < 4; i++) { inventories[player][id] = { type: 'tree-small', position: i + 4 }; id++; }
  for (let i = 0; i < 3; i++) { inventories[player][id] = { type: 'tree-medium', position: i + 8 }; id++; }
  for (let i = 0; i < 2; i++) { inventories[player][id] = { type: 'tree-large', position: i + 11 }; id++; }
  return id;
}

function _initState(players) {
  playerList = players;
  boardState = {};
  inventories = Object.fromEntries(players.map(p => [p, {}]));
  available = Object.fromEntries(players.map(p => [p, {}]));
  setupPlaced = Object.fromEntries(players.map(p => [p, 0]));
  currentPlayer = 'p1';
  activatedSquaresThisTurn = new Set();
  scorePiles = SCORE_PILES_INIT.map(p => [...p]);
  let id = 0;
  for (const p of players) {
    id = initPlayerInventory(p, id);
  }
}

export function initGame(players = ['p1', 'p2']) {
  _initState(players);
  emitChange();
}

export function resetGame() {
  _initState(playerList);
  emitChange();
}

// Default 2-player initialization at module load time
_initState(['p1', 'p2']);
