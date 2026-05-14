// Transport layer — routes game actions to either the local Vuex store (single-player)
// or the WebSocket server (multiplayer). Multiplayer mode is activated by ?multiplayer=1
// in the URL, or when a room code is present (?room=XXXX).
import { wsClient } from './client';
import type { Intent, ServerMessage, GameSnapshot, RoomSlot } from './types';
import store from '@/store/index';
import { GameStatus } from '@/types/types';

// ─── Mode detection ───────────────────────────────────────────────────────────

export function isMultiplayer(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('multiplayer') || params.has('room');
}

// ─── Room state (populated from server messages) ──────────────────────────────

export interface RoomInfo {
  roomCode: string;
  mySlotIndex: number;
  slots: RoomSlot[];
  joinUrl: string;
}

let _roomInfo: RoomInfo | null = null;
const _roomInfoHandlers: Array<(info: RoomInfo) => void> = [];
const _slotUpdateHandlers: Array<(slots: RoomSlot[]) => void> = [];
const _errorHandlers: Array<(msg: string) => void> = [];

export function getRoomInfo(): RoomInfo | null { return _roomInfo; }

export function onRoomInfo(handler: (info: RoomInfo) => void): () => void {
  _roomInfoHandlers.push(handler);
  return () => { const i = _roomInfoHandlers.indexOf(handler); if (i >= 0) _roomInfoHandlers.splice(i, 1); };
}

export function onSlotsUpdated(handler: (slots: RoomSlot[]) => void): () => void {
  _slotUpdateHandlers.push(handler);
  return () => { const i = _slotUpdateHandlers.indexOf(handler); if (i >= 0) _slotUpdateHandlers.splice(i, 1); };
}

export function onError(handler: (msg: string) => void): () => void {
  _errorHandlers.push(handler);
  return () => { const i = _errorHandlers.indexOf(handler); if (i >= 0) _errorHandlers.splice(i, 1); };
}

// ─── Server URL ───────────────────────────────────────────────────────────────

function serverWsUrl(): string {
  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const serverPort = import.meta.env.VITE_SERVER_PORT ?? port ?? '8080';
  return `${wsProtocol}//${hostname}:${serverPort}/ws`;
}

// ─── Connect ──────────────────────────────────────────────────────────────────

export function connect(): void {
  wsClient.connect(serverWsUrl());
  wsClient.onMessage(_handleServerMessage);
}

export function disconnect(): void {
  wsClient.disconnect();
}

// ─── Send intents ─────────────────────────────────────────────────────────────

export function sendIntent(intent: Intent): void {
  wsClient.send(intent);
}

// ─── Inbound message handler ──────────────────────────────────────────────────

function _handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'ROOM_CREATED':
      _roomInfo = { roomCode: msg.roomCode, mySlotIndex: 0, slots: msg.slots, joinUrl: msg.joinUrl };
      _roomInfoHandlers.forEach(h => h(_roomInfo!));
      break;

    case 'ROOM_JOINED':
      _roomInfo = { roomCode: msg.roomCode, mySlotIndex: msg.mySlotIndex, slots: msg.slots, joinUrl: '' };
      _roomInfoHandlers.forEach(h => h(_roomInfo!));
      break;

    case 'SLOTS_UPDATED':
      if (_roomInfo) _roomInfo.slots = msg.slots;
      _slotUpdateHandlers.forEach(h => h(msg.slots));
      break;

    case 'GAME_STARTED':
      store.commit('applyServerSnapshot', msg.state);
      store.commit('board/update', { key: 'shouldShowMenu', value: false });
      store.commit('updateGameStatus', GameStatus.PLAYING);
      break;

    case 'STATE_UPDATE':
      store.commit('applyServerSnapshot', msg.state);
      break;

    case 'ERROR':
      _errorHandlers.forEach(h => h(msg.message));
      break;

    case 'OWNER_CHANGED':
      if (_roomInfo) {
        _roomInfo.slots = _roomInfo.slots.map(s => ({
          ...s,
          isOwner: s.slotIndex === msg.newOwnerSlotIndex,
        }));
        _slotUpdateHandlers.forEach(h => h(_roomInfo!.slots));
        store.commit('room/setSlots', _roomInfo.slots);
      }
      break;

    // PLAYER_DISCONNECTED / PLAYER_RECONNECTED: UI handles these via onMessage subscription
  }
}
