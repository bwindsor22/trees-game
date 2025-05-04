import React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import Board from "./view/board/Board";
import Inventory from "./view/inventory/index";
import Available from "./view/available/index";
import { GameProvider, useGameState } from "./view/board/GameContext";
import { Container, Row, Col } from "react-bootstrap";

const GameContent = () => {
  const { boardState, piecesInInventory, piecesAvailable, sunPoints } =
    useGameState();

  return (
    <Container>
      <Row className="mb-4">
        <Col md={8}>
          <h2>Game Board</h2>
          <Board boardState={boardState} />
        </Col>
        <Col md={4}>
          <h2 className="mt-4">Available Pieces</h2>
          <Available piecesAvailable={piecesAvailable} />
          <h2>Store</h2>
          <Inventory
            piecesInInventory={piecesInInventory}
            sunPoints={sunPoints}
          />
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
      </GameProvider>
    </DndProvider>
  );
};

export default App;
