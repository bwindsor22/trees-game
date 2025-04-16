import React from 'react'
import Blank from './blank'
import { Container, Col, Row } from "react-bootstrap"

const seedWidth = 60;
const smallWidth = 90;
const medWidth = 100;
const largeWidth = 120;

const row1 = [
    {val: 1, width: seedWidth, type: 'seed'},
    {val: 1, width: seedWidth, type: 'seed'},
    {val: 1, width: seedWidth, type: 'seed'},
    {val: 1, width: seedWidth, type: 'seed'},
]
const row2 = [
    {val: 2, width: smallWidth, type: 'tree-small'},
    {val: 2, width: smallWidth, type: 'tree-small'},
    {val: 3, width: smallWidth, type: 'tree-small'},
    {val: 3, width: smallWidth, type: 'tree-small'},
]
const row3 = [
    {val: 3, width: medWidth, type: 'tree-medium'},
    {val: 3, width: medWidth, type: 'tree-medium'},
    {val: 4, width: medWidth, type: 'tree-medium'},
]
const row4 = [
    {val: 4, width: largeWidth, type: 'tree-large'},
    {val: 5, width: largeWidth, type: 'tree-large'},
]

export default ({ piecesInInventory }) => {
    // Find piece for a specific inventory position
    const getPieceForPosition = (position) => {
        for (const pieceId in piecesInInventory) {
            if (piecesInInventory[pieceId].position === position) {
                return {
                    ...piecesInInventory[pieceId],
                    id: pieceId
                };
            }
        }
        return null;
    };
    
    let inventoryIndex = 0;
    
    return <Container>
        <Row>
            {row1.map((r, i) => {
                const currentIndex = inventoryIndex++;
                const piece = getPieceForPosition(currentIndex);
                return <Col key={`inv-r1-${i}`}>
                    <Blank 
                        val={r.val} 
                        width={r.width} 
                        inventoryPosition={currentIndex}
                        inventoryPiece={piece}
                        pieceId={piece ? piece.id : null}
                    />
                </Col>
            })}
        </Row>
        <Row>
            {row2.map((r, i) => {
                const currentIndex = inventoryIndex++;
                const piece = getPieceForPosition(currentIndex);
                return <Col key={`inv-r2-${i}`}>
                    <Blank 
                        val={r.val} 
                        width={r.width}
                        inventoryPosition={currentIndex}
                        inventoryPiece={piece}
                        pieceId={piece ? piece.id : null}
                    />
                </Col>
            })}
        </Row>
        <Row>
            {row3.map((r, i) => {
                const currentIndex = inventoryIndex++;
                const piece = getPieceForPosition(currentIndex);
                return <Col key={`inv-r3-${i}`}>
                    <Blank 
                        val={r.val} 
                        width={r.width}
                        inventoryPosition={currentIndex}
                        inventoryPiece={piece}
                        pieceId={piece ? piece.id : null}
                    />
                </Col>
            })}
        </Row>
        <Row>
            {row4.map((r, i) => {
                const currentIndex = inventoryIndex++;
                const piece = getPieceForPosition(currentIndex);
                return <Col key={`inv-r4-${i}`}>
                    <Blank 
                        val={r.val} 
                        width={r.width}
                        inventoryPosition={currentIndex}
                        inventoryPiece={piece}
                        pieceId={piece ? piece.id : null}
                    />
                </Col>
            })}
        </Row>
        <Row>Inventory::</Row>
        <Row>{JSON.stringify(piecesInInventory)}</Row>
    </Container>
}