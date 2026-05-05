# Plan v2.5 — 13×13 Board + LAN Multiplayer

Two independent features. Phase 1 ships in ~30 min and is risk-free. Phases 2–4 are the multiplayer build (~1 week).

---

## Decided design choices

1. **Host = laptop/desktop, clients = anything (incl. mobile).** Browsers cannot run servers. The host device runs a Node process; phones/tablets can join as clients but cannot host.
2. **Dice rolls happen server-side.** Clients animate to a value the server picks.
3. **Roster supports any 1–4 combination of AI + humans.** Examples: 1 human + 3 AI, 2 humans + 2 AI, 4 humans, 1 human + 1 AI, etc. (Verify this works in single-player too — current menu may not expose all combos.)
4. **Disconnection mid-game:** pause game, show banner "Waiting for {name} to reconnect…" with two buttons:
   - **Continue without {name}** → marks them as forfeited, removes from rotation
   - **Replace with AI** → converts their slot to AI, game continues
5. **Room joining:** room code (4-letter, e.g. "FROG") + QR code shown on host's screen.
6. **No persistence.** Server keeps room state in memory only. Host shutdown = game lost (acceptable). Single-player sessionStorage stays as-is.

---

## Phase 1 — Expand the board to 13×13 (7 squares per home arm)

### Why 13×13 (not 12×12)

A symmetric 4-player Ludo board needs an odd grid for a single center cell. Adding 1 square to each home arm = adding 1 row/col on **each** of the 4 edges → 11 + 2 = **13**. A 12×12 grid would leave sides 2 and 3 needing row/col 0.

### Files to change

| File | Change |
|---|---|
| `src/constants.ts` | `STEP_WIDTH` 8.3333 → 7.6336, `STEP_GUTTER` 0.8333 → 0.7634, `PATH_STEPS_COUNT` 42 → 49 |
| `src/store/initials/steps-initial.ts` | Full rewrite. Shift every coordinate +1, center moves to (7,7), each side now has 11 commons + 6 endpoints + 4 bench. New outermost endpoint per side. |
| `src/store/initials/marbles-initial.ts` | Shift all 16 marble row/col by +1 (bench corners now sit at rows/cols 1-2 and 12-13). |

### Verification

- `npx vite build` passes
- Each side visually shows 6 colored endpoints + 1 center
- Marble traverses full path without "Out of path range" error
- AI still moves correctly

---

## Phase 2 — Multiplayer infrastructure

### Architecture

WebSocket server on host. Server owns game state. Clients send *intents*, server validates against rules and broadcasts state updates. LAN latency is <5 ms — round-tripping every action is fine.

### Files to change

| File | Change |
|---|---|
| `server/index.ts` (NEW) | Express + `ws` server. Serves static SPA (prod) and WebSocket endpoint (both). Logs LAN IP on startup. |
| `server/room.ts` (NEW) | Room lifecycle: code generation, slot management, applies intents, broadcasts state. Holds `Map<roomCode, RoomState>` in memory. |
| `server/diceRng.ts` (NEW) | Server-side `Math.random()` wrapper. Single function, easy to swap to seeded RNG later. |
| `server/gameLogic.ts` (NEW) | Reuses logic from `src/helpers/move.ts` etc. — extract the pure functions (no Vuex) into a shared module both client and server import. May require small refactor of helpers to remove direct `store.getters` access. |
| `src/net/transport.ts` (NEW) | Bridges Vuex actions ↔ server. In single-player, calls `store.dispatch` directly. In multiplayer, sends intent → awaits server response → applies returned state patch. |
| `src/net/client.ts` (NEW) | WebSocket wrapper: connect, reconnect-on-drop, message queue. |
| `src/net/types.ts` (NEW) | Shared message types: `Intent` (client→server), `ServerMessage` (server→client). |
| `src/helpers/board.ts`, `src/helpers/move.ts`, `src/helpers/dice.ts` | Replace direct `store.dispatch` calls for *shared game state* (board status, dice, marbles) with `transport.dispatch`. Keep direct dispatch for local-only state (UI, settings, animations). |
| `src/store/index.ts` | Add `applyServerState` mutation that overwrites/patches store from server messages. Add `mode` flag (single-player vs multiplayer). |
| `src/components/Dice.vue` | Animation must run from `diceInfo.value` *received from server*, not generated locally. (Already works this way — verify `Math.random()` only feeds the *visual* face, not the actual roll outcome.) |
| `package.json` | Add deps: `express`, `ws`, `qrcode-svg`. Add scripts: `dev:server`, `dev:full` (concurrent server + vite). |

### Critical refactor: dice authority

In single-player today, `helpers/dice.ts` calls `Math.random()` and writes to the store. In multiplayer, the client sends `{type: 'ROLL_DICE'}` and the server picks the value, writes to its state, and broadcasts. Animation in `Dice.vue` reads the final value from store — no client-side knowledge of the value before it arrives.

### Authority enforcement (server-side)

- Only the active player can `ROLL_DICE` / `MOVE_MARBLE`
- Only the room creator can `START_GAME` / `PAUSE` / change settings
- Reject + log invalid intents

---

## Phase 3 — Room UI

### Files to change

| File | Change |
|---|---|
| `src/components/MenuRoom.vue` (NEW) | Host's room lobby: shows code, QR (using `qrcode-svg`), connected player list, slot config (Open/AI/Closed), Start button. |
| `src/components/MenuJoin.vue` (NEW) | Joining player's flow: name entry, slot selection, "waiting for host" screen. |
| `src/components/MenuBoard.vue` | Add buttons: "Single Player", "Create Room", "Join Room". Detect `?room=CODE` URL param to auto-route to Join. |
| `src/router/index.ts` | Add routes for `/host` (room creation) and `/join` (joining). |
| `src/store/modules/room.ts` (NEW) | New Vuex module: room code, connected players, my slot, host status. |

### Roster flexibility

The slot configurator must support: any number of AI slots (0–3), any number of open human slots (1–4), total 1–4. Host can lock down slot count before opening room. Joining clients claim open slots first-come.

---

## Phase 4 — Edge cases & polish

### Files to change

| File | Change |
|---|---|
| `server/room.ts` | On client disconnect: mark slot `disconnected: true`, broadcast pause + reason. On reconnect (matching slot ID + name): replay full state. |
| `src/components/Board.vue` | Add "Waiting for {name}…" banner with **Continue without** / **Replace with AI** buttons (similar UX to existing placement banner). Wire to transport intents. |
| `server/room.ts` | Handle `CONTINUE_WITHOUT` and `REPLACE_WITH_AI` intents: update player state, resume game. Only host can trigger. |
| `src/components/MenuRoom.vue` | If host disconnects, all clients show "Host disconnected — game over" and return to home. |

### Notes

- Settings (dice speed, safezones) are owned by host; locked on join clients
- Spectator mode skipped for v1
- Reconnection grace: no timer — slot stays paused until host explicitly chooses Continue/Replace, or the player reconnects

---

## Suggested execution order

1. **Phase 1** — ship now, low risk, no architectural changes
2. **Phase 2** — gate behind `?multiplayer=1` flag during development so single-player keeps working
3. **Phase 3** — build alongside Phase 2 testing
4. **Phase 4** — incremental hardening from real multi-device testing
