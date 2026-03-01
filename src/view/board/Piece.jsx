import React from 'react'
import { DragPreviewImage, useDrag } from 'react-dnd'
import ItemTypes from './ItemTypes'
import { useGameState, COLOR_FILTERS } from './GameContext'

import seedImage from './images/seed.png'
import treeSmallImage from './images/tree-small.png'
import treeMediumImage from './images/tree-medium.png'
import treeLargeImage from './images/tree-large.png'

const pieceImages = {
  'seed': seedImage,
  'tree-small': treeSmallImage,
  'tree-medium': treeMediumImage,
  'tree-large': treeLargeImage,
}

// AI (p2) is always blue
const P2_FILTER = 'hue-rotate(150deg) saturate(1.4) brightness(1.05)';

export const Piece = ({ type, id, fillContainer = false, isFromInventory = false, owner = 'p1', disabled = false }) => {
  const { playerColor } = useGameState();
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.PIECE,
    item: { type: ItemTypes.PIECE, id },
    canDrag: () => !disabled,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })

  const pieceImage = pieceImages[type] || seedImage
  const filter = owner === 'p2' ? P2_FILTER : (COLOR_FILTERS[playerColor] || 'none')

  const imageStyle = fillContainer ? {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    zIndex: 2,
    position: 'absolute',
    borderRadius: '50%',
    filter,
  } : {
    width: '100%',
    zIndex: 2,
    position: 'absolute',
    borderRadius: '50%',
    filter,
  }

  return (
    <>
      <DragPreviewImage connect={preview} src={pieceImage} />
      <div
        ref={drag}
        style={{
          fontSize: 40,
          fontWeight: 'bold',
          cursor: disabled ? 'default' : 'move',
          color: 'black',
          opacity: isDragging ? 0.5 : 1,
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <img
          src={pieceImage}
          alt={type}
          style={imageStyle}
        />
      </div>
    </>
  )
}
