export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type CellValue = TetrominoType | null;
export type Board = CellValue[][];
export type GameStatus = 'idle' | 'playing' | 'paused' | 'over';

export interface ActivePiece {
  type: TetrominoType;
  matrix: number[][];
  rotation: number;
  x: number;
  y: number;
}

export interface GameState {
  board: Board;
  current: ActivePiece | null;
  nextType: TetrominoType;
  queue: TetrominoType[];
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  dropInterval: number;
  lastClear: number;
  highScore: number;
}
