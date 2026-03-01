import React, { useState } from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import Board from "./view/board/Board";
import Inventory from "./view/inventory/index";
import Available from "./view/available/index";
import CollectArea from "./view/board/CollectArea";
import Tutorial from "./view/Tutorial";
import { GameProvider, useGameState } from "./view/board/GameContext";
import { Container, Row, Col } from "react-bootstrap";

const GameContent = () => {
  const {
    boardState,
    piecesInInventory,
    piecesAvailable,
    lp,
    score,
    sunPosition,
    sunRevolutions,
    advanceTurn,
    lastLpGained,
    isSetupComplete,
    isGameOver,
    resetGame,
  } = useGameState();

  const [showTutorial, setShowTutorial] = useState(true);

  return (
    <Container>
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
      <Row className="mb-4">
        <Col md={8}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0 }}>Game Board</h2>
            <button
              onClick={() => setShowTutorial(v => !v)}
              style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', color: '#666' }}
            >? How to Play</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CollectArea />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Board boardState={boardState} />
            </div>
          </div>
        </Col>
        <Col md={4}>
          {/* Setup phase banner */}
          {!isSetupComplete && (
            <div style={{
              background: '#e8f5e9',
              border: '1px solid #66bb6a',
              borderRadius: '8px',
              padding: '8px 12px',
              marginTop: '12px',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#2e7d32',
            }}>
              <strong>Setup:</strong> Place 2 small trees on the outer ring to begin.
            </div>
          )}

          {/* Game over panel */}
          {isGameOver && (
            <div style={{
              background: '#e8f5e9',
              border: '2px solid #2e7d32',
              borderRadius: '10px',
              padding: '12px 16px',
              marginTop: '12px',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '6px' }}>
                🎉 Game Over!
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                Scoring tokens: <strong>{score}</strong> pts
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                Light points bonus: <strong>{Math.floor(lp / 3)}</strong> pts ({lp} ÷ 3)
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1b5e20', borderTop: '1px solid #a5d6a7', paddingTop: '6px', marginTop: '6px' }}>
                Total: {score + Math.floor(lp / 3)} pts
              </div>
              <button
                onClick={resetGame}
                style={{
                  marginTop: '10px', fontSize: '13px', padding: '5px 16px', borderRadius: '8px',
                  border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                }}
              >🌱 Play Again</button>
            </div>
          )}

          {/* Turn controls */}
          <div style={{ marginTop: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button
                onClick={advanceTurn}
                disabled={isGameOver}
                style={{
                  fontSize: '15px',
                  cursor: isGameOver ? 'default' : 'pointer',
                  background: '#fffde7',
                  border: '1px solid #f9a825',
                  borderRadius: '8px',
                  padding: '5px 16px',
                  fontWeight: 'bold',
                  opacity: isGameOver ? 0.5 : 1,
                }}
              >
                ☀️ Next Turn
              </button>
              <span style={{ fontSize: '13px', color: '#666' }}>
                Sun: {sunPosition + 1}/6 · Rev. {sunRevolutions + 1}/3
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
              <span>
                <strong>{lp}</strong> light points
                {lastLpGained !== null && lastLpGained > 0 && (
                  <span style={{ color: '#388e3c', marginLeft: '4px' }}>+{lastLpGained}</span>
                )}
              </span>
              <span>
                <span style={{ fontSize: '16px' }}>🏆</span>
                <strong> {score}</strong> pts
              </span>
            </div>
          </div>

          <h2>Available Pieces</h2>
          <Available piecesAvailable={piecesAvailable} lp={lp} />
          <h2>Store</h2>
          <Inventory
            piecesInInventory={piecesInInventory}
            lp={lp}
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
