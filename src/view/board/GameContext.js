import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { observe, clearTurnActions, setCurrentPlayer, resetGame as resetGameModule, initGame } from './Game';
import { executeAITurn, getAISetupPositions } from '../../AI/ai';
import { movePiece, getBoardState } from './Game';

const TREE_SIZE = { 'seed': 0, 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };
const SHADOW_RANGE = { 'tree-small': 1, 'tree-medium': 2, 'tree-large': 3 };

const SHADOW_DIRS = [
  [-1, -1], [-2,  0], [-1,  1],
  [ 1,  1], [ 2,  0], [ 1, -1],
];

function computeVisualShadows(boardState, sunPosition) {
  // Same logic as computeLPShadows: only darken cells where a tree actually
  // loses LP (i.e., caster size >= target size). Pure-empty cells within
  // shadow range are still darkened so the player can see where shadow falls.
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
      // If the cell has a tree, only shadow it if caster is >= target size
      if (target && TREE_SIZE[target.type] !== undefined) {
        if (TREE_SIZE[target.type] <= casterSize) {
          shadowed.add(targetKey);
        }
      } else {
        // Empty cells within shadow range are still shown as shadowed
        shadowed.add(targetKey);
      }
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

// Compute player turn order for a given revolution count (rotates clockwise each revolution)
function getPlayerOrder(playerList, revolutions) {
  const offset = revolutions % playerList.length;
  return [...playerList.slice(offset), ...playerList.slice(0, offset)];
}

const GameContext = createContext();

// CSS filter strings for each player color choice
export const COLOR_FILTERS = {
  green:  'none',
  blue:   'hue-rotate(150deg) saturate(1.4)',
  purple: 'hue-rotate(240deg) saturate(1.2)',
  orange: 'hue-rotate(30deg) saturate(2) brightness(1.1)',
};

export const GameProvider = ({ children, initialColor = 'green', initialDifficulty = 'medium', numAI = 1, maxRevolutions = 3 }) => {
  // playerList: ['p1', 'p2'] for 1 AI, ['p1','p2','p3'] for 2 AI, etc.
  const playerListRef = useRef(['p1', ...Array.from({ length: numAI }, (_, i) => `p${i + 2}`)]);
  const aiPlayers = playerListRef.current.slice(1); // all non-p1

  const [playerColor] = useState(initialColor);
  const [boardState, setBoardState] = useState({});
  // Per-player inventory, available, lp, score — stored as objects keyed by player id
  const [inventoriesAll, setInventoriesAll] = useState({});
  const [availablesAll, setAvailablesAll] = useState({});
  const [lpAll, setLpAll] = useState(Object.fromEntries(playerListRef.current.map(p => [p, 0])));
  const [scoreAll, setScoreAll] = useState(Object.fromEntries(playerListRef.current.map(p => [p, 0])));

  // Backwards-compat aliases for App.js (p1/p2)
  const piecesInInventory = inventoriesAll.p1 || {};
  const piecesAvailable = availablesAll.p1 || {};
  const piecesInInventory2 = inventoriesAll.p2 || {};
  const piecesAvailable2 = availablesAll.p2 || {};
  const lp = lpAll.p1 || 0;
  const lp2 = lpAll.p2 || 0;
  const score = scoreAll.p1 || 0;
  const score2 = scoreAll.p2 || 0;

  const [sunPosition, setSunPosition] = useState(0);
  const [sunRevolutions, setSunRevolutions] = useState(0);
  const [shadowedSquares, setShadowedSquares] = useState(new Set());
  const [visualShadowedSquares, setVisualShadowedSquares] = useState(new Set());
  const [lastLpGained, setLastLpGained] = useState(null);
  const [lastLpGainedAll, setLastLpGainedAll] = useState({});
  const [lastTurnScores, setLastTurnScores] = useState({});
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [p1SetupDone, setP1SetupDone] = useState(false);
  const [scorePiles, setScorePiles] = useState([[22,21,20],[19,18,18,17,17],[16,16,14,14,13,13],[14,14,13,13,13,12,12,12,12]]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFinalRound, setIsFinalRound] = useState(false);
  const [currentPlayer, setCurrentPlayerState] = useState('p1');
  const [aiThinking, setAiThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);

  // Tap-to-move (mobile): which piece id is currently selected
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Refs to avoid stale closures in async callbacks
  const lpAllRef = useRef(Object.fromEntries(playerListRef.current.map(p => [p, 0])));
  const scoreAllRef = useRef(Object.fromEntries(playerListRef.current.map(p => [p, 0])));
  // Keep refs in sync
  const lpRef = useRef(0);       // p1 alias
  const lp2Ref = useRef(0);      // p2 alias
  const scoreRef = useRef(0);
  const score2Ref = useRef(0);
  lpRef.current = lp;
  lp2Ref.current = lp2;
  scoreRef.current = score;
  score2Ref.current = score2;
  lpAllRef.current = lpAll;
  scoreAllRef.current = scoreAll;

  // Initialize game with the correct player count
  useEffect(() => {
    initGame(playerListRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = observe((newBoardState, newInventories, newAvailable, options = {}) => {
      setBoardState(newBoardState);
      setInventoriesAll({ ...newInventories });
      setAvailablesAll({ ...newAvailable });

      const actingPlayer = options.currentPlayer || 'p1';

      if (options.lpChange) {
        setLpAll(prev => {
          const n = { ...prev, [actingPlayer]: Math.max(0, (prev[actingPlayer] || 0) + options.lpChange) };
          lpAllRef.current = n;
          return n;
        });
        if (options.lpChange < 0 && actingPlayer === 'p1') setLastTurnScores({});
      }
      if (options.scoreChange) {
        setScoreAll(prev => {
          const n = { ...prev, [actingPlayer]: (prev[actingPlayer] || 0) + options.scoreChange };
          scoreAllRef.current = n;
          return n;
        });
      }
      if (options.setupPlaced !== undefined) {
        setP1SetupDone((options.setupPlaced.p1 || 0) >= 2);
        const done = playerListRef.current.every(p => (options.setupPlaced[p] || 0) >= 2);
        setIsSetupComplete(done);
      }
      if (options.scorePiles) {
        setScorePiles(options.scorePiles);
      }
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute shadows whenever board or sun position changes
  useEffect(() => {
    setShadowedSquares(computeLPShadows(boardState, sunPosition));
    setVisualShadowedSquares(computeVisualShadows(boardState, sunPosition));
  }, [boardState, sunPosition]);

  // When P1 finishes setup, trigger each AI player to place setup trees in sequence.
  useEffect(() => {
    if (!p1SetupDone || aiThinking) return;
    const live = getBoardState();
    // Check if any AI player still needs to place
    if (aiPlayers.every(p => (live.setupPlaced[p] || 0) >= 2)) return;
    setAiThinking(true);

    // Sequentially place trees for each AI player that hasn't placed yet
    function placeForAI(idx) {
      if (idx >= aiPlayers.length) {
        // All AI players have placed — run initial photosynthesis
        setCurrentPlayer('p1');
        setCurrentPlayerState('p1');
        const liveAfter = getBoardState();
        const lpShadows = computeLPShadows(liveAfter.boardState, 0);
        const scores = {};
        const lpGains = {};
        playerListRef.current.forEach(p => {
          lpGains[p] = calculatePhotosynthesisLP(liveAfter.boardState, lpShadows, p);
        });
        Object.entries(liveAfter.boardState).forEach(([key, piece]) => {
          const earned = LP_PER_TREE[piece.type];
          if (earned && !lpShadows.has(key)) scores[key] = earned;
        });
        setLpAll(prev => {
          const n = Object.fromEntries(
            Object.entries(prev).map(([p, v]) => [p, Math.min(20, v + (lpGains[p] || 0))])
          );
          lpAllRef.current = n;
          return n;
        });
        setLastLpGained(lpGains.p1 || 0);
        setLastLpGainedAll({ ...lpGains });
        setLastTurnScores(scores);
        setAiThinking(false);
        return;
      }
      const aiPlayer = aiPlayers[idx];
      const live2 = getBoardState();
      if ((live2.setupPlaced[aiPlayer] || 0) >= 2) { placeForAI(idx + 1); return; }
      setTimeout(() => {
        const positions = getAISetupPositions(live2.boardState);
        setCurrentPlayer(aiPlayer);
        const aiAvail = live2.available[aiPlayer] || {};
        const smallTrees = Object.entries(aiAvail).filter(([, p]) => p.type === 'tree-small');
        positions.forEach(([x, y], i) => {
          if (smallTrees[i]) movePiece(smallTrees[i][0], x, y, 'board');
        });
        placeForAI(idx + 1);
      }, 400);
    }
    placeForAI(0);
  }, [p1SetupDone, aiThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceSunAndPhotosynthesis = useCallback((currentBoardState, currentSunPos, currentRevolutions) => {
    const newSunPos = (currentSunPos + 1) % 6;
    const completingRevolution = newSunPos === 0;
    const newRevolutions = currentRevolutions + (completingRevolution ? 1 : 0);
    if (completingRevolution) setSunRevolutions(newRevolutions);

    const newLPShadows = computeLPShadows(currentBoardState, newSunPos);
    const lpGains = Object.fromEntries(
      playerListRef.current.map(p => [p, calculatePhotosynthesisLP(currentBoardState, newLPShadows, p)])
    );

    const scores = {};
    Object.entries(currentBoardState).forEach(([key, piece]) => {
      const earned = LP_PER_TREE[piece.type];
      if (earned && !newLPShadows.has(key)) scores[key] = earned;
    });

    setSunPosition(newSunPos);
    setLpAll(prev => {
      const n = Object.fromEntries(
        Object.entries(prev).map(([p, v]) => [p, Math.min(20, v + (lpGains[p] || 0))])
      );
      lpAllRef.current = n;
      return n;
    });
    setLastLpGained(lpGains.p1 || 0);
    setLastLpGainedAll({ ...lpGains });
    setLastTurnScores(scores);

    // After 3 revolutions: trigger final round (everyone plays once more, then game over)
    if (newRevolutions >= maxRevolutions) setIsFinalRound(true);
  }, [maxRevolutions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Human ends their turn → run post-p1 AIs → advance sun → run pre-p1 AIs for next round
  const endPlayerTurn = useCallback(() => {
    setAiThinking(true);
    const delay = difficulty === 'easy' ? 300 : difficulty === 'medium' ? 500 : 800;

    // Run a list of AI players sequentially with a given sun position for shadow-aware eval
    function runAIList(list, sunPosForAI, onDone) {
      function run(idx) {
        if (idx >= list.length) { onDone(); return; }
        const aiPlayer = list[idx];
        setCurrentPlayerState(aiPlayer);
        setTimeout(() => {
          executeAITurn(
            { ...lpAllRef.current },
            { ...scoreAllRef.current },
            difficulty,
            aiPlayer,
            sunPosForAI,
            sunRevolutions,
          );
          setCurrentPlayer('p1');
          run(idx + 1);
        }, delay);
      }
      run(0);
    }

    // Current revolution's player order: only run AIs that come after p1
    const currentOrder = getPlayerOrder(playerListRef.current, sunRevolutions);
    const p1Idx = currentOrder.indexOf('p1');
    const postP1AIs = currentOrder.slice(p1Idx + 1).filter(p => aiPlayers.includes(p));

    runAIList(postP1AIs, sunPosition, () => {
      setCurrentPlayer('p1');
      clearTurnActions();

      if (isFinalRound) {
        setCurrentPlayerState('p1');
        setIsGameOver(true);
        setAiThinking(false);
        return;
      }

      // Advance sun; compute what the new revolution count will be for next player order
      const newSunPos = (sunPosition + 1) % 6;
      const completingRevolution = newSunPos === 0;
      const newRevolutions = sunRevolutions + (completingRevolution ? 1 : 0);

      const liveAfter = getBoardState();
      advanceSunAndPhotosynthesis(liveAfter.boardState, sunPosition, sunRevolutions);

      // Next revolution's order: run AIs that come before p1 before enabling human
      const nextOrder = getPlayerOrder(playerListRef.current, newRevolutions);
      const nextP1Idx = nextOrder.indexOf('p1');
      const preP1AIs = nextOrder.slice(0, nextP1Idx).filter(p => aiPlayers.includes(p));

      if (preP1AIs.length === 0) {
        setCurrentPlayerState('p1');
        setAiThinking(false);
      } else {
        runAIList(preP1AIs, newSunPos, () => {
          clearTurnActions();
          setCurrentPlayerState('p1');
          setAiThinking(false);
        });
      }
    });
  }, [difficulty, sunPosition, sunRevolutions, isFinalRound, advanceSunAndPhotosynthesis, aiPlayers]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetGame = useCallback(() => {
    const zeroed = Object.fromEntries(playerListRef.current.map(p => [p, 0]));
    setLpAll({ ...zeroed }); lpAllRef.current = { ...zeroed };
    setScoreAll({ ...zeroed }); scoreAllRef.current = { ...zeroed };
    setSunPosition(0);
    setSunRevolutions(0);
    setShadowedSquares(new Set());
    setVisualShadowedSquares(new Set());
    setLastLpGained(null);
    setLastLpGainedAll({});
    setLastTurnScores({});
    setIsSetupComplete(false);
    setIsFinalRound(false);
    setP1SetupDone(false);
    setScorePiles([[22,21,20],[19,18,18,17,17],[16,16,14,14,13,13],[14,14,13,13,13,12,12,12,12]]);
    setIsGameOver(false);
    setCurrentPlayerState('p1');
    setAiThinking(false);
    setSelectedPiece(null);
    resetGameModule();
  }, []);

  // Current revolution's player order (derived from sunRevolutions — no extra state needed)
  const playerOrder = getPlayerOrder(playerListRef.current, sunRevolutions);
  const firstPlayer = playerOrder[0];

  return (
    <GameContext.Provider value={{
      boardState,
      // Per-player data (keyed by player id)
      inventoriesAll,
      availablesAll,
      lpAll,
      scoreAll,
      aiPlayers,
      // Backwards-compat aliases for p1/p2
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
      lastLpGainedAll,
      lastTurnScores,
      isSetupComplete,
      sunRevolutions,
      scorePiles,
      isGameOver,
      isFinalRound,
      resetGame,
      currentPlayer,
      aiThinking,
      difficulty,
      setDifficulty,
      playerColor,
      playerOrder,
      firstPlayer,
      isMobile,
      selectedPiece,
      setSelectedPiece,
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
