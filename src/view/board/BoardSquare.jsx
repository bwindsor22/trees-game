import React from 'react'
import { useDrop } from 'react-dnd'
import { Square } from './Square'
import { canMoveKnight, moveKnight } from './Game'
import ItemTypes from './ItemTypes'
import Overlay from './Overlay'
export const BoardSquare = ({ x, y, bkgd, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.KNIGHT,
    canDrop: () => canMoveKnight(x, y),
    drop: () => moveKnight(x, y),
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
      {isOver && !canDrop && <Overlay color="green" />}
      {/*{!isOver && canDrop && <Overlay color="yellow" />}*/}
      {/*{isOver && canDrop && <Overlay color="green" />}*/}
    </div>
  )
}
