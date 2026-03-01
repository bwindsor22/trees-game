import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { observe, clearTurnActions, setCurrentPlayer, resetGame as resetGameModule } from './Game';
import { executeAITurn, getAISetupPositions } from '../../AI/ai';
import { movePiece, getBoardState } from './Game';

const TREE_SIZE = { 'seed': 0, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SHADOW_RANGE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

const SHADOW_DIRS = [
  [-1, -1], [-2,  0], [-1,  1],
  [ 1,  1], [ 2,  0], [ 1, -1],
];

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

const LP_PER_TREE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

function calculatePhotosynthesisLP(boardState, lpShadows, owner) {
  let total = 0;
  Object.entries(boardState).forEach(([key, piece]) => {
    if (piece.owner !== owner) return;
    const lp = LP_PER_TREE[piece.type];
    if (lp && !lpShadows.has(key)) total += lp;
  });
  return total;
}

const GameContext = createContext();

// CSS filter strings for each player color choice
export const COLOR_FILTERS = {
  green:  'none',
  blue:   'hue-rotate(150deg) saturate(1.4)',
  purple: 'hue-rotate(240deg) saturate(1.2)',
  orange: 'hue-rotate(30deg) saturate(2) brightness(1.1)',
};

export const GameProvider = ({ children, initialColor = 'green', initialDifficulty = 'medium' }) => {
  const [playerColor] = useState(initialColor);
  const [boardState, setBoardState] = useState({});
  const [piecesInInventory, setPiecesInInventory] = useState({});
  const [piecesAvailable, setPiecesAvailable] = useState({});
  const [piecesInInventory2, setPiecesInInventory2] = useState({});
  const [piecesAvailable2, setPiecesAvailable2] = useState({});
  const [lp, setLp] = useState(0);
  const [lp2, setLp2] = useState(0);
  const [score, setScore] = useState(0);
  const [score2, setScore2] = useState(0);
  const [sunPosition, setSunPosition] = useState(0);
  const [sunRevolutions, setSunRevolutions] = useState(0);
  const [shadowedSquares, setShadowedSquares] = useState(new Set());
  const [visualShadowedSquares, setVisualShadowedSquares] = useState(new Set());
  const [lastLpGained, setLastLpGained] = useState(null);
  const [lastTurnScores, setLastTurnScores] = useState({});
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [p1SetupDone, setP1SetupDone] = useState(false);
  const [scorePiles, setScorePiles] = useState([[22,21,20],[19,18,18,17,17],[16,16,14,14,13,13],[14,14,13,13,13,12,12,12,12]]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentPlayer, setCurrentPlayerState] = useState('p1');
  const [aiThinking, setAiThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);

  // Use refs to avoid stale closures in callbacks
  const lpRef = useRef(0);
  const lp2Ref = useRef(0);
  const scoreRef = useRef(0);
  const score2Ref = useRef(0);
  lpRef.current = lp;
  lp2Ref.current = lp2;
  scoreRef.current = score;
  score2Ref.current = score2;

  useEffect(() => {
    const unsubscribe = observe((newBoardState, newInventories, newAvailable, options = {}) => {
      setBoardState(newBoardState);
      setPiecesInInventory(newInventories.p1);
      setPiecesAvailable(newAvailable.p1);
      setPiecesInInventory2(newInventories.p2);
      setPiecesAvailable2(newAvailable.p2);

      const actingPlayer = options.currentPlayer || 'p1';

      if (options.lpChange) {
        if (actingPlayer === 'p1') {
          setLp(prev => { const n = Math.max(0, prev + options.lpChange); lpRef.current = n; return n; });
          if (options.lpChange < 0) setLastTurnScores({});
        } else {
          setLp2(prev => { const n = Math.max(0, prev + options.lpChange); lp2Ref.current = n; return n; });
        }
      }
      if (options.scoreChange) {
        if (actingPlayer === 'p1') {
          setScore(prev => { const n = prev + options.scoreChange; scoreRef.current = n; return n; });
        } else {
          setScore2(prev => { const n = prev + options.scoreChange; score2Ref.current = n; return n; });
        }
      }
      if (options.setupPlaced !== undefined) {
        setP1SetupDone(options.setupPlaced.p1 >= 2);
        const done = options.setupPlaced.p1 >= 2 && options.setupPlaced.p2 >= 2;
        setIsSetupComplete(done);
      }
      if (options.scorePiles) {
        setScorePiles(options.scorePiles);
      }
    });
    return () => unsubscribe();
  }, []);

  // Recompute shadows whenever board or sun position changes
  useEffect(() => {
    setShadowedSquares(computeLPShadows(boardState, sunPosition));
    setVisualShadowedSquares(computeVisualShadows(boardState, sunPosition));
  }, [boardState, sunPosition]);

  // When P1 finishes setup (places 2 trees), trigger AI setup placement.
  // Depends on p1SetupDone (not isSetupComplete) so it fires as soon as p1 is done,
  // before p2 has placed — which is exactly when we need to trigger the AI.
  useEffect(() => {
    if (!p1SetupDone || aiThinking) return;
    const live = getBoardState();
    if (live.setupPlaced.p2 >= 2) return; // AI already placed
    setAiThinking(true);
    setTimeout(() => {
      const positions = getAISetupPositions(live.boardState);
      setCurrentPlayer('p2');
      const aiAvail = live.available.p2;
      const smallTrees = Object.entries(aiAvail).filter(([, p]) => p.type === 'tree-small');
      positions.forEach(([x, y], i) => {
        if (smallTrees[i]) {
          movePiece(smallTrees[i][0], x, y, 'board');
        }
      });
      setCurrentPlayer('p1');
      setCurrentPlayerState('p1');

      // Run initial photosynthesis at sun position 0 (rulebook: photosynthesis fires
      // before the first lifecycle turn, giving players LP from their starting trees).
      const liveAfter = getBoardState();
      const lpShadows = computeLPShadows(liveAfter.boardState, 0);
      const lpGainedP1 = calculatePhotosynthesisLP(liveAfter.boardState, lpShadows, 'p1');
      const lpGainedP2 = calculatePhotosynthesisLP(liveAfter.boardState, lpShadows, 'p2');
      const initialScores = {};
      Object.entries(liveAfter.boardState).forEach(([key, piece]) => {
        const earned = LP_PER_TREE[piece.type];
        if (earned && !lpShadows.has(key)) initialScores[key] = earned;
      });
      setLp(prev => { const n = Math.min(20, prev + lpGainedP1); lpRef.current = n; return n; });
      setLp2(prev => { const n = Math.min(20, prev + lpGainedP2); lp2Ref.current = n; return n; });
      setLastLpGained(lpGainedP1);
      setLastTurnScores(initialScores);

      setAiThinking(false);
    }, 400);
  }, [p1SetupDone, aiThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceSunAndPhotosynthesis = useCallback((currentBoardState, currentSunPos, currentRevolutions) => {
    const newSunPos = (currentSunPos + 1) % 6;
    const completingRevolution = newSunPos === 0;
    const newRevolutions = currentRevolutions + (completingRevolution ? 1 : 0);
    if (completingRevolution) setSunRevolutions(newRevolutions);

    const newLPShadows = computeLPShadows(currentBoardState, newSunPos);
    const lpGainedP1 = calculatePhotosynthesisLP(currentBoardState, newLPShadows, 'p1');
    const lpGainedP2 = calculatePhotosynthesisLP(currentBoardState, newLPShadows, 'p2');

    const scores = {};
    Object.entries(currentBoardState).forEach(([key, piece]) => {
      const earned = LP_PER_TREE[piece.type];
      if (earned && !newLPShadows.has(key)) scores[key] = earned;
    });

    setSunPosition(newSunPos);
    setLp(prev => { const n = Math.min(20, prev + lpGainedP1); lpRef.current = n; return n; });
    setLp2(prev => { const n = Math.min(20, prev + lpGainedP2); lp2Ref.current = n; return n; });
    setLastLpGained(lpGainedP1);
    setLastTurnScores(scores);

    if (newRevolutions >= 3) setIsGameOver(true);
  }, []);

  // Human ends their lifecycle turn → AI plays → sun advances
  const endPlayerTurn = useCallback(() => {
    setAiThinking(true);
    setCurrentPlayerState('p2');

    setTimeout(() => {
      executeAITurn(
        { p1: lpRef.current, p2: lp2Ref.current },
        { p1: scoreRef.current, p2: score2Ref.current },
        difficulty,
      );
      setCurrentPlayerState('p1');

      // After AI moves, advance sun and run photosynthesis
      clearTurnActions();
      const liveAfter = getBoardState();
      advanceSunAndPhotosynthesis(liveAfter.boardState, sunPosition, sunRevolutions);

      setCurrentPlayerState('p1');
      setAiThinking(false);
    }, difficulty === 'easy' ? 300 : difficulty === 'medium' ? 500 : 800);
  }, [difficulty, sunPosition, sunRevolutions, advanceSunAndPhotosynthesis]);

  const resetGame = useCallback(() => {
    setLp(0); lpRef.current = 0;
    setLp2(0); lp2Ref.current = 0;
    setScore(0); scoreRef.current = 0;
    setScore2(0); score2Ref.current = 0;
    setSunPosition(0);
    setSunRevolutions(0);
    setShadowedSquares(new Set());
    setVisualShadowedSquares(new Set());
    setLastLpGained(null);
    setLastTurnScores({});
    setIsSetupComplete(false);
    setP1SetupDone(false);
    setScorePiles([[22,21,20],[19,18,18,17,17],[16,16,14,14,13,13],[14,14,13,13,13,12,12,12,12]]);
    setIsGameOver(false);
    setCurrentPlayerState('p1');
    setAiThinking(false);
    resetGameModule();
  }, []);

  return (
    <GameContext.Provider value={{
      boardState,
      piecesInInventory,
      piecesAvailable,
      piecesInInventory2,
      piecesAvailable2,
      lp,
      lp2,
      score,
      score2,
      sunPosition,
      shadowedSquares,
      visualShadowedSquares,
      endPlayerTurn,
      lastLpGained,
      lastTurnScores,
      isSetupComplete,
      sunRevolutions,
      scorePiles,
      isGameOver,
      resetGame,
      currentPlayer,
      aiThinking,
      difficulty,
      setDifficulty,
      playerColor,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameState must be used within a GameProvider');
  return context;
};
