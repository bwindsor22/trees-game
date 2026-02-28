import React from 'react'
import './inventory.css'
import blank from './blank.png'
import { useDrop } from "react-dnd"
import ItemTypes from "../board/ItemTypes"
import { canMovePiece, movePiece } from "../board/Game"
import Overlay from "../board/Overlay"
import { Piece } from "../board/Piece"

const Blank = (props) => {
    const { val, width, inventoryPosition, inventoryPiece, sunPoints } = props

    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ItemTypes.PIECE,
        canDrop: (item) => canMovePiece(item.id, inventoryPosition, 0, 'inventory', sunPoints),
        drop: (item) => movePiece(item.id, inventoryPosition, 0, 'inventory'),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    })

    return (
        <div ref={drop} style={{ position: 'relative', paddingTop: '14px', paddingLeft: '14px', display: 'inline-block' }}>
            {/* Slot area */}
            <div style={{ position: 'relative', width: width + 'px', height: width + 'px' }}>
                <img src={blank} alt="" style={{ width: '100%' }} />
                {inventoryPiece && (
                    <div style={{ position: 'absolute', inset: 0 }}>
                        <Piece type={inventoryPiece.type} id={props.pieceId} fillContainer={true} sunPoints={sunPoints} isFromInventory={true} />
                    </div>
                )}
            </div>
            {/* Price badge — top-left corner, above and slightly left of the slot */}
            <div className="circle" style={{ position: 'absolute', top: 0, left: 0 }}>{val}</div>
            {isOver && <Overlay color={canDrop ? "green" : "red"} />}
        </div>
    )
}
export default Blank
