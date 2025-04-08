import React from 'react'
import leaf from './1-leaf.jpg.jpg';
const squareStyle = {
  width: '100%',
  height: '100%',
}
export const Square1L = ({ black, children }) => {
  const backgroundColor = black ? 'black' : 'white'
  const color = black ? 'white' : 'black'
  return (
    <div
      style={{
        ...squareStyle,
        color,
        backgroundColor,
      }}
    >
        <div>
            {children}
            <img src={leaf} style={{width: '100%'}}/>
        </div>
    </div>
  )
}
