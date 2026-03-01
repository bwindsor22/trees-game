
import React from 'react';
import { useGameState } from '../board/GameContext';

const SunPoints = () => {
  const { lp } = useGameState();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px',
      fontSize: '1.2em',
      fontWeight: 'bold'
    }}>
      <span><strong>{lp}</strong> LP</span>
    </div>
  );
};

export default SunPoints;
