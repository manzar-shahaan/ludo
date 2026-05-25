export const MARBLE_ANIMATION_DURATION = 300;
export const SLEEP_BEFORE_START_GAME = 600;
export const SLEEP_BETWEEN_TURNS = 600;
export const SLEEP_AFTER_TURN_DICE = 900;
export const SLEEP_BETWEEN_MOVES = MARBLE_ANIMATION_DURATION + 100;
export const STEP_WIDTH = 6.0975609756; // percent — 15 cells × w + 14 gutters × (w/10) = 100 → w = 100/16.4
export const STEP_GUTTER = 0.6097560976; // percent — STEP_WIDTH / 10
export const PATH_STEPS_COUNT = 55; // 11 commons × 4 + 4 junctions + 6 home endpoints + 1 final = 55
export const STORAGE_KEY = 'store';
