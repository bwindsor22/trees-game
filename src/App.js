import React from 'react';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import Board from './view/board/Board';
import Inventory from './view/inventory/index';
import { GameProvider, useGameState } from './view/board/GameContext';
import { Container, Row, Col } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GameContent = () => {
  const { boardState, piecesInInventory } = useGameState();
  
  return (
    <Container>
      <Row>
        <Col md={8}>
          <Board boardState={boardState} />
        </Col>
        <Col md={4}>
          <Inventory piecesInInventory={piecesInInventory} />
        </Col>
      </Row>
    </Container>
  );
};

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <GameProvider>
        <GameContent />
        <ToastContainer position="top-right" autoClose={3000} />
      </GameProvider>
    </DndProvider>
  );
};

export default App;