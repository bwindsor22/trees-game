import React from 'react'
import { DragPreviewImage, useDrag } from 'react-dnd'
import ItemTypes from './ItemTypes'
import seedImage from './seed.png'
import treePurple from './tree-purple.png'
const knightStyle = {
  fontSize: 40,
  fontWeight: 'bold',
  cursor: 'move',
  color: 'black'
}
export const Knight = () => {
  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: ItemTypes.KNIGHT },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })
  return (
    <>
      <DragPreviewImage connect={preview} src={seedImage} />
      <div
        ref={drag}
        style={{
          ...knightStyle,
          opacity: isDragging ? 0.5 : 1,
          position:'relative',
          width: '100%',
          height: '100%'
        }}
      >
        <img src={treePurple} style={{width : '100%', zIndex: 1, position: 'absolute'}}/>
      </div>
    </>
  )
}
