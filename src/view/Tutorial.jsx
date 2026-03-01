import React, { useState } from 'react';

// ─── Mini board fragment helpers ──────────────────────────────────────────────

const TREE_EMOJI = { seed: '🌱', small: '🌿', medium: '🌲', large: '🌳' };

// A single hex cell in the tutorial diagrams
const Cell = ({ label, bg = '#e8f5e9', border = '#aed581', children, size = 52 }) => (
  <div style={{
    width: size, height: size,
    borderRadius: '50%',
    background: bg,
    border: `2px solid ${border}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size > 44 ? '20px' : '15px',
    position: 'relative',
    flexShrink: 0,
  }}>
    {children}
    {label && (
      <span style={{ fontSize: '9px', position: 'absolute', bottom: 2, color: '#555', fontFamily: 'sans-serif' }}>
        {label}
      </span>
    )}
  </div>
);

const Arrow = ({ label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 4px', color: '#f9a825', fontSize: '20px' }}>
    →
    {label && <span style={{ fontSize: '9px', color: '#888', fontFamily: 'sans-serif' }}>{label}</span>}
  </div>
);

const Row = ({ children, label }) => (
  <div style={{ marginBottom: label ? 12 : 6 }}>
    {label && <div style={{ fontSize: '11px', color: '#888', fontFamily: 'sans-serif', marginBottom: 4 }}>{label}</div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
  </div>
);

const DiagramBox = ({ children }) => (
  <div style={{
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: '10px 14px',
    marginTop: 8,
    marginBottom: 4,
  }}>
    {children}
  </div>
);

const Caption = ({ children }) => (
  <div style={{ fontSize: '11px', color: '#666', fontFamily: 'sans-serif', marginTop: 4, fontStyle: 'italic' }}>
    {children}
  </div>
);

// Sun indicator showing direction
const SunArrow = ({ dir = 'right' }) => {
  const arrows = { right: '→', left: '←', up: '↑', down: '↓' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, fontSize: '12px', fontFamily: 'sans-serif', color: '#666' }}>
      <span style={{ fontSize: '16px' }}>☀️</span> sun direction: <strong>{arrows[dir]}</strong>
    </div>
  );
};

// ─── Tutorial steps ───────────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Welcome to Photosynthesis 🌳',
    body: 'Grow trees on a hexagonal forest board, earn light points from the sun, and harvest large trees for scoring tokens. The player with the most points after 3 sun revolutions wins.',
  },

  {
    title: 'Setup — Plant your starting trees',
    body: 'Drag 2 small trees from your "Available" section onto empty hexes on the outer ring of the board. Starting placement is free — no light points needed.',
  },

  {
    title: 'Earning light points ☀️',
    body: 'After each turn, trees earn light points (LP) based on their size — but only if they are not in shadow. Each turn you can spend LP to grow your forest.',
    diagram: (
      <DiagramBox>
        <div style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif', marginBottom: 8 }}>
          LP earned per unshadowed tree each turn:
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[['🌿', 'Small', '1 LP'], ['🌲', 'Medium', '2 LP'], ['🌳', 'Large', '3 LP']].map(([e, n, v]) => (
            <div key={n} style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
              <div style={{ fontSize: '24px' }}>{e}</div>
              <div style={{ fontSize: '10px', color: '#555' }}>{n}</div>
              <div style={{ fontSize: '11px', color: '#1b5e20', fontWeight: 'bold' }}>{v}</div>
            </div>
          ))}
        </div>
      </DiagramBox>
    ),
  },

  {
    title: 'Shadows — Large tree blocks small tree',
    body: 'Trees cast shadows in the direction the sun is facing. A larger (or equal-size) tree shadows smaller trees behind it, blocking their LP.',
    diagram: (
      <DiagramBox>
        <SunArrow dir="right" />
        <Row label="Large tree shadows the small tree (1 hex away):">
          <Cell bg="#e8f5e9"><span>🌳</span></Cell>
          <Arrow label="shadow" />
          <Cell bg="#9e9e9e" border="#757575" label="blocked">
            <span style={{ opacity: 0.4 }}>🌿</span>
          </Cell>
          <Arrow />
          <Cell bg="#e8f5e9"><span style={{ opacity: 0.3 }}>shadow</span></Cell>
        </Row>
        <Caption>The 🌳 large tree's shadow covers 3 hexes. The 🌿 small tree inside that shadow earns no LP.</Caption>
      </DiagramBox>
    ),
  },

  {
    title: 'Shadows — Small tree does NOT block large tree',
    body: 'Shadow only blocks same-size or smaller trees. A small tree casts a shadow, but a larger tree behind it ignores it.',
    diagram: (
      <DiagramBox>
        <SunArrow dir="right" />
        <Row label="Small tree's shadow does NOT block the large tree:">
          <Cell bg="#e8f5e9"><span>🌿</span></Cell>
          <Arrow label="shadow" />
          <Cell bg="#e8f5e9" label="earns LP!"><span>🌳</span></Cell>
        </Row>
        <Caption>🌿 Small tree casts a shadow, but 🌳 large tree is bigger — it still earns LP.</Caption>
        <div style={{ marginTop: 10 }} />
        <Row label="Small tree blocks another small tree:">
          <Cell bg="#e8f5e9"><span>🌿</span></Cell>
          <Arrow label="shadow" />
          <Cell bg="#9e9e9e" border="#757575" label="blocked">
            <span style={{ opacity: 0.4 }}>🌿</span>
          </Cell>
        </Row>
        <Caption>Equal-size trees block each other — even your own trees.</Caption>
      </DiagramBox>
    ),
  },

  {
    title: 'Shadows — The sun rotates 🔄',
    body: 'The sun moves one step clockwise after each pair of turns. Shadow directions change, so trees that earned LP this turn might be blocked next turn — and vice versa.',
    diagram: (
      <DiagramBox>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <SunArrow dir="right" />
            <Row>
              <Cell bg="#e8f5e9"><span>🌳</span></Cell>
              <Arrow />
              <Cell bg="#9e9e9e" border="#757575" label="blocked">
                <span style={{ opacity: 0.4 }}>🌿</span>
              </Cell>
            </Row>
            <Caption>Now: small tree blocked</Caption>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px', paddingTop: 20 }}>↓</div>
          <div>
            <SunArrow dir="down" />
            <Row>
              <Cell bg="#e8f5e9" label="earns LP!"><span>🌿</span></Cell>
              <div style={{ width: 10 }}/>
              <Cell bg="#e8f5e9"><span>🌳</span></Cell>
            </Row>
            <Caption>After rotation: now both earn LP!</Caption>
          </div>
        </div>
      </DiagramBox>
    ),
  },

  {
    title: 'The Life Cycle — Grow and harvest',
    body: 'Each turn, spend light points to:',
    diagram: (
      <DiagramBox>
        <div style={{ fontFamily: 'sans-serif', fontSize: '12px' }}>
          {[
            ['🌱→🌿', 'Plant seed from Available → board', '1 LP'],
            ['🌿→🌲', 'Grow small → medium tree', '2 LP'],
            ['🌲→🌳', 'Grow medium → large tree', '3 LP'],
            ['🌳→🏆', 'Harvest large tree for scoring token', '4 LP'],
            ['Store→Avail', 'Buy piece from Store into Available', 'varies'],
          ].map(([icon, desc, cost]) => (
            <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '14px', minWidth: 70 }}>{icon}</span>
              <span style={{ flex: 1, color: '#333' }}>{desc}</span>
              <span style={{ color: '#1b5e20', fontWeight: 'bold', minWidth: 50, textAlign: 'right' }}>{cost}</span>
            </div>
          ))}
        </div>
        <Caption>Seeds can only be planted within range of an existing tree. Newly placed trees can't spread seeds the same turn.</Caption>
      </DiagramBox>
    ),
  },

  {
    title: 'Scoring — Harvest tokens 🏆',
    body: 'Harvest large trees to earn tokens. Tokens are worth more near the center. At game end, unused LP converts 3:1 to bonus points. Highest total wins!',
    diagram: (
      <DiagramBox>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'sans-serif', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px' }}>🍀</div>
            <div style={{ color: '#1b5e20', fontWeight: 'bold' }}>22–20 pts</div>
            <div style={{ color: '#888' }}>Center</div>
          </div>
          <div style={{ fontSize: '18px', color: '#aaa' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px' }}>🍃</div>
            <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>19–17 pts</div>
            <div style={{ color: '#888' }}>Ring 2</div>
          </div>
          <div style={{ fontSize: '18px', color: '#aaa' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px' }}>🌿</div>
            <div style={{ color: '#388e3c', fontWeight: 'bold' }}>16–13 pts</div>
            <div style={{ color: '#888' }}>Ring 3</div>
          </div>
          <div style={{ fontSize: '18px', color: '#aaa' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px' }}>🍂</div>
            <div style={{ color: '#689f38', fontWeight: 'bold' }}>14–12 pts</div>
            <div style={{ color: '#888' }}>Outer</div>
          </div>
        </div>
      </DiagramBox>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Tutorial = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      width: '360px',
      maxHeight: '80vh',
      overflowY: 'auto',
      background: '#fffde7',
      border: '2px solid #f9a825',
      borderRadius: '12px',
      padding: '16px 18px',
      zIndex: 1000,
      boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#888', fontFamily: 'sans-serif' }}>
          Step {step + 1} of {STEPS.length}
        </span>
        <button
          onClick={onDone}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px', lineHeight: 1 }}
          title="Skip tutorial"
        >✕</button>
      </div>

      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#5d4037' }}>
        {current.title}
      </div>

      <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.5 }}>
        {current.body}
      </div>

      {current.diagram && current.diagram}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          style={{
            fontSize: '13px', padding: '4px 12px', borderRadius: '6px',
            border: '1px solid #ccc', background: '#fff',
            cursor: step === 0 ? 'default' : 'pointer',
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
