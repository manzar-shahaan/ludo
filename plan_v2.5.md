# Plan v2.5 — 13×13 Board + LAN Multiplayer

Two independent features. Phase 1 ships in ~30 min and is risk-free. Phases 2–4 are the multiplayer build (~1 week).

---

## Architecture model

- **Server** = the home server machine. Always-on, runs Node, orchestrates all rooms. No player runs on it.
- **Room creator (owner)** = a regular client/player who created the room. Has admin powers (start game, replace disconnected player, etc.) but otherwise plays normally.
- **All players are equal clients.** Mobile, laptop, tablet — anything with a browser. They all connect to the home server's URL.

## Decided design choices

1. **Dice rolls happen server-side.** Clients animate to the value the server picks.
2. **Roster supports any 1–4 combination of AI + humans.** Examples: 1 human + 3 AI, 2 humans + 2 AI, 4 humans, 1 human + 1 AI, etc. (Verify this works in single-player too — current menu may not expose all combos.)
3. **Disconnection mid-game (any player):** pause game, show banner "Waiting for {name} to reconnect…" with two buttons (visible to room creator only):
   - **Continue without {name}** → marks them as forfeited, removes from rotation
   - **Replace with AI** → converts their slot to AI, game continues
4. **Room creator disconnection:** server promotes the next-longest-connected human player to room creator. Game continues uninterrupted. No fatal event.
5. **Room joining:** 4-letter room code (e.g. "FROG") + QR code shown in the room lobby.
6. **State persistence:** room state lives in server memory. Survives all client disconnects. Lost only on home-server restart — acceptable for v1. (Optional: add JSON-file persistence later if you want survival across server reboots.)

---

## Phase 1 — Expand the board to 13×13 (7 squares per home arm)

### Why 13×13 (not 12×12)

A symmetric 4-player Ludo board needs an odd grid for a single center cell. Adding 1 square to each home arm = adding 1 row/col on **each** of the 4 edges → 11 + 2 = **13**. A 12×12 grid would leave sides 2 and 3 needing row/col 0.

### Expansion model: true expansion (longer arms)

The board *grows* — every arm extends one square outward. Benches sit at the actual corners of the new 13×13 grid (rows/cols 1-2 and 12-13). Center moves to (7,7). This is **not** a simple "shift +1" of every coordinate; the path arms become longer.

### Files to change

| File | Change |
|---|---|
| `src/constants.ts` | `STEP_WIDTH` 8.3333 → **7.0423** (= 100/14.2, 13 cells + 12 gutters at 10:1 ratio), `STEP_GUTTER` 0.8333 → **0.7042**, `PATH_STEPS_COUNT` 42 → 51 |
| `src/store/initials/steps-initial.ts` | Full rewrite. Center at (7,7). Per side: 4 bench (in grid corners 1-2 / 12-13), 11 commons (longer arm + corner-conversion trick from v2.4), 6 endpoints (own home column extended one square out). |
| `src/store/initials/marbles-initial.ts` | Reposition all 16 marbles into the new bench corner cells (rows/cols 1-2 and 12-13). |

### Path math

A single player's path traverses: their own side's commons, then each of the other 3 sides' commons in order, then **their own** home-column endpoints, then the shared center. Players never enter other players' home columns.

```
path_length = (commons_per_side × 4)  +  endpoints_per_player  +  1 final
            = (11             × 4)    +  6                     +  1
            = 44                      +  6                     +  1
            = 51
```

- **`11` is per side**, not total. Total commons across the whole board = 44.
- **`6` is per player** (each player has their own home column with 6 endpoints).
- The `× 4` on commons is because every player walks through all 4 sides' commons; the `× 1` on endpoints is because they only enter their own.

Cross-check against earlier versions using the same formula:
- 11×11 original: `10×4 + 4 + 1 = 45` (matches old `PATH_STEPS_COUNT = 45`)
- 11×11 v2.4: `9×4 + 5 + 1 = 42` (matches current `PATH_STEPS_COUNT = 42`)
- 13×13 v2.5: `11×4 + 6 + 1 = 51` ← target

Note: the "corner conversion" trick from v2.4 still applies — the last common of each side is reassigned as the first endpoint of the neighboring side, which is why it's 11 commons + 6 endpoints rather than 12 + 5.

