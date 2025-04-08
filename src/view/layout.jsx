import React, { useState, useEffect } from 'react'
import Board from './board/Board'
import Inventory from './inventory'
import { observe } from './board/Game'
import {Row, Col, Container} from "react-bootstrap";
const containerStyle = {
  width: 700,
  height: 700,
  border: '1px solid gray',
}

const ChessboardTutorialApp = () => {
  const [knightPos, setKnightPos] = useState([0, 0])
  // the observe function will return an unsubscribe callback
  useEffect(() => observe((newPos) => setKnightPos(newPos)))
  return (
      <Container fluid>
        <Row>
          <Col xs={6}>
            <div style={containerStyle}>
              <Board knightPosition={knightPos} />
            </div>
          </Col>
          <Col xs={4}>
            <Inventory />
          </Col>
          <Col xs={2}>hello</Col>
        </Row>
        <Row>
          purchase
        </Row>
      </Container>
  )
}
export default ChessboardTutorialApp
