import React from 'react'
const squareStyle = {
  width: '100%',
  height: '100%',
}
export const Square = ({ black, bkgd, children }) => {
  const backgroundColor = black ? 'white' : 'white'
  // const color = black ? 'white' : 'black'
  const color = black ? 'white' : 'white'
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
            <img src={bkgd} style={{width: '100%'}}/>
        </div>
    </div>
  )
}
