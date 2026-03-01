import React, { useState } from 'react';

const STEPS = [
  {
    title: 'Welcome to Photosynthesis 🌳',
    body: 'You grow trees on a hexagonal forest board, collect light points from the sun, and harvest large trees for scoring tokens. The player with the most points after 3 sun revolutions wins.',
  },
  {
    title: 'Setup — Plant your starting trees',
    body: 'Drag 2 small trees from "Available Pieces" onto any empty hex on the outer ring (the edge of the board). These are free — no light points needed.',
  },
  {
    title: 'Photosynthesis — Earning light points ☀️',
    body: 'Click "End My Turn" to advance the sun. Each of your trees that isn\'t in shadow earns light points: small = 1, medium = 2, large = 3. Points cap at 20.',
  },
  {
    title: 'Shadows 🌑',
    body: 'Trees cast shadows in the direction opposite the sun. A small tree shadows 1 hex, medium 2 hexes, large 3 hexes. A tree is blocked when a same-or-larger tree shadows it — even your own.',
  },
  {
    title: 'The Life Cycle — Grow and harvest',
    body: 'Spend light points each turn: buy pieces from the Store into Available, plant seeds (1 LP), grow trees (1/2/3 LP), or harvest a large tree for a scoring token (4 LP). Seeds can only be planted within range of your existing trees.',
  },
  {
    title: 'Scoring — Harvest tokens 🏆',
    body: 'Harvest a large tree to earn a scoring token. Tokens are worth more near the center (up to 22 pts) and less near the edge. At game end, add 1 pt for every 3 unused light points. Highest score wins!',
  },
];

const Tutorial = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      width: '320px',
      background: '#fffde7',
      border: '2px solid #f9a825',
      borderRadius: '12px',
      padding: '16px 18px',
      zIndex: 1000,
      boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#888' }}>Step {step + 1} of {STEPS.length}</span>
        <button
          onClick={onDone}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px', lineHeight: 1 }}
          title="Skip tutorial"
        >✕</button>
      </div>
      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#5d4037' }}>
        {current.title}
      </div>
      <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.5, marginBottom: '14px' }}>
        {current.body}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          style={{
            fontSize: '13px', padding: '4px 12px', borderRadius: '6px',
            border: '1px solid #ccc', background: '#fff', cursor: step === 0 ? 'default' : 'pointer',
            opacity: step === 0 ? 0.4 : 1,
          }}
        >← Back</button>
        {isLast ? (
          <button
            onClick={onDone}
            style={{
              fontSize: '13px', padding: '4px 14px', borderRadius: '6px',
              border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
            }}
          >Start Playing →</button>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{
              fontSize: '13px', padding: '4px 14px', borderRadius: '6px',
              border: 'none', background: '#f9a825', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
            }}
          >Next →</button>
        )}
      </div>
    </div>
  );
};

export default Tutorial;
