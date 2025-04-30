import React, { createContext, useContext, useEffect, useState } from 'react';
import { observe, getBoardState } from './Game';

// Create context
const GameContext = createContext();

// Provider component
export const GameProvider = ({ children }) => {
  const [boardState, setBoardState] = useState({});
  const [piecesInInventory, setPiecesInInventory] = useState({});
  const [sunPoints, setSunPoints] = useState(10);

  useEffect(() => {
    // Subscribe to game state changes
    const unsubscribe = observe((newBoardState, newInventory, options = {}) => {
      setBoardState(newBoardState);
      setPiecesInInventory(newInventory);
      if (options.sunPointsChange) {
        setSunPoints(prev => Math.max(0, prev + options.sunPointsChange));
      }
    });

    // Unsubscribe on component unmount
    return () => unsubscribe();
  }, []);

  return (
    <GameContext.Provider value={{ boardState, piecesInInventory, sunPoints, setSunPoints }}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook for using the game state
export const useGameState = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};

export const SunPointsDisplay = () => {
  const { sunPoints } = useGameState();
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
      <span style={{ marginRight: '5px' }}>☀️</span>
      <span>{sunPoints}</span>
    </div>
  );
};