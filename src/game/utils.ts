import type { CSSProperties } from 'react';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COLOR_BY_TYPE,
  GLOW_BY_TYPE,
  LINES_PER_LEVEL,
  PIECE_ORDER,
  SCORE_TABLE,
  TETROMINOS,
} from './constants';
import type { ActivePiece, Board, CellValue, GameState, TetrominoType } from './types';

export interface RenderCell {
  type: TetrominoType | null;
  ghost?: boolean;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<CellValue>(BOARD_WIDTH).fill(null));
}

export function rotateMatrix(matrix: number[][]): number[][] {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

export function getTetrominoMatrix(type: TetrominoType, rotation = 0): number[][] {
  let matrix = TETROMINOS[type].map((row) => [...row]);
  for (let step = 0; step < rotation; step += 1) {
    matrix = rotateMatrix(matrix);
  }
  return matrix;
}

export function shuffleBag(): TetrominoType[] {
  const bag = [...PIECE_ORDER];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[randomIndex]] = [bag[randomIndex], bag[index]];
  }
  return bag;
}

function ensureQueue(queue: TetrominoType[], minimum = 7): TetrominoType[] {
  const nextQueue = [...queue];
  while (nextQueue.length < minimum) {
    nextQueue.push(...shuffleBag());
  }
  return nextQueue;
}

function getSpawnY(matrix: number[][]): number {
  const firstFilledRow = matrix.findIndex((row) => row.some(Boolean));
  return firstFilledRow <= 0 ? -1 : -firstFilledRow;
}

export function createPiece(type: TetrominoType, rotation = 0): ActivePiece {
  const matrix = getTetrominoMatrix(type, rotation);
  return {
    type,
    matrix,
    rotation,
    x: Math.floor((BOARD_WIDTH - matrix[0].length) / 2),
    y: getSpawnY(matrix),
  };
}

export function hasCollision(board: Board, piece: ActivePiece, offsetX = 0, offsetY = 0, matrix = piece.matrix): boolean {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < matrix[rowIndex].length; colIndex += 1) {
      if (!matrix[rowIndex][colIndex]) {
        continue;
      }
      const nextX = piece.x + colIndex + offsetX;
      const nextY = piece.y + rowIndex + offsetY;
      if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) {
        return true;
      }
      if (nextY >= 0 && board[nextY][nextX]) {
        return true;
      }
    }
  }
  return false;
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const nextBoard = board.map((row) => [...row]);
  piece.matrix.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (!value) {
        return;
      }
      const boardY = piece.y + rowIndex;
      const boardX = piece.x + colIndex;
      if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
        nextBoard[boardY][boardX] = piece.type;
      }
    });
  });
  return nextBoard;
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const remainingRows = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_HEIGHT - remainingRows.length;
  const freshRows = Array.from({ length: cleared }, () => Array<CellValue>(BOARD_WIDTH).fill(null));
  return {
    board: [...freshRows, ...remainingRows],
    cleared,
  };
}

export function getScoreDelta(linesCleared: number, level: number): number {
  return (SCORE_TABLE[linesCleared] ?? linesCleared * 200) * (level + 1);
}

export function getLevel(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL);
}

export function getDropInterval(level: number): number {
  return Math.max(110, 760 - level * 55);
}

export function rotatePiece(board: Board, piece: ActivePiece): ActivePiece {
  const nextRotation = (piece.rotation + 1) % 4;
  const rotated = getTetrominoMatrix(piece.type, nextRotation);
  const kickOffsets = [0, -1, 1, -2, 2];

  for (const kick of kickOffsets) {
    const candidate: ActivePiece = {
      ...piece,
      rotation: nextRotation,
      matrix: rotated,
      x: piece.x + kick,
    };
    if (!hasCollision(board, candidate)) {
      return candidate;
    }
  }
  return piece;
}

export function getGhostPiece(board: Board, piece: ActivePiece | null): ActivePiece | null {
  if (!piece) {
    return null;
  }
  let dropDistance = 0;
  while (!hasCollision(board, piece, 0, dropDistance + 1)) {
    dropDistance += 1;
  }
  return {
    ...piece,
    y: piece.y + dropDistance,
  };
}

