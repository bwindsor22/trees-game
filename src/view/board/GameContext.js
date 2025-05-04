
import React, { createContext, useContext, useEffect, useState } from 'react';
import { observe } from './Game';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [boardState, setBoardState] = useState({});
  const [piecesInInventory, setPiecesInInventory] = useState({});
  const [piecesAvailable, setPiecesAvailable] = useState({});
  const [sunPoints, setSunPoints] = useState(10);

  useEffect(() => {
    const unsubscribe = observe((newBoardState, newInventory, newAvailable, options = {}) => {
      setBoardState(newBoardState);
      setPiecesInInventory(newInventory);
      setPiecesAvailable(newAvailable);
      if (options.sunPointsChange) {
        setSunPoints(prev => Math.max(0, prev + options.sunPointsChange));
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GameContext.Provider value={{ 
      boardState, 
      piecesInInventory, 
      piecesAvailable,
      sunPoints,
      setSunPoints 
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

export const SunPointsDisplay = () => {
  const { sunPoints } = useGameState();
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
      <span style={{ marginRight: '5px' }}>☀️</span>
      <span>{sunPoints}</span>
    </div>
  );
};
