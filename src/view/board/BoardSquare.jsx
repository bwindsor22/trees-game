import React from 'react'
import { useDrop } from 'react-dnd'
import { Square } from './Square'
import { canMovePiece, movePiece } from './Game'
import ItemTypes from './ItemTypes'
import Overlay from './Overlay'

export const BoardSquare = ({ x, y, bkgd, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.PIECE,
    canDrop: (item) => canMovePiece(item.id, x, y, 'board'),
    drop: (item) => movePiece(item.id, x, y, 'board'),
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