import type { WebSocket } from 'ws';
import type { StepPlace, Marble, Player, MoveAction, DiceInfo } from '../src/types/types.js';
import { BoardStatus } from '../src/types/types.js';
import { listInitial as stepsInitial } from '../src/store/initials/steps-initial.js';
import { listInitial as marblesInitial } from '../src/store/initials/marbles-initial.js';
import {
  pos, samePos, marblePos, finalStep, sideEndpoints, pathStepsBetween,
  availableActions, hasMultipleChoices, chooseAction,
  applyMarblePos, kickMarbles, isAllAtFinal,
} from './gameLogic.js';
import { rollDice, makeDiceInfo } from './diceRng.js';
import type { GameSnapshot, GameSettings, RoomSlot, ServerMessage } from '../src/net/types.js';

const MARBLE_STEP_DELAY = 400;   // ms between marble steps (MARBLE_ANIMATION_DURATION + 100)
const AI_ROLL_DELAY    = 600;    // ms AI "thinks" before rolling
const AI_MOVE_DELAY    = 500;    // ms AI "thinks" before moving

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Room slot ────────────────────────────────────────────────────────────────

interface Slot {
  slotIndex: number;
  name: string;
  isAI: boolean;
  isConnected: boolean;
  isOwner: boolean;
  ws: WebSocket | null;
}

// ─── In-memory game state ─────────────────────────────────────────────────────

interface GameState {
  steps: StepPlace[];
  marbles: Marble[];
  players: Player[];
  board: {
    boardStatus: BoardStatus;
    playerActive: Player | null;
    playerWinner: Player | null;
    finishedPlayers: Player[];
    diceInfo: DiceInfo | null;
  };
  settings: GameSettings;
}

// ─── Room ─────────────────────────────────────────────────────────────────────

export class Room {
  readonly code: string;
  private slots: Slot[];
  private phase: 'LOBBY' | 'PLAYING' | 'PAUSED' = 'LOBBY';
  private gs: GameState | null = null;

  // Pending intent resolvers
  private _rollResolve: (() => void) | null = null;
  private _moveResolve: ((marbleId: number) => void) | null = null;
  private _pendingActions: MoveAction[] = [];
  private _disconnectResolve: (() => void) | null = null;

  private _settings: Partial<GameSettings>;

  constructor(code: string, ownerName: string, ws: WebSocket, settings?: Partial<GameSettings>) {
    this.code = code;
    this._settings = settings ?? {};
    this.slots = [{
      slotIndex: 0,
      name: ownerName,
      isAI: false,
      isConnected: true,
      isOwner: true,
      ws,
    }];
    // Add 3 default AI slots so the game can start immediately with 1 human
    for (let i = 1; i <= 3; i++) {
      this.slots.push({ slotIndex: i, name: `CPU ${i}`, isAI: true, isConnected: true, isOwner: false, ws: null });
    }
  }

  // ─── Slot management ────────────────────────────────────────────────────────

  join(ws: WebSocket, playerName: string): Slot | null {
    if (this.phase !== 'LOBBY') return null;

    // Replace next available AI slot with the joining human
    const aiSlot = this.slots.find(s => s.isAI && s.slotIndex > 0);
    if (!aiSlot) return null; // room full

    aiSlot.name = playerName;
    aiSlot.isAI = false;
    aiSlot.isConnected = true;
    aiSlot.ws = ws;
    return aiSlot;
  }

  addAISlot(): boolean {
    if (this.slots.length >= 4 || this.phase !== 'LOBBY') return false;
    const idx = this.slots.length;
    this.slots.push({ slotIndex: idx, name: `CPU ${idx}`, isAI: true, isConnected: true, isOwner: false, ws: null });
    return true;
  }

  removeSlot(slotIndex: number): boolean {
    if (this.phase !== 'LOBBY') return false;
    if (slotIndex === 0) return false; // can't remove owner
    this.slots = this.slots.filter(s => s.slotIndex !== slotIndex);
    this.slots.forEach((s, i) => s.slotIndex = i); // re-index
    return true;
  }

  slotByWs(ws: WebSocket): Slot | undefined {
    return this.slots.find(s => s.ws === ws);
  }

