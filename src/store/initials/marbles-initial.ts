import { Marble } from '@/types/types';

export const listInitial: Marble[] = [
  // side 1 — bench at rows 12-13, cols 1-2
  { id: 1,  row: 12, column: 1,  side: 1, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 2,  row: 12, column: 2,  side: 1, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 3,  row: 13, column: 1,  side: 1, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 4,  row: 13, column: 2,  side: 1, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },

  // side 2 — bench at rows 1-2, cols 1-2
  { id: 5,  row: 1,  column: 1,  side: 2, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 6,  row: 1,  column: 2,  side: 2, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 7,  row: 2,  column: 1,  side: 2, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 8,  row: 2,  column: 2,  side: 2, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },

  // side 3 — bench at rows 1-2, cols 12-13
  { id: 9,  row: 1,  column: 12, side: 3, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 10, row: 1,  column: 13, side: 3, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 11, row: 2,  column: 12, side: 3, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 12, row: 2,  column: 13, side: 3, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },

  // side 4 — bench at rows 12-13, cols 12-13
  { id: 13, row: 12, column: 12, side: 4, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 14, row: 12, column: 13, side: 4, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 15, row: 13, column: 12, side: 4, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
  { id: 16, row: 13, column: 13, side: 4, isInGame: false, isAtEnd: false, isAtFinal: false, isMoveable: false, isMoving: false },
];
