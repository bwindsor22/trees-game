import React from 'react'
import { BoardSquare } from './BoardSquare'
import { Knight } from './Knight'
import leaf1 from './1-leaf.jpg'
import leaf2 from './2-leaf.jpg'
import leaf3 from './3-leaf.jpg'
import leaf4 from './4-leaf.jpg'


const boardStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexWrap: 'wrap',
}

const offset0 = {
  paddingLeft: '0.0%'
}

const offset1 = {
  paddingLeft: '8.16%'
}

const offset2 = {
  paddingLeft: '14.32%'
}

const offset3 = {
  paddingLeft: '21.48%'
}

const squareStyle = {
  marginBottom: '-3px',
  marginLeft: '-1px',

}
/**
 * The chessboard component
 * @param props The react props
 */


const Board = ({ knightPosition: [knightX, knightY] }) => {
  function getRowType0(key, ycoord) {
    const row = []
    row.push(renderSquare(key + 0,-3, ycoord, leaf1));
    row.push(renderSquare(key + 1, -1, ycoord, leaf1));
    row.push(renderSquare(key + 2, 1, ycoord, leaf1));
    row.push(renderSquare(key + 3, 3, ycoord, leaf1));

    return row;
  }

  function getRowType1(key, ycoord) {
    const row = [];
    row.push(renderSquare(key + 0, -4, ycoord, leaf1));
    row.push(renderSquare(key + 1, -2, ycoord, leaf2));
    row.push(renderSquare(key + 2, 0, ycoord, leaf2));
    row.push(renderSquare(key + 3, 2, ycoord, leaf2));
    row.push(renderSquare(key + 4, 4, ycoord, leaf1));
    return row;
  }

  function getRowType2(key, ycoord) {
    const row = [];
    row.push(renderSquare(key + 0, -5, ycoord, leaf1));
    row.push(renderSquare(key + 1, -3, ycoord, leaf2));
    row.push(renderSquare(key + 2, -1, ycoord, leaf3));
    row.push(renderSquare(key + 3,1, ycoord,  leaf3));
    row.push(renderSquare(key + 4, 3, ycoord, leaf2));
    row.push(renderSquare(key + 5, 5, ycoord, leaf1));
    return row;
  }
  function getRowType3(key, ycoord) {
    const row = [];
    row.push(renderSquare(key + 0, -6, ycoord, leaf1));
    row.push(renderSquare(key + 1, -4, ycoord, leaf2));
    row.push(renderSquare(key + 2, -2, ycoord, leaf3));
    row.push(renderSquare(key + 3, 0, ycoord, leaf4));
    row.push(renderSquare(key + 4, 2, ycoord, leaf3));
    row.push(renderSquare(key + 5, 4, ycoord, leaf2));
    row.push(renderSquare(key + 6, 6, ycoord, leaf1));
    return row;
  }


  function getInitialBoard(){
    /* first row */
    const allRows = [];

    allRows.push(getRowType0(0, 3));
    allRows.push(getRowType1(10, 2));
    allRows.push(getRowType2(20, 1));
    allRows.push(getRowType3(30, 0));
    allRows.push(getRowType2(40, -1));
    allRows.push(getRowType1(50, -2));
    allRows.push(getRowType0(60, -3));
    return allRows;
  }

    function renderSquare(i, x, y, bkgd) {
    return (
      <div key={i} style={squareStyle}>
        <BoardSquare x={x} y={y} bkgd={bkgd}>
          {renderPiece(x, y)}
        </BoardSquare>
      </div>
    )
  }
  function renderRow(squares, style) {
    return <div style={{...boardStyle, ...style}}>
      {squares}
    </div>
  }
  function renderPiece(x, y) {
    const isKnightHere = x === knightX && y === knightY
    return isKnightHere ? <Knight /> : null
  }
  const boardDisplay = getInitialBoard();
  return <div>
    {/*{knightX} '-' {knightY}*/}
    <div style={boardStyle}>
      {renderRow(boardDisplay[0], offset3)}
      {renderRow(boardDisplay[1], offset2)}
      {renderRow(boardDisplay[2], offset1)}
      {renderRow(boardDisplay[3], offset0)}
      {renderRow(boardDisplay[4], offset1)}
      {renderRow(boardDisplay[5], offset2)}
      {renderRow(boardDisplay[6], offset3)}
    </div>
  </div>
}
export default Board
