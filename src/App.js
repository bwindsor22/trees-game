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

const DIFFICULTY_LABELS = { easy: '🌱 Easy', medium: '🌳 Medium', hard: '🏆 Hard' };

const GameContent = () => {
  const {
    boardState,
    piecesInInventory,
    piecesAvailable,
    piecesInInventory2,
    piecesAvailable2,
    lp,
    lp2,
    score,
    score2,
    sunPosition,
    sunRevolutions,
    endPlayerTurn,
    lastLpGained,
    isSetupComplete,
    isGameOver,
    resetGame,
    currentPlayer,
    aiThinking,
    difficulty,
    setDifficulty,
  } = useGameState();

  const [showTutorial, setShowTutorial] = useState(true);

  const isHumanTurn = currentPlayer === 'p1' && !aiThinking && isSetupComplete;
  const finalP1 = score + Math.floor(lp / 3);
  const finalP2 = score2 + Math.floor(lp2 / 3);

  return (
    <Container>
      {showTutorial && <Tutorial onDone={() => setShowTutorial(false)} />}
      <Row className="mb-4">
        <Col md={8}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
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
          {/* Game over panel */}
          {isGameOver && (
            <div style={{
              background: '#e8f5e9', border: '2px solid #2e7d32', borderRadius: '10px',
              padding: '12px 16px', marginTop: '12px', marginBottom: '8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '6px' }}>
                {finalP1 > finalP2 ? '🎉 You Win!' : finalP1 < finalP2 ? '🤖 AI Wins!' : '🤝 Tie!'}
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>
                You: <strong>{score}</strong> pts + {Math.floor(lp / 3)} LP bonus = <strong>{finalP1}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                AI: <strong>{score2}</strong> pts + {Math.floor(lp2 / 3)} LP bonus = <strong>{finalP2}</strong>
              </div>
              <button
                onClick={resetGame}
                style={{
                  fontSize: '13px', padding: '5px 16px', borderRadius: '8px',
                  border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                }}
              >🌱 Play Again</button>
            </div>
          )}

          {/* Setup banner */}
          {!isSetupComplete && !isGameOver && (
            <div style={{
              background: '#e8f5e9', border: '1px solid #66bb6a', borderRadius: '8px',
              padding: '8px 12px', marginTop: '12px', marginBottom: '8px', fontSize: '13px', color: '#2e7d32',
            }}>
              {aiThinking
                ? '🤖 AI is placing its starting trees…'
                : <><strong>Setup:</strong> Place 2 small trees on the outer ring to begin.</>
              }
            </div>
          )}

          {/* Turn / sun controls */}
          <div style={{ marginTop: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button
                onClick={endPlayerTurn}
                disabled={!isHumanTurn || isGameOver}
                style={{
                  fontSize: '15px',
                  cursor: (!isHumanTurn || isGameOver) ? 'default' : 'pointer',
                  background: aiThinking ? '#f5f5f5' : '#fffde7',
                  border: '1px solid #f9a825',
                  borderRadius: '8px',
                  padding: '5px 16px',
                  fontWeight: 'bold',
                  opacity: (!isHumanTurn || isGameOver) ? 0.6 : 1,
                }}
              >
                {aiThinking ? '🤖 AI thinking…' : '☀️ End My Turn'}
              </button>
              <span style={{ fontSize: '13px', color: '#666' }}>
                Sun: {sunPosition + 1}/6 · Rev. {sunRevolutions + 1}/3
              </span>
            </div>

            {/* Difficulty selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  disabled={isSetupComplete}
                  style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '5px',
                    border: difficulty === key ? '2px solid #f9a825' : '1px solid #ddd',
                    background: difficulty === key ? '#fffde7' : '#fff',
                    cursor: isSetupComplete ? 'default' : 'pointer',
                    fontWeight: difficulty === key ? 'bold' : 'normal',
                    opacity: isSetupComplete ? 0.6 : 1,
                  }}
                  title={isSetupComplete ? 'Difficulty locked after setup' : `Set difficulty to ${key}`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Player 1 — human */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px',
              padding: '4px 8px', borderRadius: '6px',
              background: currentPlayer === 'p1' && !aiThinking ? '#e8f5e9' : 'transparent',
              border: currentPlayer === 'p1' && !aiThinking ? '1px solid #66bb6a' : '1px solid transparent',
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>🧑 You</span>
              <span style={{ fontSize: '14px' }}>
                <strong>{lp}</strong> light points
                {lastLpGained !== null && lastLpGained > 0 && (
                  <span style={{ color: '#388e3c', marginLeft: '4px' }}>+{lastLpGained}</span>
                )}
              </span>
              <span style={{ fontSize: '14px' }}>🏆 <strong>{score}</strong> pts</span>
            </div>
            <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Available</h5>
            <Available piecesAvailable={piecesAvailable} lp={lp} owner="p1" disabled={aiThinking || currentPlayer !== 'p1'} />
            <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Store</h5>
            <Inventory piecesInInventory={piecesInInventory} lp={lp} owner="p1" disabled={aiThinking || currentPlayer !== 'p1'} />
          </div>

          {/* Player 2 — AI */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px',
              padding: '4px 8px', borderRadius: '6px',
              background: aiThinking ? '#e3f2fd' : 'transparent',
              border: aiThinking ? '1px solid #42a5f5' : '1px solid transparent',
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', filter: 'hue-rotate(150deg)' }}>🤖 AI</span>
              <span style={{ fontSize: '14px' }}>
                <strong>{lp2}</strong> light points
              </span>
              <span style={{ fontSize: '14px' }}>🏆 <strong>{score2}</strong> pts</span>
            </div>
            <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Available</h5>
            <Available piecesAvailable={piecesAvailable2} lp={lp2} owner="p2" disabled={true} />
            <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Store</h5>
            <Inventory piecesInInventory={piecesInInventory2} lp={lp2} owner="p2" disabled={true} />
          </div>
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
