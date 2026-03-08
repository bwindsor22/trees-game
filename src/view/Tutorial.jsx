import React, { useState } from 'react';
import leaf1 from './board/images/1-leaf.jpg';
import leaf2 from './board/images/2-leaf.jpg';
import leaf3 from './board/images/3-leaf.jpg';
import leaf4 from './board/images/4-leaf.jpg';
import seedImage from './board/images/seed.png';
import treeSmallImage from './board/images/tree-small.png';
import treeMediumImage from './board/images/tree-medium.png';
import treeLargeImage from './board/images/tree-large.png';

const TREE_IMAGES = { seed: seedImage, small: treeSmallImage, medium: treeMediumImage, large: treeLargeImage };
const TREE_SIZES = { seed: 14, small: 22, medium: 32, large: 42 };

// Render a tree piece image the same way the game does
const TreeImg = ({ type, faded = false }) => {
  const size = TREE_SIZES[type] || 22;
  return (
    <img
      src={TREE_IMAGES[type]}
      alt={type}
      style={{ width: size, height: size, objectFit: 'contain', opacity: faded ? 0.3 : 1 }}
    />
  );
};

// ─── Mini board fragment helpers ──────────────────────────────────────────────

// A single hex cell in the tutorial diagrams — uses real board leaf images
const Cell = ({ label, shadowed = false, children, size = 52, ring = 1 }) => {
  const bgImage = ring <= 1 ? leaf1 : leaf2;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      border: '2px solid rgba(0,0,0,0.25)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size > 44 ? '20px' : '15px',
      position: 'relative',
      flexShrink: 0,
      // Darken shadowed cells like the game does
      boxShadow: shadowed ? 'inset 0 0 0 52px rgba(0,0,0,0.45)' : 'none',
    }}>
      {children}
      {label && (
        <span style={{ fontSize: '9px', position: 'absolute', bottom: 2, color: '#fff', fontFamily: 'sans-serif', textShadow: '0 0 3px #000' }}>
          {label}
        </span>
      )}
    </div>
  );
};

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
    diagram: (
      <div style={{ marginTop: 10, fontFamily: 'sans-serif', fontSize: '12px', color: '#555' }}>
        <div style={{ marginBottom: 6 }}>Video guides:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a
            href="https://www.youtube.com/watch?v=GkwW_vOlmEY"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1565c0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: '16px' }}>▶</span>
            <span>How to Play (3 mins)</span>
          </a>
          <a
            href="https://www.youtube.com/watch?v=c2e6hno4Enk"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1565c0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: '16px' }}>▶</span>
            <span>How to Play (8 mins)</span>
          </a>
        </div>
      </div>
    ),
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
          {[['small', 'Small', '1 LP'], ['medium', 'Medium', '2 LP'], ['large', 'Large', '3 LP']].map(([type, n, v]) => (
            <div key={n} style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'center', height: 36, alignItems: 'center' }}>
                <TreeImg type={type} />
              </div>
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
          <Cell><TreeImg type="large" /></Cell>
          <Arrow label="shadow" />
          <Cell shadowed label="blocked"><TreeImg type="small" faded /></Cell>
          <Arrow />
          <Cell shadowed><span style={{ fontSize: '9px', color: '#aaa', fontFamily: 'sans-serif' }}>shadow</span></Cell>
        </Row>
        <Caption>The large tree's shadow covers 3 hexes. The small tree inside that shadow earns no LP.</Caption>
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
          <Cell><TreeImg type="small" /></Cell>
          <Arrow label="shadow" />
          <Cell label="earns LP!"><TreeImg type="large" /></Cell>
        </Row>
        <Caption>Small tree casts a shadow, but the large tree is bigger — it still earns LP.</Caption>
        <div style={{ marginTop: 10 }} />
        <Row label="Small tree blocks another small tree:">
          <Cell><TreeImg type="small" /></Cell>
          <Arrow label="shadow" />
          <Cell shadowed label="blocked"><TreeImg type="small" faded /></Cell>
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
              <Cell><TreeImg type="large" /></Cell>
              <Arrow />
              <Cell shadowed label="blocked"><TreeImg type="small" faded /></Cell>
            </Row>
            <Caption>Now: small tree blocked</Caption>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px', paddingTop: 20 }}>↓</div>
          <div>
            <SunArrow dir="down" />
            <Row>
              <Cell label="earns LP!"><TreeImg type="small" /></Cell>
              <div style={{ width: 10 }}/>
              <Cell><TreeImg type="large" /></Cell>
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
            [['seed','small'], 'Plant seed from Available → board', '1 LP'],
            [['small','medium'], 'Grow small → medium tree', '2 LP'],
            [['medium','large'], 'Grow medium → large tree', '3 LP'],
            [['large',null], 'Harvest large tree for scoring token', '4 LP'],
            [null, 'Buy piece from Store into Available', 'varies'],
          ].map(([types, desc, cost]) => (
            <div key={desc} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ minWidth: 70, display: 'flex', alignItems: 'center', gap: 2 }}>
                {types ? (
                  <>
                    <TreeImg type={types[0]} />
                    <span style={{ color: '#888' }}>→</span>
                    {types[1] ? <TreeImg type={types[1]} /> : <span style={{ fontSize: '14px' }}>🏆</span>}
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#666' }}>Store→Avail</span>
                )}
              </div>
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
          {[
            [leaf4, '22–20 pts', 'Center'],
            [leaf3, '19–17 pts', 'Ring 2'],
            [leaf2, '16–13 pts', 'Ring 3'],
            [leaf1, '14–12 pts', 'Outer'],
          ].map(([img, pts, label], i) => (
            <React.Fragment key={label}>
              {i > 0 && <div style={{ fontSize: '18px', color: '#aaa' }}>→</div>}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  margin: '0 auto 4px',
                  border: '2px solid rgba(0,0,0,0.2)',
                }} />
                <div style={{ color: '#1b5e20', fontWeight: 'bold' }}>{pts}</div>
                <div style={{ color: '#888' }}>{label}</div>
              </div>
            </React.Fragment>
          ))}
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
