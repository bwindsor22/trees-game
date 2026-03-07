import React from 'react'
import { BoardSquare } from './BoardSquare'
import { Piece } from './Piece'
import { useGameState } from './GameContext'
import leaf1 from './images/1-leaf.jpg'
import leaf2 from './images/2-leaf.jpg'
import leaf3 from './images/3-leaf.jpg'
import leaf4 from './images/4-leaf.jpg'

const boardStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexWrap: 'wrap',
}

// Each cell is 1/7 of board width. Rows are offset using a spacer element
// so that 100% always refers to board width (not a padded content-box).
const squareStyle = {
  marginBottom: '-3px',
  flex: 'none',
  width: 'calc(100% / 7)',
  aspectRatio: '1 / 1',
}

// Sun is a semicircle sitting exactly at one of the 6 hex vertices, facing outward.
// Position 0 = upper-right vertex, advancing clockwise.
// Each vertex is at a specific corner of the hex board outline:
//   0: top-right of top row    (78.5%, 0%)
//   1: right of middle row     (100%, 50%)
//   2: bottom-right of bot row (78.5%, 100%)
//   3: bottom-left of bot row  (21.5%, 100%)
//   4: left of middle row      (0%,   50%)
//   5: top-left of top row     (21.5%, 0%)
//
// clip-path cuts through the circle center along the outward diagonal,
// showing only the semicircle facing away from the board.

const SUN_SIZE = 140
const SUN_HALF = SUN_SIZE / 2

// Position 0 = upper-right (NE), advances clockwise by 60° each step.
// Base angle 45° = NE direction. Cumulative angle ensures transitions always go clockwise.
const SUN_CONFIG = [
  { style: { top: -SUN_HALF, left: `calc(78.5% - ${SUN_HALF}px)` } },           // 0: NE
  { style: { top: `calc(50% - ${SUN_HALF}px)`, left: `calc(100% - ${SUN_HALF}px)` } }, // 1: E
  { style: { top: `calc(100% - ${SUN_HALF}px)`, left: `calc(78.5% - ${SUN_HALF}px)` } }, // 2: SE
  { style: { top: `calc(100% - ${SUN_HALF}px)`, left: `calc(21.5% - ${SUN_HALF}px)` } }, // 3: SW
  { style: { top: `calc(50% - ${SUN_HALF}px)`, left: -SUN_HALF } },              // 4: W
  { style: { top: -SUN_HALF, left: `calc(21.5% - ${SUN_HALF}px)` } },            // 5: NW
]

// angle is cumulative degrees (grows monotonically so transitions always go clockwise)
const SunVisual = ({ position, angle }) => {
  const { style } = SUN_CONFIG[position]
  return (
    <div style={{
      position: 'absolute',
      width: SUN_SIZE,
      height: SUN_SIZE,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 50%, #fffde7 0%, #ffeb3b 35%, #f9a825 65%, #e65100 100%)',
      filter: 'drop-shadow(0 0 18px rgba(255, 200, 0, 0.85))',
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)',
      transform: `rotate(${angle}deg)`,
      zIndex: 10,
      pointerEvents: 'none',
      transition: 'top 0.5s ease-in-out, left 0.5s ease-in-out, transform 0.5s ease-in-out',
      ...style,
    }} />
  )
}

const Board = ({ boardState }) => {
  const { sunPosition, sunRevolutions, visualShadowedSquares, lastTurnScores } = useGameState()
  // Cumulative angle grows monotonically so CSS transition always rotates clockwise
  const sunAngle = 45 + (sunRevolutions * 6 + sunPosition) * 60

  function renderSquare(i, x, y, bkgd) {
    const boardKey = `${x},${y}`
    const piece = boardState[boardKey]
    const isShadowed = visualShadowedSquares.has(boardKey)
    const lpScore = lastTurnScores[boardKey]

    return (
      <div key={i} style={squareStyle}>
        <BoardSquare x={x} y={y} bkgd={bkgd} isShadowed={isShadowed}>
          {piece && <Piece type={piece.type} id={piece.id} owner={piece.owner || 'p1'} />}
          {lpScore > 0 && (
            <div style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              background: '#388e3c',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 6,
              pointerEvents: 'none',
            }}>
              +{lpScore}
            </div>
          )}
        </BoardSquare>
      </div>
    )
  }

  function getRowType0(key, ycoord) {
    return [
      renderSquare(key + 0, -3, ycoord, leaf1),
      renderSquare(key + 1, -1, ycoord, leaf1),
      renderSquare(key + 2,  1, ycoord, leaf1),
      renderSquare(key + 3,  3, ycoord, leaf1),
    ]
  }

  function getRowType1(key, ycoord) {
    return [
      renderSquare(key + 0, -4, ycoord, leaf1),
      renderSquare(key + 1, -2, ycoord, leaf2),
      renderSquare(key + 2,  0, ycoord, leaf2),
      renderSquare(key + 3,  2, ycoord, leaf2),
      renderSquare(key + 4,  4, ycoord, leaf1),
    ]
  }

  function getRowType2(key, ycoord) {
    return [
      renderSquare(key + 0, -5, ycoord, leaf1),
      renderSquare(key + 1, -3, ycoord, leaf2),
      renderSquare(key + 2, -1, ycoord, leaf3),
      renderSquare(key + 3,  1, ycoord, leaf3),
      renderSquare(key + 4,  3, ycoord, leaf2),
      renderSquare(key + 5,  5, ycoord, leaf1),
    ]
  }

  function getRowType3(key, ycoord) {
    return [
      renderSquare(key + 0, -6, ycoord, leaf1),
      renderSquare(key + 1, -4, ycoord, leaf2),
      renderSquare(key + 2, -2, ycoord, leaf3),
      renderSquare(key + 3,  0, ycoord, leaf4),
      renderSquare(key + 4,  2, ycoord, leaf3),
      renderSquare(key + 5,  4, ycoord, leaf2),
      renderSquare(key + 6,  6, ycoord, leaf1),
    ]
  }

  // spacerWidth is a CSS string like 'calc(100% / 14)'. 100% = board width.
  function renderRow(squares, spacerWidth) {
    return (
      <div style={{ ...boardStyle, flexWrap: 'nowrap' }}>
        {spacerWidth && <div style={{ flex: 'none', width: spacerWidth }} />}
        {squares}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <SunVisual position={sunPosition} angle={sunAngle} />
      <div style={boardStyle}>
        {renderRow(getRowType0(0,   3), 'calc(3 * 100% / 14)')}
        {renderRow(getRowType1(10,  2), 'calc(100% / 7)')}
        {renderRow(getRowType2(20,  1), 'calc(100% / 14)')}
        {renderRow(getRowType3(30,  0), null)}
        {renderRow(getRowType2(40, -1), 'calc(100% / 14)')}
        {renderRow(getRowType1(50, -2), 'calc(100% / 7)')}
        {renderRow(getRowType0(60, -3), 'calc(3 * 100% / 14)')}
      </div>
    </div>
  )
}

export default Board
