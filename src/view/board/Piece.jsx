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

// Color rotation order for AI players — rotated so first pick avoids player's color
const AI_COLOR_ORDER = ['blue', 'orange', 'purple', 'green'];

function getAIFilter(playerColor, ownerIndex) {
  // ownerIndex: 0 = p2, 1 = p3, 2 = p4
  const available = AI_COLOR_ORDER.filter(c => c !== playerColor);
  const colorKey = available[ownerIndex % available.length];
  return COLOR_FILTERS[colorKey] || COLOR_FILTERS.blue;
}

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
  let filter;
  if (owner === 'p1') {
    filter = COLOR_FILTERS[playerColor] || 'none';
  } else {
    // p2 → index 0, p3 → index 1, p4 → index 2
    const ownerIndex = parseInt(owner.replace('p', ''), 10) - 2;
    filter = getAIFilter(playerColor, ownerIndex);
  }

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