### Verification

- `npx vite build` passes
- Each side visually shows 6 colored endpoints + 1 center
- Marble traverses full path without "Out of path range" error
- AI still moves correctly

---

## Phase 2 — Multiplayer infrastructure

### Architecture

WebSocket server runs on the home server machine (always-on, no player). Server owns all game state. Clients send *intents*; server validates against rules and broadcasts state updates. LAN latency is <5 ms — round-tripping every action is fine.

### Files to change

| File | Change |
|---|---|
| `server/index.ts` (NEW) | Express + `ws` server, runs on home server. Serves static SPA + WebSocket endpoint on a fixed port (e.g. 8080). Logs the LAN URL on startup. Designed to run as a long-lived process (systemd / pm2 / `npm start`). |
| `server/room.ts` (NEW) | Room lifecycle: code generation, slot management, room-creator promotion on owner disconnect, applies intents, broadcasts state. Holds `Map<roomCode, RoomState>` in memory. |
| `server/diceRng.ts` (NEW) | Server-side `Math.random()` wrapper. Single function, easy to swap to seeded RNG later. |
| `server/gameLogic.ts` (NEW) | Reuses logic from `src/helpers/move.ts` etc. — extract pure functions (no Vuex) into a shared module both client and server import. **Sub-task this work**: (1) start with `getAvailableActions` + `getStrategicalAction`, refactor to take state as argument, test in isolation; (2) then `chooseAction` + `getStepsOfMoveAction`; (3) then `moveStepByStep` + `finishGame`. Do not attempt all helpers in one pass. |
| `src/net/transport.ts` (NEW) | Bridges Vuex actions ↔ server. In single-player, calls `store.dispatch` directly. In multiplayer, sends intent → awaits server response → applies returned **full state snapshot** (no diffs/patches — game state is small, snapshots are simpler and bug-free). |
| `src/net/client.ts` (NEW) | WebSocket wrapper: connect, reconnect-on-drop, message queue. |
| `src/net/types.ts` (NEW) | Shared message types: `Intent` (client→server), `ServerMessage` (server→client). |
| `src/helpers/board.ts`, `src/helpers/move.ts`, `src/helpers/dice.ts` | Replace direct `store.dispatch` calls for *shared game state* (board status, dice, marbles) with `transport.dispatch`. Keep direct dispatch for local-only state (UI, settings, animations). |
| `src/store/index.ts` | Add `applyServerSnapshot` mutation that **replaces** the relevant store slices from a full server snapshot. Add `mode` flag (single-player vs multiplayer). |
| `src/components/Dice.vue` | Animation must run from `diceInfo.value` *received from server*, not generated locally. (Already works this way — verify `Math.random()` only feeds the *visual* face, not the actual roll outcome.) |
| `package.json` | Add deps: `express`, `ws`, `qrcode-svg`. Add scripts: `dev:server`, `dev:full` (concurrent server + vite). |

### Critical refactor: dice authority

In single-player today, `helpers/dice.ts` calls `Math.random()` and writes to the store. In multiplayer, the client sends `{type: 'ROLL_DICE'}` and the server picks the value, writes to its state, and broadcasts. Animation in `Dice.vue` reads the final value from store — no client-side knowledge of the value before it arrives.

### Authority enforcement (server-side)

- Only the active player can `ROLL_DICE` / `MOVE_MARBLE`
- Only the current room creator can `START_GAME` / `PAUSE` / change settings / `CONTINUE_WITHOUT` / `REPLACE_WITH_AI`
- On room-creator disconnect, server auto-promotes longest-connected human player and broadcasts `OWNER_CHANGED`
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
| `src/components/MenuRoom.vue` | Listen for `OWNER_CHANGED` event; surface "You are now the room owner" toast if promoted. No game-over logic — server keeps running independently of any player. Add a **Leave Room** button that sends `LEAVE_ROOM` intent and routes back to home; treated identically to a disconnect on the server side. |
| `server/room.ts` | Add **idle-room sweeper**: cron-like check (every 5 min) drops any room with no socket activity for >2 hours from the in-memory `Map`. Frees memory on abandoned rooms. |

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
