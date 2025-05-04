import React from 'react'
import { DragPreviewImage, useDrag } from 'react-dnd'
import ItemTypes from './ItemTypes'

// Import all piece images
import seedImage from './images/seed.png'
import treeSmallImage from './images/tree-small.png'
import treeMediumImage from './images/tree-medium.png'
import treeLargeImage from './images/tree-large.png'
import { pieceValues } from './pieceValues'

const pieceStyle = {
  fontSize: 40,
  fontWeight: 'bold',
  cursor: 'move',
  color: 'black'
}

const pieceImages = {
  'seed': seedImage,
  'tree-small': treeSmallImage,
  'tree-medium': treeMediumImage,
  'tree-large': treeLargeImage
}

const movementCosts = {
  'seed': 0,
  'tree-small': 1,
  'tree-medium': 2,
  'tree-large': 3
}

export const Piece = ({ type, id, fillContainer = false, isFromInventory = false }) => {
  
  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: ItemTypes.PIECE, id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })

  const pieceImage = pieceImages[type] || seedImage;

  // Determine image style based on whether it should fill the container
  const imageStyle = fillContainer ? {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    zIndex: 2,
    position: 'absolute'
  } : {
    width: '100%',
    zIndex: 2,
    position: 'absolute'
  };

  return (
    <>
      <DragPreviewImage connect={preview} src={pieceImage} />
      <div
        ref={drag}
        style={{
          ...pieceStyle,
          opacity: isDragging ? 0.5 : 1,
          position: 'relative',
          width: '100%',
          height: '100%'
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