import React from 'react'
import './inventory.css'
import blank from './blank.png'
import { useDrop } from "react-dnd"
import ItemTypes from "../board/ItemTypes"
import { canMovePiece, movePiece } from "../board/Game"
import Overlay from "../board/Overlay"
import { Piece } from "../board/Piece"

export default (props) => {
    const { val, width, inventoryPosition, inventoryPiece, sunPoints } = props
    
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ItemTypes.PIECE,
        canDrop: (item) => canMovePiece(item.id, inventoryPosition, 0, 'inventory'),
        drop: (item) => movePiece(item.id, inventoryPosition, 0, 'inventory'),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    })
    
    return (
        <div 
            ref={drop}
            style={{
                height: width + 25 + 'px',
                position: 'relative'
            }}
        >
            <div className="circle">{val}</div>
            <img src={blank} style={{width: width + 'px', position: "absolute", marginTop: '-15px'}}/>
            {inventoryPiece && (
                <div style={{
                    position: 'absolute', 
                    top: '10px', 
                    left: '0',
                    width: width + 'px',
                    height: width + 'px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <Piece type={inventoryPiece.type} id={props.pieceId} fillContainer={true} sunPoints={sunPoints} />
                </div>
            )}
            {isOver && <Overlay color={canDrop ? "green" : "red"} />}
        </div>
    )
}