export function composeRenderBoard(board: Board, piece: ActivePiece | null): RenderCell[][] {
  const renderBoard = board.map((row) => row.map((cell) => ({ type: cell } as RenderCell)));
  const ghost = getGhostPiece(board, piece);

  if (ghost) {
    ghost.matrix.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (!value) {
          return;
        }
        const y = ghost.y + rowIndex;
        const x = ghost.x + colIndex;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH && !renderBoard[y][x].type) {
          renderBoard[y][x] = { type: ghost.type, ghost: true };
        }
      });
    });
  }

  if (piece) {
    piece.matrix.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (!value) {
          return;
        }
        const y = piece.y + rowIndex;
        const x = piece.x + colIndex;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          renderBoard[y][x] = { type: piece.type };
        }
      });
    });
  }

  return renderBoard;
}

export function createInitialGame(highScore: number, status: GameState['status'] = 'idle'): GameState {
  let queue = ensureQueue([]);
  const currentType = queue.shift()!;
  queue = ensureQueue(queue);
  const nextType = queue.shift()!;

  return {
    board: createEmptyBoard(),
    current: createPiece(currentType),
    nextType,
    queue,
    score: 0,
    lines: 0,
    level: 0,
    status,
    dropInterval: getDropInterval(0),
    lastClear: 0,
    highScore,
  };
}

export function advanceGame(state: GameState): GameState {
  if (!state.current || state.status !== 'playing') {
    return state;
  }
  if (!hasCollision(state.board, state.current, 0, 1)) {
    return {
      ...state,
      current: {
        ...state.current,
        y: state.current.y + 1,
      },
      lastClear: 0,
    };
  }
  return lockCurrentPiece(state);
}

export function movePiece(state: GameState, deltaX: number, deltaY: number, awardSoftDrop = false): GameState {
  if (!state.current || state.status !== 'playing') {
    return state;
  }

  if (!hasCollision(state.board, state.current, deltaX, deltaY)) {
    return {
      ...state,
      current: {
        ...state.current,
        x: state.current.x + deltaX,
        y: state.current.y + deltaY,
      },
      score: awardSoftDrop ? state.score + 1 : state.score,
      lastClear: 0,
    };
  }

  if (deltaY > 0) {
    return lockCurrentPiece(state);
  }

  return state;
}

export function hardDrop(state: GameState): GameState {
  if (!state.current || state.status !== 'playing') {
    return state;
  }
  let distance = 0;
  while (!hasCollision(state.board, state.current, 0, distance + 1)) {
    distance += 1;
  }

  const droppedState: GameState = {
    ...state,
    current: {
      ...state.current,
      y: state.current.y + distance,
    },
    score: state.score + distance * 2,
  };
  return lockCurrentPiece(droppedState);
}

export function rotateCurrent(state: GameState): GameState {
  if (!state.current || state.status !== 'playing') {
    return state;
  }
  return {
    ...state,
    current: rotatePiece(state.board, state.current),
  };
}

export function lockCurrentPiece(state: GameState): GameState {
  if (!state.current) {
    return state;
  }

  const mergedBoard = mergePiece(state.board, state.current);
  const { board: clearedBoard, cleared } = clearLines(mergedBoard);
  const nextLines = state.lines + cleared;
  const nextLevel = getLevel(nextLines);
  let nextQueue = ensureQueue(state.queue);
  const newCurrent = createPiece(state.nextType);
  const nextType = nextQueue.shift()!;

  const nextStateBase: GameState = {
    ...state,
    board: clearedBoard,
    current: newCurrent,
    nextType,
    queue: nextQueue,
    score: state.score + getScoreDelta(cleared, state.level),
    lines: nextLines,
    level: nextLevel,
    dropInterval: getDropInterval(nextLevel),
    lastClear: cleared,
  };

  const computedHighScore = Math.max(nextStateBase.highScore, nextStateBase.score);
  nextStateBase.highScore = computedHighScore;

  if (hasCollision(clearedBoard, newCurrent)) {
    return {
      ...nextStateBase,
      status: 'over',
      current: null,
    };
  }

  return nextStateBase;
}

export function getPreviewMatrix(type: TetrominoType): number[][] {
  return getTetrominoMatrix(type, 0);
}

export function getPieceStyles(type: TetrominoType) {
  return {
    '--piece-color': COLOR_BY_TYPE[type],
    '--piece-glow': GLOW_BY_TYPE[type],
  } as CSSProperties;
}
