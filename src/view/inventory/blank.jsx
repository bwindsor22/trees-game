import React from 'react'
import './inventory.css'
import blank from './blank.png'
import {useDrop} from "react-dnd";
import ItemTypes from "../board/ItemTypes";
import {canMoveKnight, moveKnight} from "../board/Game";
import Overlay from "../board/Overlay";


export default (props) => {
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ItemTypes.KNIGHT,
        canDrop: () => canMoveKnight(0, 0),
        drop: () => moveKnight(0, 0),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    })
    return <div style={{height: props.width + 25 + 'px'}}>
        <div className="circle">{props.val}</div>
        <img src={blank} style={{width: props.width + 'px', position: "absolute", marginTop: '-15px'}}/>
        {isOver && <Overlay color="green" />}
    </div>
}