  disconnect(ws: WebSocket): void {
    const slot = this.slotByWs(ws);
    if (!slot) return;
    slot.isConnected = false;
    slot.ws = null;

    if (this.phase === 'PLAYING') {
      this.broadcast({ type: 'PLAYER_DISCONNECTED', slotIndex: slot.slotIndex, playerName: slot.name });
      // If it's this player's turn mid-action, unblock the immediate await so the loop
      // can reach the per-turn disconnect-pause check. We do NOT auto-continue their turn.
      const active = this.gs?.board.playerActive;
      if (active && active.side === slot.slotIndex + 1) {
        this._rollResolve?.();
        this._rollResolve = null;
        if (this._moveResolve) {
          // Reset marble selection state cleanly
          this._pendingActions = [];
          if (this.gs) this.gs.marbles = this.gs.marbles.map(m => ({ ...m, isMoveable: false }));
          this._moveResolve(-1);
          this._moveResolve = null;
        }
      }
    } else {
      // Lobby: notify others that the slot is now empty
      this.broadcastSlots();
    }

    // Promote next human as owner if the owner left
    if (slot.isOwner) {
      slot.isOwner = false;
      const next = this.slots.find(s => !s.isAI && s.isConnected);
      if (next) {
        next.isOwner = true;
        this.broadcast({ type: 'OWNER_CHANGED', newOwnerSlotIndex: next.slotIndex });
      }
    }
  }

  reconnect(ws: WebSocket, playerName: string): Slot | null {
    const slot = this.slots.find(s => !s.isAI && !s.isConnected && s.name === playerName);
    if (!slot) return null;
    slot.ws = ws;
    slot.isConnected = true;
    // Unblock the per-turn disconnect-pause in the game loop
    this._disconnectResolve?.();
    this._disconnectResolve = null;
    return slot;
  }

  // ─── Intent dispatch ─────────────────────────────────────────────────────────

  handleIntent(ws: WebSocket, intent: { type: string; [k: string]: unknown }): void {
    const slot = this.slotByWs(ws);
    if (!slot) return;

    switch (intent.type) {
      case 'ADD_AI_SLOT':
        if (slot.isOwner && this.addAISlot()) this.broadcastSlots();
        break;
      case 'REMOVE_SLOT':
        if (slot.isOwner && this.removeSlot(intent.slotIndex as number)) this.broadcastSlots();
        break;
      case 'START_GAME':
        if (slot.isOwner && this.phase === 'LOBBY') this.startGame();
        break;
      case 'ROLL_DICE':
        this._onRollDice(slot);
        break;
      case 'MOVE_MARBLE':
        this._onMoveMarble(slot, intent.marbleId as number);
        break;
      case 'CONTINUE_WITHOUT':
        if (slot.isOwner) this._continueWithout(intent.slotIndex as number);
        break;
      case 'REPLACE_WITH_AI':
        if (slot.isOwner) this._replaceWithAI(intent.slotIndex as number);
        break;
    }
  }

  private _onRollDice(slot: Slot): void {
    if (!this.gs) return;
    const active = this.gs.board.playerActive;
    if (!active || active.side !== slot.slotIndex + 1) return;
    if (this.gs.board.boardStatus !== BoardStatus.WAITING_TURN_DICE) return;
    this._rollResolve?.();
    this._rollResolve = null;
  }

  private _onMoveMarble(slot: Slot, marbleId: number): void {
    if (!this.gs) return;
    const active = this.gs.board.playerActive;
    if (!active || active.side !== slot.slotIndex + 1) return;
    if (this.gs.board.boardStatus !== BoardStatus.PLAYER_IS_THINKING) return;
    this._moveResolve?.(marbleId);
    this._moveResolve = null;
  }

  private _continueWithout(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    if (!slot || !this.gs) return;
    slot.isAI = true;
    const player = this.gs.players.find(p => p.side === slotIndex + 1);
    if (player) player.isAI = true;
    // Unblock the per-turn disconnect-pause; loop will proceed as AI
    this._disconnectResolve?.();
    this._disconnectResolve = null;
    this.broadcastState();
  }

  private _replaceWithAI(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    if (!slot || !this.gs) return;
    // Rename before converting so broadcastState() inside _continueWithout carries the new name
    slot.name = `CPU ${slotIndex + 1}`;
    const player = this.gs.players.find(p => p.side === slotIndex + 1);
    if (player) player.name = `CPU ${slotIndex + 1}`;
    this._continueWithout(slotIndex);
  }

