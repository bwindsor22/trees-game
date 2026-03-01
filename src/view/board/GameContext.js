import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { observe, clearTurnActions } from './Game';

const TREE_SIZE = { 'seed': 0, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SHADOW_RANGE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

// Shadow direction per sun position (doubled hex coordinates).
// Position 0 = upper-right vertex, advancing clockwise.
const SHADOW_DIRS = [
  [-1, -1], // 0: sun upper-right  → shadows lower-left
  [-2,  0], // 1: sun right        → shadows left
  [-1,  1], // 2: sun lower-right  → shadows upper-left
  [ 1,  1], // 3: sun lower-left   → shadows upper-right
  [ 2,  0], // 4: sun left         → shadows right
  [ 1, -1], // 5: sun upper-left   → shadows lower-right
];

// Visual shadows: every square in any tree's shadow path, for display purposes.
function computeVisualShadows(boardState, sunPosition) {
  const [dx, dy] = SHADOW_DIRS[sunPosition];
  const shadowed = new Set();

  Object.entries(boardState).forEach(([key, caster]) => {
    const range = SHADOW_RANGE[caster.type];
    if (!range) return;

    const [cx, cy] = key.split(',').map(Number);
    for (let step = 1; step <= range; step++) {
      shadowed.add(`${cx + dx * step},${cy + dy * step}`);
    }
  });

  return shadowed;
}

// LP shadows: only squares where a piece is actually blocked from scoring.
// A tree is blocked when a same-or-larger tree casts a shadow on it.
function computeLPShadows(boardState, sunPosition) {
  const [dx, dy] = SHADOW_DIRS[sunPosition];
  const shadowed = new Set();

  Object.entries(boardState).forEach(([key, caster]) => {
    const range = SHADOW_RANGE[caster.type];
    if (!range) return;

    const [cx, cy] = key.split(',').map(Number);
    const casterSize = TREE_SIZE[caster.type];

    for (let step = 1; step <= range; step++) {
      const targetKey = `${cx + dx * step},${cy + dy * step}`;
      const target = boardState[targetKey];
      if (target && TREE_SIZE[target.type] <= casterSize) {
        shadowed.add(targetKey);
      }
    }
  });

  return shadowed;
}

// LP earned per unshaded tree during Photosynthesis Phase
const LP_PER_TREE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

function calculatePhotosynthesisLP(boardState, lpShadows) {
  let total = 0;
  Object.entries(boardState).forEach(([key, piece]) => {
    const lp = LP_PER_TREE[piece.type];
    if (lp && !lpShadows.has(key)) {
      total += lp;
    }
  });
  return total;
}

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [boardState, setBoardState] = useState({});
  const [piecesInInventory, setPiecesInInventory] = useState({});
  const [piecesAvailable, setPiecesAvailable] = useState({});
  const [lp, setLp] = useState(20);
  const [score, setScore] = useState(0);
  const [sunPosition, setSunPosition] = useState(0);
  const [sunRevolutions, setSunRevolutions] = useState(0);
  const [shadowedSquares, setShadowedSquares] = useState(new Set());
  const [visualShadowedSquares, setVisualShadowedSquares] = useState(new Set());
  const [lastLpGained, setLastLpGained] = useState(null);
  const [lastTurnScores, setLastTurnScores] = useState({});
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [scorePiles, setScorePiles] = useState([[22,21,20],[19,18,18,17,17],[16,16,14,14,13,13],[14,14,13,13,13,12,12,12,12]]);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const unsubscribe = observe((newBoardState, newInventory, newAvailable, options = {}) => {
      setBoardState(newBoardState);
      setPiecesInInventory(newInventory);
      setPiecesAvailable(newAvailable);
      if (options.lpChange) {
        setLp(prev => Math.max(0, prev + options.lpChange));
        // Any action taken clears the photosynthesis score badges
        if (options.lpChange < 0) setLastTurnScores({});
      }
      if (options.scoreChange) {
        setScore(prev => prev + options.scoreChange);
      }
      if (options.setupTreesPlaced !== undefined) {
        setIsSetupComplete(options.setupTreesPlaced >= 2);
      }
      if (options.scorePiles) {
        setScorePiles(options.scorePiles);
      }
    });
    return () => unsubscribe();
  }, []);

  // Recompute both shadow sets whenever the board or sun position changes
  useEffect(() => {
    setShadowedSquares(computeLPShadows(boardState, sunPosition));
    setVisualShadowedSquares(computeVisualShadows(boardState, sunPosition));
  }, [boardState, sunPosition]);

  // Advance the sun and run the Photosynthesis Phase:
  // compute LP for unshaded trees at the NEW sun position, award it (capped at 20).
  const advanceTurn = useCallback(() => {
    clearTurnActions();

    const newSunPos = (sunPosition + 1) % 6;
    const completingRevolution = newSunPos === 0;
    const newRevolutions = sunRevolutions + (completingRevolution ? 1 : 0);
    if (completingRevolution) setSunRevolutions(newRevolutions);

    const newLPShadows = computeLPShadows(boardState, newSunPos);
    const lpGained = calculatePhotosynthesisLP(boardState, newLPShadows);

    // Build per-tree score map for display
    const scores = {};
    Object.entries(boardState).forEach(([key, piece]) => {
      const earned = LP_PER_TREE[piece.type];
      if (earned && !newLPShadows.has(key)) {
        scores[key] = earned;
      }
    });

    setSunPosition(newSunPos);
    setLp(prev => Math.min(20, prev + lpGained));
    setLastLpGained(lpGained);
    setLastTurnScores(scores);

    // Game ends after 3 complete revolutions (18 turns)
    if (newRevolutions >= 3) {
      setIsGameOver(true);
    }
  }, [sunPosition, boardState, sunRevolutions]);

  return (
    <GameContext.Provider value={{
      boardState,
      piecesInInventory,
      piecesAvailable,
      lp,
      setLp,
      score,
      sunPosition,
      shadowedSquares,
      visualShadowedSquares,
      advanceTurn,
      lastLpGained,
      lastTurnScores,
      isSetupComplete,
      sunRevolutions,
      scorePiles,
      isGameOver,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};
