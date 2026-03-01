import React from 'react';
import { useDrop } from 'react-dnd';
import ItemTypes from '../board/ItemTypes';
import { Piece } from '../board/Piece';
import { canMovePiece, movePiece } from '../board/Game';
import './available.css';

const Available = ({ piecesAvailable, lp, owner = 'p1', disabled = false }) => {
  const slots = Array(8).fill(null);

  return (
    <div className="available-container">
      {slots.map((_, index) => {
        const piece = Object.entries(piecesAvailable || {}).find(
          ([_, p]) => p.position === index
        );

        return (
          <AvailableSlot
            key={index}
            position={index}
            piece={piece ? { ...piece[1], id: piece[0] } : null}
            lp={lp}
            owner={owner}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
};

const AvailableSlot = ({ position, piece, lp, owner = 'p1', disabled = false }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => !disabled && canMovePiece(item.id, position, 0, 'available', lp),
    drop: (item) => movePiece(item.id, position, 0, 'available'),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`available-slot ${isOver ? (canDrop ? 'can-drop' : 'no-drop') : ''}`}
    >
      {piece && <Piece type={piece.type} id={piece.id} fillContainer={true} lp={lp} isFromInventory={false} owner={owner} disabled={disabled} />}
    </div>
  );
};

export default Available;
