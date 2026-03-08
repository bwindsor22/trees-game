import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import ItemTypes from './ItemTypes';
import { canMovePiece, movePiece } from './Game';
import { useGameState } from './GameContext';

// Ring labels matching SCORE_PILES_INIT order: 0=center(4-leaf), 3=outer(1-leaf)
const RING_LABELS = ['🍃🍃🍃🍃', '🍃🍃🍃', '🍃🍃', '🍃'];

const isMobileView = () => typeof window !== 'undefined' && window.innerWidth < 768;

const CollectArea = () => {
  const { lp, scorePiles, aiThinking } = useGameState();
  const [expanded, setExpanded] = useState(false);
  const mobile = isMobileView();

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => !aiThinking && canMovePiece(item.id, 0, 0, 'inventory', lp),
    drop: (item) => movePiece(item.id, 0, 0, 'inventory'),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  const borderColor = isOver ? (canDrop ? '#2e7d32' : '#c62828') : '#bdbdbd';
  const bg = isOver && canDrop ? 'rgba(46,125,50,0.10)' : 'rgba(255,255,255,0.6)';

  if (mobile && !expanded) {
    // Collapsed strip: "🏆 Harvest  22pts · 19pts · 16pts · 14pts  ▸"
    const topScores = scorePiles
      ? scorePiles.map(pile => pile.length > 0 ? `${pile[0]}pts` : '—').join(' · ')
      : '';
    return (
      <div
        ref={drop}
        className="collect-area-mobile"
        onClick={() => setExpanded(true)}
        style={{
          border: `2px dashed ${borderColor}`,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#555',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '16px' }}>🏆</span>
        <span style={{ fontWeight: 'bold' }}>Harvest</span>
        <span style={{ color: '#888' }}>(-4 LP)</span>
        <span style={{ color: '#388e3c', marginLeft: '4px' }}>{topScores}</span>
        <span style={{ marginLeft: 'auto', color: '#aaa' }}>▸</span>
      </div>
    );
  }

  return (
    <div
      ref={drop}
      style={{
        width: mobile ? '100%' : '150px',
        minHeight: mobile ? 0 : '160px',
        border: `2px dashed ${borderColor}`,
        borderRadius: '10px',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '8px 4px',
        textAlign: 'center',
        flexShrink: 0,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {mobile && (
        <div
          onClick={() => setExpanded(false)}
          style={{ alignSelf: 'flex-end', fontSize: '11px', color: '#aaa', cursor: 'pointer', padding: '0 4px' }}
        >
          ▴ collapse
        </div>
      )}
      <div style={{ fontSize: '28px' }}>🏆</div>
      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Harvest</div>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>-4 light points</div>
      {scorePiles && scorePiles.map((pile, ring) => (
        <div key={ring} style={{ fontSize: '10px', color: pile.length > 0 ? '#388e3c' : '#bbb', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span>{RING_LABELS[ring]}</span>
          <span style={{ fontWeight: 'bold' }}>
            {pile.length > 0 ? `${pile[0]}pts` : '—'}
          </span>
          <span style={{ color: '#aaa' }}>({pile.length})</span>
        </div>
      ))}
    </div>
  );
};

export default CollectArea;
