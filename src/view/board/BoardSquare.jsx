import React from 'react'
import { useDrop } from 'react-dnd'
import { Square } from './Square'
import { canMovePiece, movePiece, getPieceCost } from './Game'
import ItemTypes from './ItemTypes'
import Overlay from './Overlay'
import { useGameState } from './GameContext'
import { toast } from 'react-toastify'

export const BoardSquare = ({ x, y, bkgd, children }) => {
  const { sunPoints, setSunPoints } = useGameState();
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => {
      const canMove = canMovePiece(item.id, x, y, 'board', sunPoints);
      if (!canMove && item.type) {
        const cost = getPieceCost(item.type);
        if (sunPoints < cost) {
          toast.warning(`Not enough sun points! You need ${cost} points to place this tree.`);
        }
      }
      return canMove;
    },
    drop: (item) => {
      movePiece(item.id, x, y, 'board');
      if (item.type) {
        setSunPoints(prev => prev - getPieceCost(item.type));
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  })
  
  const black = (x + y) % 2 === 1
  
  return (
    <div
      ref={drop}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <Square black={black} bkgd={bkgd}>{children}</Square>
      {isOver && !canDrop && <Overlay color="red" />}
      {!isOver && canDrop && <Overlay color="lightgreen" />}
      {isOver && canDrop && <Overlay color="darkgreen" />}
    </div>
  )
}