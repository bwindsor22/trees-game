import React from 'react'
import Blank from './blank'
import SunPoints from './SunPoints'

const seedWidth = 55;
const smallWidth = 70;
const medWidth = 84;
const largeWidth = 98;

const rows = [
    [
        { val: 1, width: seedWidth },
        { val: 1, width: seedWidth },
        { val: 1, width: seedWidth },
        { val: 1, width: seedWidth },
    ],
    [
        { val: 2, width: smallWidth },
        { val: 2, width: smallWidth },
        { val: 3, width: smallWidth },
        { val: 3, width: smallWidth },
    ],
    [
        { val: 3, width: medWidth },
        { val: 3, width: medWidth },
        { val: 4, width: medWidth },
    ],
    [
        { val: 4, width: largeWidth },
        { val: 5, width: largeWidth },
    ],
]

const rowStyle = {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    marginBottom: '6px',
}

const Inventory = ({ piecesInInventory, sunPoints }) => {
    const getPieceForPosition = (position) => {
        for (const pieceId in piecesInInventory) {
            if (piecesInInventory[pieceId].position === position) {
                return { ...piecesInInventory[pieceId], id: pieceId }
            }
        }
        return null
    }

    let inventoryIndex = 0

    return (
        <div>
            <SunPoints />
            {rows.map((row, rowIdx) => (
                <div key={rowIdx} style={rowStyle}>
                    {row.map((r) => {
                        const pos = inventoryIndex++
                        const piece = getPieceForPosition(pos)
                        return (
                            <Blank
                                key={pos}
                                val={r.val}
                                width={r.width}
                                inventoryPosition={pos}
                                inventoryPiece={piece}
                                pieceId={piece ? piece.id : null}
                                sunPoints={sunPoints}
                            />
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
export default Inventory
