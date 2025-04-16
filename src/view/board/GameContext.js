import React, { createContext, useContext, useEffect, useState } from 'react';
import { observe, getBoardState } from './Game';

// Create context
const GameContext = createContext();

// Provider component
export const GameProvider = ({ children }) => {
  const [boardState, setBoardState] = useState({});
  const [piecesInInventory, setPiecesInInventory] = useState({});

  useEffect(() => {
    // Subscribe to game state changes
    const unsubscribe = observe((newBoardState, newInventory) => {
      setBoardState(newBoardState);
      setPiecesInInventory(newInventory);
    });

    // Unsubscribe on component unmount
    return () => unsubscribe();
  }, []);

  return (
    <GameContext.Provider value={{ boardState, piecesInInventory }}>
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