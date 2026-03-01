import React, { useState } from 'react';

const COLORS = [
  { id: 'green',  label: 'Green',  filter: 'none',                                    swatch: '#388e3c' },
  { id: 'blue',   label: 'Blue',   filter: 'hue-rotate(150deg) saturate(1.4)',         swatch: '#1565c0' },
  { id: 'purple', label: 'Purple', filter: 'hue-rotate(240deg) saturate(1.2)',         swatch: '#6a1b9a' },
  { id: 'orange', label: 'Orange', filter: 'hue-rotate(30deg) saturate(2) brightness(1.1)', swatch: '#e65100' },
];

const DIFFICULTY_INFO = {
  easy:   { label: 'Easy',   emoji: '🌱', desc: 'AI picks from top moves randomly. Good for learning.' },
  medium: { label: 'Medium', emoji: '🌳', desc: 'AI always picks the best immediate move.' },
  hard:   { label: 'Hard',   emoji: '🏆', desc: 'AI looks 2 moves ahead. A real challenge.' },
};

const StartScreen = ({ onStart }) => {
  const [color, setColor] = useState('green');
  const [numAI, setNumAI] = useState(1);
  const [difficulty, setDifficulty] = useState('medium');

  const totalPlayers = 1 + numAI;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #388e3c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '16px',
        padding: '40px 48px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌲</div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1b5e20', fontWeight: 'bold' }}>Photosynthesis</h1>
          <p style={{ margin: '6px 0 0', color: '#555', fontSize: '14px' }}>Grow your forest. Outshine your rivals.</p>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '10px', fontSize: '14px' }}>
            Your Color
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                title={c.label}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  borderRadius: '8px',
                  border: color === c.id ? '3px solid #1b5e20' : '2px solid #ddd',
                  background: color === c.id ? '#e8f5e9' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: c.swatch,
                  boxShadow: color === c.id ? `0 0 0 3px ${c.swatch}44` : 'none',
                }} />
                <span style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Number of AI opponents */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '10px', fontSize: '14px' }}>
            Players
            <span style={{ fontWeight: 'normal', color: '#777', marginLeft: '8px', fontSize: '12px' }}>
              ({totalPlayers} total: you + {numAI} AI)
            </span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map(n => {
              const available = n === 1;
              return (
                <button
                  key={n}
                  onClick={() => available && setNumAI(n)}
                  title={available ? '' : 'Coming soon'}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: numAI === n ? '2px solid #1b5e20' : '1px solid #ddd',
                    background: numAI === n ? '#e8f5e9' : available ? '#fff' : '#f9f9f9',
                    cursor: available ? 'pointer' : 'default',
                    fontSize: '13px',
                    fontFamily: 'sans-serif',
                    color: !available ? '#bbb' : numAI === n ? '#1b5e20' : '#444',
                    fontWeight: numAI === n ? 'bold' : 'normal',
                    position: 'relative',
                  }}
                >
                  {n === 1 ? '1v1' : n === 2 ? '1v2' : '1v3'}
                  <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '2px', color: available ? '#888' : '#ccc' }}>
                    {available ? `${n} AI opponent` : 'coming soon'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '10px', fontSize: '14px' }}>
            AI Difficulty
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: difficulty === key ? '2px solid #1b5e20' : '1px solid #ddd',
                  background: difficulty === key ? '#e8f5e9' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px' }}>{info.emoji}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: difficulty === key ? '#1b5e20' : '#333', fontFamily: 'sans-serif' }}>
                    {info.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', fontFamily: 'sans-serif' }}>{info.desc}</div>
                </div>
                {difficulty === key && (
                  <span style={{ marginLeft: 'auto', color: '#1b5e20', fontSize: '16px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart({ color, numAI, difficulty })}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(27,94,32,0.4)',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.5px',
          }}
        >
          🌱 Start Game
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
