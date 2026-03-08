import React from 'react'
import { useDrop } from 'react-dnd'
import { Square } from './Square'
import { canMovePiece, movePiece, getDropHint } from './Game'
import ItemTypes from './ItemTypes'
import Overlay from './Overlay'
import { useGameState } from './GameContext'

export const BoardSquare = ({ x, y, bkgd, isShadowed, children }) => {
  const { lp, aiThinking, isMobile, selectedPiece, setSelectedPiece } = useGameState();

  const [{ isOver, canDrop, dragItem }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => !aiThinking && canMovePiece(item.id, x, y, 'board', lp),
    drop: (item) => movePiece(item.id, x, y, 'board'),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
      dragItem: monitor.getItem(),
    }),
  })

  const hint = (isOver && !canDrop && dragItem)
    ? getDropHint(dragItem.id, x, y, lp)
    : null;

  const canTapDrop = isMobile && !!selectedPiece && !aiThinking && canMovePiece(selectedPiece, x, y, 'board', lp);

  const handleTap = isMobile ? () => {
    if (selectedPiece && !aiThinking && canMovePiece(selectedPiece, x, y, 'board', lp)) {
      movePiece(selectedPiece, x, y, 'board');
    }
    setSelectedPiece(null);
  } : undefined;

  const black = (x + y) % 2 === 1

  return (
    <div
      ref={drop}
      data-board-x={x}
      data-board-y={y}
      onClick={handleTap}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: canTapDrop ? 'pointer' : undefined,
      }}
    >
      <Square black={black} bkgd={bkgd}>{children}</Square>
      {isShadowed && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(10, 10, 60, 0.38)',
          zIndex: 4,
          pointerEvents: 'none',
        }} />
      )}
      {canTapDrop && <Overlay color="lightgreen" />}
      {isOver && !canDrop && <Overlay color="red" />}
      {!isOver && canDrop && <Overlay color="lightgreen" />}
      {isOver && canDrop && <Overlay color="darkgreen" />}
      {hint && (
        <div style={{
          position: 'absolute',
          bottom: '105%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(60,20,0,0.88)',
          color: '#fff',
          borderRadius: '5px',
          padding: '4px 8px',
          fontSize: '11px',
          whiteSpace: 'normal',
          zIndex: 20,
          pointerEvents: 'none',
          maxWidth: '200px',
          textAlign: 'center',
        }}>
          {hint}
        </div>
      )}
    </div>
  )
}
