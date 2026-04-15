import type { TetrominoType } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const LINES_PER_LEVEL = 10;

export const SCORE_TABLE: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export const TETROMINOS: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const PIECE_ORDER: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export const COLOR_BY_TYPE: Record<TetrominoType, string> = {
  I: '#38bdf8',
  J: '#60a5fa',
  L: '#fb923c',
  O: '#facc15',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#f87171',
};

export const GLOW_BY_TYPE: Record<TetrominoType, string> = {
  I: 'rgba(56, 189, 248, 0.55)',
  J: 'rgba(96, 165, 250, 0.55)',
  L: 'rgba(251, 146, 60, 0.55)',
  O: 'rgba(250, 204, 21, 0.55)',
  S: 'rgba(74, 222, 128, 0.55)',
  T: 'rgba(192, 132, 252, 0.55)',
  Z: 'rgba(248, 113, 113, 0.55)',
};
