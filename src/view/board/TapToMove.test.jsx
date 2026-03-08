/**
 * Tap-to-move tests
 *
 * Desktop: pieces are draggable (cursor: move), clicking does not select.
 * Mobile:  pieces are tappable (cursor: pointer), tap selects; tapping a
 *          valid board square calls movePiece and clears selection.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock react-dnd so tests don't need a DnD provider ─────────────────────────
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: false, dragItem: null }, jest.fn()],
  DragPreviewImage: () => null,
}));

// ── Mock Game.js ───────────────────────────────────────────────────────────────
jest.mock('./Game', () => ({
  canMovePiece: jest.fn(() => true),
  movePiece:    jest.fn(),
  getDropHint:  jest.fn(() => null),
}));

// ── Mock GameContext ───────────────────────────────────────────────────────────
const mockSetSelectedPiece = jest.fn();

jest.mock('./GameContext', () => ({
  useGameState:  jest.fn(),
  COLOR_FILTERS: { green: 'none', blue: 'hue-rotate(150deg)', purple: '', orange: '' },
}));

import { useGameState } from './GameContext';
import { canMovePiece, movePiece } from './Game';
import { Piece } from './Piece';
import { BoardSquare } from './BoardSquare';

function makeCtx(isMobile, selectedPiece = null) {
  return {
    playerColor: 'green',
    isMobile,
    selectedPiece,
    setSelectedPiece: mockSetSelectedPiece,
    lp: 5,
    aiThinking: false,
    visualShadowedSquares: new Set(),
    lastTurnScores: {},
  };
}

beforeEach(() => jest.clearAllMocks());

// ── Desktop tests ─────────────────────────────────────────────────────────────

describe('Desktop (isMobile=false)', () => {
  beforeEach(() => useGameState.mockReturnValue(makeCtx(false)));

  test('Piece renders with move cursor', () => {
    render(<Piece type="seed" id="42" />);
    const div = screen.getByRole('img', { name: 'seed' }).parentElement;
    expect(div.style.cursor).toBe('move');
  });

  test('clicking Piece does NOT call setSelectedPiece', () => {
    render(<Piece type="seed" id="42" />);
    fireEvent.click(screen.getByRole('img', { name: 'seed' }).parentElement);
    expect(mockSetSelectedPiece).not.toHaveBeenCalled();
  });

  test('clicking BoardSquare does NOT call movePiece', () => {
    render(<BoardSquare x={0} y={0} bkgd="" isShadowed={false} />);
    fireEvent.click(document.querySelector('[data-board-x="0"]'));
    expect(movePiece).not.toHaveBeenCalled();
  });
});

// ── Mobile tests ──────────────────────────────────────────────────────────────

describe('Mobile (isMobile=true)', () => {
  test('Piece renders with pointer cursor', () => {
    useGameState.mockReturnValue(makeCtx(true));
    render(<Piece type="seed" id="42" />);
    const div = screen.getByRole('img', { name: 'seed' }).parentElement;
    expect(div.style.cursor).toBe('pointer');
  });

  test('tapping unselected Piece selects it', () => {
    useGameState.mockReturnValue(makeCtx(true, null));
    render(<Piece type="seed" id="42" />);
    fireEvent.click(screen.getByRole('img', { name: 'seed' }).parentElement);
    expect(mockSetSelectedPiece).toHaveBeenCalledWith('42');
  });

  test('tapping already-selected Piece deselects it', () => {
    useGameState.mockReturnValue(makeCtx(true, '42'));
    render(<Piece type="seed" id="42" />);
    fireEvent.click(screen.getByRole('img', { name: 'seed' }).parentElement);
    expect(mockSetSelectedPiece).toHaveBeenCalledWith(null);
  });

  test('tapping BoardSquare with valid move calls movePiece and clears selection', () => {
    canMovePiece.mockReturnValue(true);
    useGameState.mockReturnValue(makeCtx(true, '42'));
    render(<BoardSquare x={2} y={0} bkgd="" isShadowed={false} />);
    fireEvent.click(document.querySelector('[data-board-x="2"]'));
    expect(movePiece).toHaveBeenCalledWith('42', 2, 0, 'board');
    expect(mockSetSelectedPiece).toHaveBeenCalledWith(null);
  });

  test('tapping BoardSquare with invalid move skips movePiece but clears selection', () => {
    canMovePiece.mockReturnValue(false);
    useGameState.mockReturnValue(makeCtx(true, '42'));
    render(<BoardSquare x={2} y={0} bkgd="" isShadowed={false} />);
    fireEvent.click(document.querySelector('[data-board-x="2"]'));
    expect(movePiece).not.toHaveBeenCalled();
    expect(mockSetSelectedPiece).toHaveBeenCalledWith(null);
  });

  test('tapping BoardSquare with no selection does not call movePiece', () => {
    useGameState.mockReturnValue(makeCtx(true, null));
    render(<BoardSquare x={2} y={0} bkgd="" isShadowed={false} />);
    fireEvent.click(document.querySelector('[data-board-x="2"]'));
    expect(movePiece).not.toHaveBeenCalled();
  });
});
