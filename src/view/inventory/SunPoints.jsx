
import React from 'react';
import { useGameState } from '../board/GameContext';

const SunPoints = () => {
  const { sunPoints } = useGameState();
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px',
      fontSize: '1.2em',
      fontWeight: 'bold'
    }}>
      <span role="img" aria-label="sun" style={{ fontSize: '1.5em' }}>☀️</span>
      <span>Sun Points: {sunPoints}</span>
    </div>
  );
};

export default SunPoints;
