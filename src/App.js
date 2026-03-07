import React, { useState } from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import Board from "./view/board/Board";
import Inventory from "./view/inventory/index";
import Available from "./view/available/index";
import CollectArea from "./view/board/CollectArea";
import Tutorial from "./view/Tutorial";
import StartScreen from "./view/StartScreen";
import { GameProvider, useGameState, COLOR_FILTERS } from "./view/board/GameContext";
import { Container, Row, Col } from "react-bootstrap";

// Color swatch shown next to the player label
const COLOR_SWATCHES = {
  green:  '#388e3c',
  blue:   '#1565c0',
  purple: '#6a1b9a',
  orange: '#e65100',
};

const GameContent = ({ playerColor }) => {
  const {
    boardState,
    piecesInInventory,
    piecesAvailable,
    inventoriesAll,
    availablesAll,
    lpAll,
    scoreAll,
    aiPlayers,
    lp,
    score,
    sunPosition,
    sunRevolutions,
    endPlayerTurn,
    lastLpGained,
    isSetupComplete,
    isGameOver,
    isFinalRound,
    resetGame,
    currentPlayer,
    aiThinking,
    difficulty,
    lastLpGainedAll,
    playerOrder,
    firstPlayer,
  } = useGameState();

  const [showTutorial, setShowTutorial] = useState(true);

  const isHumanTurn = currentPlayer === 'p1' && !aiThinking && isSetupComplete;
  const finalScores = Object.fromEntries(
    Object.keys(lpAll).map(p => [p, (scoreAll[p] || 0) + Math.floor((lpAll[p] || 0) / 3)])
  );
  const finalP1 = finalScores.p1 || 0;
  const swatch = COLOR_SWATCHES[playerColor] || COLOR_SWATCHES.green;

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
                {finalP1 >= Math.max(...Object.values(finalScores)) ? '🎉 You Win!' : '🤖 AI Wins!'}
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>
                You: <strong>{score}</strong> pts + {Math.floor(lp / 3)} bonus = <strong>{finalP1}</strong>
              </div>
              {aiPlayers.map((p, i) => (
                <div key={p} style={{ fontSize: '13px', color: '#555', marginBottom: i === aiPlayers.length - 1 ? '8px' : '2px' }}>
                  AI {i + 1}: <strong>{scoreAll[p] || 0}</strong> pts + {Math.floor((lpAll[p] || 0) / 3)} bonus = <strong>{finalScores[p] || 0}</strong>
                </div>
              ))}
              <button
                onClick={resetGame}
                style={{
                  fontSize: '13px', padding: '5px 16px', borderRadius: '8px',
                  border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                }}
              >🌱 Play Again</button>
            </div>
          )}

          {/* Final round banner */}
          {isFinalRound && !isGameOver && (
            <div style={{
              background: '#fff3e0', border: '2px solid #f57c00', borderRadius: '8px',
              padding: '8px 12px', marginTop: '12px', marginBottom: '8px', fontSize: '13px',
              color: '#e65100', fontWeight: 'bold', textAlign: 'center',
            }}>
              🌅 Final Round! Everyone takes one last turn.
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
              <span style={{ fontSize: '13px', color: isFinalRound ? '#e65100' : '#666' }}>
                Sun: {sunPosition + 1}/6 · Rev. {sunRevolutions + 1}/3{isFinalRound ? ' · Final!' : ''}
              </span>
              <span style={{
                fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                background: difficulty === 'easy' ? '#e8f5e9' : difficulty === 'hard' ? '#fff3e0' : difficulty === 'expert' ? '#fce4ec' : '#f3e5f5',
                color: difficulty === 'easy' ? '#2e7d32' : difficulty === 'hard' ? '#e65100' : difficulty === 'expert' ? '#880e4f' : '#6a1b9a',
                border: '1px solid currentColor', fontWeight: 'bold',
              }}>
                {difficulty === 'easy' ? '🌱 Easy' : difficulty === 'hard' ? '⚔️ Hard' : difficulty === 'expert' ? '🏆 Expert' : '🌳 Med'}
              </span>
            </div>

            {/* Turn order indicator */}
            {isSetupComplete && (
              <div style={{ fontSize: '11px', color: '#777', marginBottom: '4px' }}>
                <span style={{ marginRight: 4 }}>Order:</span>
                {playerOrder.map((p, i) => {
                  const label = p === 'p1' ? 'You' : `AI ${aiPlayers.indexOf(p) + 1}`;
                  const isFirst = i === 0;
                  return (
                    <span key={p}>
                      {i > 0 && <span style={{ color: '#bbb', margin: '0 3px' }}>→</span>}
                      <span style={{ fontWeight: isFirst ? 'bold' : 'normal', color: isFirst ? '#2e7d32' : '#777' }}>
                        {isFirst && '🌱 '}{label}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Round summary */}
            {Object.keys(lastLpGainedAll).length > 0 && isSetupComplete && (
              <div style={{
                fontSize: '12px', color: '#555', padding: '4px 8px',
                background: '#f9f9f9', borderRadius: '6px', border: '1px solid #e0e0e0',
                marginBottom: '6px', fontFamily: 'sans-serif',
              }}>
                <span style={{ color: '#888', marginRight: 6 }}>Last round:</span>
                <span style={{ color: '#388e3c', marginRight: 6 }}>
                  You +{lastLpGainedAll.p1 || 0} LP
                </span>
                {aiPlayers.map((p, i) => (
                  <span key={p} style={{ color: '#1565c0', marginRight: 6 }}>
                    AI {i + 1} +{lastLpGainedAll[p] || 0} LP
                  </span>
                ))}
                <div style={{ marginTop: '3px', borderTop: '1px solid #e0e0e0', paddingTop: '3px' }}>
                  <span style={{ color: '#888', marginRight: 6 }}>Victory points:</span>
                  <span style={{ color: '#388e3c', marginRight: 6 }}>
                    You <strong>{score}</strong>
                  </span>
                  {aiPlayers.map((p, i) => (
                    <span key={p} style={{ color: '#1565c0', marginRight: 6 }}>
                      AI {i + 1} <strong>{scoreAll[p] || 0}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Player 1 — human */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px',
              padding: '4px 8px', borderRadius: '6px',
              background: currentPlayer === 'p1' && !aiThinking ? '#e8f5e9' : 'transparent',
              border: currentPlayer === 'p1' && !aiThinking ? '1px solid #66bb6a' : '1px solid transparent',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: swatch, display: 'inline-block' }} />
                You
                {firstPlayer === 'p1' && <span title="Goes first this revolution" style={{ fontSize: '11px' }}>🌱</span>}
              </span>
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

          {/* AI players */}
          {aiPlayers.map((p, i) => {
            const aiLp = lpAll[p] || 0;
            const aiScore = scoreAll[p] || 0;
            const aiInv = inventoriesAll[p] || {};
            const aiAvail = availablesAll[p] || {};
            const isActive = currentPlayer === p && aiThinking;
            const aiColorOrder = ['blue', 'orange', 'purple', 'green'];
            const available = aiColorOrder.filter(c => c !== playerColor);
            const colorKey = available[i % available.length] || 'blue';
            return (
              <div key={p} style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px',
                  padding: '4px 8px', borderRadius: '6px',
                  background: isActive ? '#e3f2fd' : 'transparent',
                  border: isActive ? '1px solid #42a5f5' : '1px solid transparent',
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    <span style={{ filter: COLOR_FILTERS[colorKey], display: 'inline-block' }}>🤖</span> AI {i + 1}
                    {firstPlayer === p && <span title="Goes first this revolution" style={{ fontSize: '11px' }}>🌱</span>}
                  </span>
                  <span style={{ fontSize: '14px' }}><strong>{aiLp}</strong> LP</span>
                  <span style={{ fontSize: '14px' }}>🏆 <strong>{aiScore}</strong> pts</span>
                </div>
                <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Available</h5>
                <Available piecesAvailable={aiAvail} lp={aiLp} owner={p} disabled={true} />
                <h5 style={{ marginBottom: '4px', fontSize: '13px', color: '#555' }}>Store</h5>
                <Inventory piecesInInventory={aiInv} lp={aiLp} owner={p} disabled={true} />
              </div>
            );
          })}
        </Col>
      </Row>
    </Container>
  );
};

const App = () => {
  const [gameConfig, setGameConfig] = useState(null);

  if (!gameConfig) {
    return <StartScreen onStart={setGameConfig} />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <GameProvider initialColor={gameConfig.color} initialDifficulty={gameConfig.difficulty} numAI={gameConfig.numAI}>
        <GameContent playerColor={gameConfig.color} />
      </GameProvider>
    </DndProvider>
  );
};

export default App;
