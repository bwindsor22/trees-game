
import React from 'react';
import { useDrop } from 'react-dnd';
import ItemTypes from '../board/ItemTypes';
import { Piece } from '../board/Piece';
import { canMovePiece, movePiece } from '../board/Game';
import './available.css';

const Available = ({ piecesAvailable }) => {
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
          />
        );
      })}
    </div>
  );
};

const AvailableSlot = ({ position, piece }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => canMovePiece(item.id, position, 0, 'available'),
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
      {piece && <Piece type={piece.type} id={piece.id} fillContainer={true} />}
    </div>
  );
};

export default Available;
