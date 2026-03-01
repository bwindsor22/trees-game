import React from 'react';
import { useDrop } from 'react-dnd';
import ItemTypes from './ItemTypes';
import { canMovePiece, movePiece } from './Game';
import { useGameState } from './GameContext';

// Ring labels matching SCORE_PILES_INIT order: 0=center(4-leaf), 3=outer(1-leaf)
const RING_LABELS = ['🍃🍃🍃🍃', '🍃🍃🍃', '🍃🍃', '🍃'];

const CollectArea = () => {
  const { lp, scorePiles } = useGameState();

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => canMovePiece(item.id, 0, 0, 'inventory', lp),
    drop: (item) => movePiece(item.id, 0, 0, 'inventory'),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  const borderColor = isOver ? (canDrop ? '#2e7d32' : '#c62828') : '#bdbdbd';
  const bg = isOver && canDrop ? 'rgba(46,125,50,0.10)' : 'rgba(255,255,255,0.6)';

  return (
    <div
      ref={drop}
      style={{
        width: '150px',
        minHeight: '160px',
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
