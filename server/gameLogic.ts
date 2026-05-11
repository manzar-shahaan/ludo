// Pure game logic — no Vuex, no browser APIs.
// All functions take explicit state arguments and return values.
import { StepType, StepPlaceProps, MoveType } from '../src/types/types.js';
import type { StepPlace, Marble, Player, MoveAction, PositionInBoard, DiceInfo } from '../src/types/types.js';
import { listInitial as marblesInitial } from '../src/store/initials/marbles-initial.js';
import { PATH_STEPS_COUNT } from '../src/constants.js';

// ─── Position helpers ─────────────────────────────────────────────────────────

export function pos(step: StepPlace): PositionInBoard {
  return { row: step[StepPlaceProps.ROW], column: step[StepPlaceProps.COLUMN] };
}

export function samePos(a: PositionInBoard, b: PositionInBoard): boolean {
  return a.row === b.row && a.column === b.column;
}

export function marblePos(m: Marble): PositionInBoard {
  return { row: m.row, column: m.column };
}

// ─── Step queries ─────────────────────────────────────────────────────────────

export function sideCommons(steps: StepPlace[], side: number): StepPlace[] {
  return steps.filter(s =>
    s[StepPlaceProps.SIDE] === side &&
    s[StepPlaceProps.STEP_TYPE].includes(StepType.COMMON)
  );
}

export function sideEndpoints(steps: StepPlace[], side: number): StepPlace[] {
  return steps.filter(s =>
    s[StepPlaceProps.SIDE] === side &&
    s[StepPlaceProps.STEP_TYPE].includes(StepType.ENDPOINT)
  );
}

export function sideStartpoint(steps: StepPlace[], side: number): StepPlace | undefined {
  return steps.find(s =>
    s[StepPlaceProps.SIDE] === side &&
    s[StepPlaceProps.STEP_TYPE].includes(StepType.STARTPOINT)
  );
}

export function finalStep(steps: StepPlace[]): StepPlace {
  return steps.find(s => s[StepPlaceProps.STEP_TYPE].includes(StepType.FINAL))!;
}

export function stepAtPos(steps: StepPlace[], p: PositionInBoard): StepPlace | undefined {
  return steps.find(s => samePos(pos(s), p));
}

export function isSafe(steps: StepPlace[], p: PositionInBoard): boolean {
  const sp = stepAtPos(steps, p);
  const types = sp?.[StepPlaceProps.STEP_TYPE] ?? [];
  return types.includes(StepType.SAFEZONE) || types.includes(StepType.FINAL);
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function pathForSide(steps: StepPlace[], side: number): StepPlace[] {
  const order = ([1, 2, 3, 4].slice(side - 1) as number[]).concat([1, 2, 3, 4].slice(0, side - 1));
  return [
    ...order.flatMap(s => sideCommons(steps, s)),
    ...sideEndpoints(steps, side),
    finalStep(steps),
  ];
}

export function distanceBetween(steps: StepPlace[], side: number, from: PositionInBoard, to: PositionInBoard): number {
  const path = pathForSide(steps, side);
  const i1 = path.findIndex(s => samePos(pos(s), from));
  const i2 = path.findIndex(s => samePos(pos(s), to));
  return i2 - i1;
}

export function posAfterMove(steps: StepPlace[], side: number, from: PositionInBoard, amount: number): PositionInBoard {
  const path = pathForSide(steps, side);
  const idx = path.findIndex(s => samePos(pos(s), from));
  const target = path[idx + amount];
  if (!target) throw new Error(`Out of path: side=${side} from=${JSON.stringify(from)} amount=${amount}`);
  return pos(target);
}

export function pathStepsBetween(steps: StepPlace[], action: MoveAction): StepPlace[] {
  const path = pathForSide(steps, action.marble.side);
  const i1 = path.findIndex(s => samePos(pos(s), action.from));
  const i2 = path.findIndex(s => samePos(pos(s), action.to));
  return path.slice(i1 + 1, i2 + 1);
}

// ─── Available actions ────────────────────────────────────────────────────────

export function availableActions(steps: StepPlace[], marbles: Marble[], player: Player, diceInfo: DiceInfo): MoveAction[] {
  const actions: MoveAction[] = [];
  const fp = pos(finalStep(steps));

  if (diceInfo.canMoveBench) {
    const sp = sideStartpoint(steps, player.side);
    if (sp) {
      const to = pos(sp);
      marbles
        .filter(m => m.side === player.side && !m.isInGame)
        .forEach(marble => actions.push({ from: marblePos(marble), to, type: MoveType.BENCH, marble }));
    }
  }

  marbles
    .filter(m => m.side === player.side && m.isInGame)
    .forEach(marble => {
      const from = marblePos(marble);
      const dist = distanceBetween(steps, player.side, from, fp);
      if (diceInfo.value <= dist) {
        try {
          const to = posAfterMove(steps, player.side, from, diceInfo.value);
          actions.push({ from, to, type: MoveType.IN_GAME, marble });
        } catch { /* out of range */ }
      }
    });

  return actions;
}

// Multiple distinct choices = in-game moves > 1, or both bench and in-game
export function hasMultipleChoices(actions: MoveAction[]): boolean {
  const bench = actions.filter(a => a.type === MoveType.BENCH).length;
  const inGame = actions.filter(a => a.type === MoveType.IN_GAME).length;
  return inGame + (bench > 0 ? 1 : 0) > 1;
}

// ─── AI: choose best action ───────────────────────────────────────────────────

function scoreAction(steps: StepPlace[], marbles: Marble[], action: MoveAction, safezonesOn: boolean): number {
  let score = 0;
  const fp = pos(finalStep(steps));

  const kickouts = marbles.filter(m => {
    if (m.side === action.marble.side || !m.isInGame) return false;
    return samePos(marblePos(m), action.to) && !isSafe(steps, action.to);
  });
  if (kickouts.length > 0) score += 10;
  if (!action.marble.isInGame) score += 5;

  const dist = distanceBetween(steps, action.marble.side, action.to, fp);
  score += (PATH_STEPS_COUNT - Math.max(0, dist)) / PATH_STEPS_COUNT;

  if (safezonesOn) {
    if (isSafe(steps, action.to)) score += 4;
    if (isSafe(steps, action.from)) score -= 2;
  }
  return score;
}

export function chooseAction(steps: StepPlace[], marbles: Marble[], actions: MoveAction[], safezonesOn: boolean): MoveAction {
  let best = actions[0];
  let bestScore = -Infinity;
  for (const a of actions) {
    const s = scoreAction(steps, marbles, a, safezonesOn);
    if (s > bestScore) { bestScore = s; best = a; }
  }
  return best;
}

// ─── State mutations (return new arrays, never mutate) ────────────────────────

export function applyMarblePos(marbles: Marble[], id: number, p: PositionInBoard, patch: Partial<Marble> = {}): Marble[] {
  return marbles.map(m => m.id === id ? { ...m, row: p.row, column: p.column, ...patch } : m);
}

export function kickMarbles(steps: StepPlace[], marbles: Marble[], targetPos: PositionInBoard, actorSide: number): Marble[] {
  return marbles.map(m => {
    if (m.side === actorSide || !m.isInGame) return m;
    if (!samePos(marblePos(m), targetPos)) return m;
    if (isSafe(steps, targetPos)) return m;
    return { ...marblesInitial.find(init => init.id === m.id)! };
  });
}

export function isAllAtFinal(marbles: Marble[], side: number): boolean {
  const mine = marbles.filter(m => m.side === side);
  return mine.length > 0 && mine.every(m => m.isAtFinal);
}
