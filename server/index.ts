import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { networkInterfaces } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRoom, getRoom, sweepRooms } from './room.js';
import type { ServerMessage } from '../src/net/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Serve the Vite SPA build. Fall through to index.html for client-side routing.
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

// ─── Connection → slot mapping ────────────────────────────────────────────────

const wsRoom = new Map<WebSocket, string>(); // ws → room code

// ─── WebSocket handler ────────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg: { type: string; [k: string]: unknown };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const roomCode = wsRoom.get(ws);
    const room = roomCode ? getRoom(roomCode) : undefined;

    // ── Lobby intents (before joining a room) ──────────────────────────────
    if (msg.type === 'CREATE_ROOM') {
      const playerName = String(msg.playerName ?? 'Player');
      const newRoom = createRoom(ws, playerName);
      wsRoom.set(ws, newRoom.code);
      const joinUrl = `http://${getLanIp()}:${PORT}/?room=${newRoom.code}`;
      const slots = newRoom.getSlots();
      const created: ServerMessage = { type: 'ROOM_CREATED', roomCode: newRoom.code, joinUrl, slots };
      const joined: ServerMessage  = { type: 'ROOM_JOINED',  roomCode: newRoom.code, mySlotIndex: 0, slots };
      ws.send(JSON.stringify(created));
      ws.send(JSON.stringify(joined));
      console.log(`[${newRoom.code}] created by ${playerName}`);
      return;
    }

    if (msg.type === 'JOIN_ROOM') {
      const code = String(msg.roomCode ?? '').toUpperCase();
      const playerName = String(msg.playerName ?? 'Player');
      const target = getRoom(code);
      if (!target) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
        return;
      }

      // Try reconnect first
      const reconnected = target.reconnect(ws, playerName);
      if (reconnected) {
        wsRoom.set(ws, code);
        target.sendSnapshot(ws);
        target.broadcast({ type: 'PLAYER_RECONNECTED', slotIndex: reconnected.slotIndex });
        console.log(`[${code}] ${playerName} reconnected`);
        return;
      }

      const slot = target.join(ws, playerName);
      if (!slot) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full or game already started' }));
        return;
      }
      wsRoom.set(ws, code);
      const joinedSlots = target.getSlots();
      const joinedMsg: ServerMessage = { type: 'ROOM_JOINED', roomCode: code, mySlotIndex: slot.slotIndex, slots: joinedSlots };
      ws.send(JSON.stringify(joinedMsg));
      target.broadcast({ type: 'SLOTS_UPDATED', slots: joinedSlots });
      console.log(`[${code}] ${playerName} joined slot ${slot.slotIndex}`);
      return;
    }

    // ── In-room intents ────────────────────────────────────────────────────
    if (!room) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Not in a room' }));
      return;
    }
    room.handleIntent(ws, msg);
  });

  ws.on('close', () => {
    const code = wsRoom.get(ws);
    if (code) {
      getRoom(code)?.disconnect(ws);
      wsRoom.delete(ws);
    }
  });
});

// ─── Idle room sweeper (every 5 min) ─────────────────────────────────────────

setInterval(sweepRooms, 5 * 60 * 1000);

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  const ip = getLanIp();
  console.log(`\n  Ludo server running`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}\n`);
});

function getLanIp(): string {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}