  // ─── Broadcasting ─────────────────────────────────────────────────────────────

  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const s of this.slots) {
      if (s.ws?.readyState === 1 /* OPEN */) {
        s.ws.send(data);
      }
    }
  }

  private broadcastSlots(): void {
    this.broadcast({ type: 'SLOTS_UPDATED', slots: this.getSlots() });
  }

  private broadcastState(): void {
    if (!this.gs) return;
    this.broadcast({ type: 'STATE_UPDATE', state: this._snapshot() });
  }

  getSlots(): RoomSlot[] {
    return this.slots.map(s => ({
      slotIndex: s.slotIndex,
      name: s.name,
      isAI: s.isAI,
      isConnected: s.isConnected,
      isOwner: s.isOwner,
    }));
  }

  private _snapshot(): GameSnapshot {
    const g = this.gs!;
    return {
      marbles: g.marbles.map(m => ({ ...m })),
      players: g.players.map(p => ({ ...p })),
      board: {
        boardStatus: g.board.boardStatus,
        playerActive: g.board.playerActive ? { ...g.board.playerActive } : null,
        playerWinner: g.board.playerWinner ? { ...g.board.playerWinner } : null,
        finishedPlayers: g.board.finishedPlayers.map(p => ({ ...p })),
        diceInfo: g.board.diceInfo ? { ...g.board.diceInfo } : null,
      },
      settings: { ...g.settings },
    };
  }

  sendSnapshot(ws: WebSocket): void {
    if (!this.gs) return;
    const data = JSON.stringify({ type: 'STATE_UPDATE', state: this._snapshot() } as ServerMessage);
    if (ws.readyState === 1) ws.send(data);
  }

  // ─── Game start ───────────────────────────────────────────────────────────────

  startGame(): void {
    const players: Player[] = this.slots.map((s, i) => ({
      id: i + 1,
      side: i + 1,
      name: s.name,
      color: ['red', 'green', 'blue', 'yellow'][i],
      isAI: s.isAI,
      isMain: !s.isAI,
      isInGame: true,
    }));

    this.gs = {
      steps: stepsInitial,
      marbles: marblesInitial.map(m => ({ ...m })),
      players,
      board: {
        boardStatus: BoardStatus.INITIALIZING,
        playerActive: null,
        playerWinner: null,
        finishedPlayers: [],
        diceInfo: null,
      },
      settings: { isSafezonesEnabled: false, diceSpeed: 1.5, ...this._settings },
    };

    this.phase = 'PLAYING';
    this.broadcast({ type: 'GAME_STARTED', state: this._snapshot() });
    this._runGameLoop().catch(err => console.error(`[Room ${this.code}] loop error:`, err));
  }

  // ─── Game loop ────────────────────────────────────────────────────────────────

  private _activePlayer(): Player | null {
    return this.gs!.board.playerActive;
  }

  private _inGamePlayers(): Player[] {
    return this.gs!.players.filter(p => p.isInGame);
  }

  private _advanceTurn(): void {
    const g = this.gs!;
    const active = g.board.playerActive;
    const roster = this._inGamePlayers();
    if (roster.length === 0) return;

    if (!active) {
      g.board.playerActive = roster[0];
      return;
    }
    const idx = roster.findIndex(p => p.id === active.id);
    g.board.playerActive = roster[(idx === -1 ? 0 : idx + 1) % roster.length];
  }

  private async _runGameLoop(): Promise<void> {
    const g = this.gs!;
    let changeTurn = true;

    while (true) {
      if (changeTurn) this._advanceTurn();
      changeTurn = true;

      const player = this._activePlayer();
      if (!player) break;

      // ── Pause if this human player is disconnected ─────────────────────────
      // Wait here until the owner decides (Continue without / Replace with AI)
      // or the player reconnects. The loop auto-exits once player.isAI or slot.isConnected.
      {
        const slot = this.slots[player.side - 1];
        while (slot && !player.isAI && !slot.isConnected) {
          g.board.boardStatus = BoardStatus.WAITING_TURN_DICE;
          this.broadcastState();
          await new Promise<void>(res => { this._disconnectResolve = res; });
          this._disconnectResolve = null;
        }
      }

      // ── Roll phase ─────────────────────────────────────────────────────────
      g.board.boardStatus = BoardStatus.WAITING_TURN_DICE;
      this.broadcastState();

      const isHuman = !player.isAI && this.slots[player.side - 1]?.isConnected;
      if (isHuman) {
        await new Promise<void>(res => { this._rollResolve = res; });
      } else {
        await sleep(AI_ROLL_DELAY + Math.random() * 400);
      }

      const value = rollDice();
      const diceInfo = makeDiceInfo(value, player);
      g.board.diceInfo = diceInfo;
      g.board.boardStatus = BoardStatus.TURNING_DICE;
      this.broadcastState();

      // Wait for dice animation to complete on clients
      const diceWait = Math.round(2050 * (g.settings.diceSpeed / 1.5)) + 2280;
      await sleep(diceWait);

      // ── Move phase ─────────────────────────────────────────────────────────
      const actions = availableActions(g.steps, g.marbles, player, diceInfo);

      if (actions.length === 0) {
        g.board.diceInfo = { ...diceInfo, isDone: true };
        this.broadcastState();
        continue;
      }

      let action: MoveAction;
      const playerIsHumanNow = !player.isAI && this.slots[player.side - 1]?.isConnected;

      if (!playerIsHumanNow || !hasMultipleChoices(actions)) {
        // AI or single-choice: auto-pick
        if (player.isAI) await sleep(AI_MOVE_DELAY + Math.random() * 300);
        action = chooseAction(g.steps, g.marbles, actions, g.settings.isSafezonesEnabled);
      } else {
        // Human must choose
        g.board.boardStatus = BoardStatus.PLAYER_IS_THINKING;
        const moveableIds = new Set(actions.map(a => a.marble.id));
        g.marbles = g.marbles.map(m => ({ ...m, isMoveable: moveableIds.has(m.id) }));
        this._pendingActions = actions;
        this.broadcastState();

        const marbleId = await new Promise<number>(res => { this._moveResolve = res; });
        this._pendingActions = [];
        if (marbleId === -1) {
          // Player disconnected mid-choice — skip remainder of turn; the disconnect-pause
          // at the top of the next iteration will hold the game until owner decides.
          g.marbles = g.marbles.map(m => ({ ...m, isMoveable: false }));
          g.board.diceInfo = g.board.diceInfo ? { ...g.board.diceInfo, isDone: true } : null;
          changeTurn = false; // keep same player active for the disconnect-pause
          this.broadcastState();
          continue;
        }
        action = actions.find(a => a.marble.id === marbleId) ?? actions[0];
      }

      // ── Execute move ───────────────────────────────────────────────────────
      g.board.boardStatus = BoardStatus.MOVING_MARBLES;
      g.marbles = g.marbles.map(m => ({ ...m, isMoveable: false }));

      if (action.type === 0 /* MoveType.BENCH */) {
        g.marbles = applyMarblePos(g.marbles, action.marble.id, action.to, { isInGame: true, isMoving: false });
        this.broadcastState();
        await sleep(MARBLE_STEP_DELAY);
      } else {
        const steps = pathStepsBetween(g.steps, action);
        for (let i = 0; i < steps.length; i++) {
          const stepPos = pos(steps[i]);
          const isLast = i === steps.length - 1;
          g.marbles = applyMarblePos(g.marbles, action.marble.id, stepPos, { isInGame: true, isMoving: !isLast });
          this.broadcastState();
          if (!isLast) await sleep(MARBLE_STEP_DELAY);
        }
      }

      // ── Post-move updates ──────────────────────────────────────────────────
      const updatedMarble = g.marbles.find(m => m.id === action.marble.id)!;
      const mPos = marblePos(updatedMarble);
      const fp = pos(finalStep(g.steps));
      const epPositions = sideEndpoints(g.steps, player.side).map(s => pos(s));

      g.marbles = g.marbles.map(m => {
        if (m.id !== action.marble.id) return m;
        return {
          ...m,
          isAtFinal: samePos(mPos, fp),
          isAtEnd: epPositions.some(ep => samePos(ep, mPos)),
        };
      });

      // Kickouts
      g.marbles = kickMarbles(g.steps, g.marbles, mPos, player.side);

      // Mark dice done
      g.board.diceInfo = { ...diceInfo, isDone: true };
      this.broadcastState();

      // ── Check if player finished ───────────────────────────────────────────
      if (isAllAtFinal(g.marbles, player.side)) {
        const remaining = this._inGamePlayers().filter(p => p.side !== player.side);
        if (remaining.length === 0) {
          g.board.boardStatus = BoardStatus.FINISHED;
          g.board.playerWinner = { ...player };
          this.broadcastState();
          break;
        }
        g.players = g.players.map(p => p.side === player.side ? { ...p, isInGame: false } : p);
        g.board.finishedPlayers = [...g.board.finishedPlayers, { ...player }];
        this.broadcastState();
      }

      // ── Reward (rolled a 6): same player goes again ────────────────────────
      if (diceInfo.hasReward && this._activePlayer()?.side === player.side) {
        changeTurn = false;
      }
    }
  }

  isEmpty(): boolean {
    return this.slots.every(s => !s.isConnected || s.isAI);
  }
}

// ─── Room registry ─────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

export function createRoom(ws: WebSocket, playerName: string, settings?: Partial<GameSettings>): Room {
  let code: string;
  do { code = makeCode(); } while (rooms.has(code));
  const room = new Room(code, playerName, ws, settings);
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

// Sweep rooms that have been fully abandoned
export function sweepRooms(): void {
  for (const [code, room] of rooms) {
    if (room.isEmpty()) rooms.delete(code);
  }
}
