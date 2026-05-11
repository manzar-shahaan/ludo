import type { Marble, Player, BoardStatus, DiceInfo } from '@/types/types';

// ─── Shared snapshots ─────────────────────────────────────────────────────────

export interface GameSettings {
  isSafezonesEnabled: boolean;
  diceSpeed: number;
}

export interface BoardSnapshot {
  boardStatus: BoardStatus;
  playerActive: Player | null;
  playerWinner: Player | null;
  finishedPlayers: Player[];
  diceInfo: DiceInfo | null;
}

export interface GameSnapshot {
  marbles: Marble[];
  players: Player[];
  board: BoardSnapshot;
  settings: GameSettings;
}

// ─── Room info ────────────────────────────────────────────────────────────────

export interface RoomSlot {
  slotIndex: number;
  name: string;
  isAI: boolean;
  isConnected: boolean;
  isOwner: boolean;
}

// ─── Client → Server ─────────────────────────────────────────────────────────

export type Intent =
  | { type: 'CREATE_ROOM'; playerName: string; settings?: Partial<GameSettings> }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string }
  | { type: 'ADD_AI_SLOT' }
  | { type: 'REMOVE_SLOT'; slotIndex: number }
  | { type: 'START_GAME' }
  | { type: 'ROLL_DICE' }
  | { type: 'MOVE_MARBLE'; marbleId: number }
  | { type: 'CONTINUE_WITHOUT'; slotIndex: number }
  | { type: 'REPLACE_WITH_AI'; slotIndex: number }
  | { type: 'LEAVE_ROOM' };

// ─── Server → Client ─────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; joinUrl: string; slots: RoomSlot[] }
  | { type: 'ROOM_JOINED'; roomCode: string; mySlotIndex: number; slots: RoomSlot[] }
  | { type: 'SLOTS_UPDATED'; slots: RoomSlot[] }
  | { type: 'GAME_STARTED'; state: GameSnapshot }
  | { type: 'STATE_UPDATE'; state: GameSnapshot }
  | { type: 'PLAYER_DISCONNECTED'; slotIndex: number; playerName: string }
  | { type: 'PLAYER_RECONNECTED'; slotIndex: number }
  | { type: 'OWNER_CHANGED'; newOwnerSlotIndex: number }
  | { type: 'ERROR'; message: string };
