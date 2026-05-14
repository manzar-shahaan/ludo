export const MARBLE_ANIMATION_DURATION = 300;
export const SLEEP_BEFORE_START_GAME = 600;
export const SLEEP_BETWEEN_TURNS = 600;
export const SLEEP_AFTER_TURN_DICE = 900;
export const SLEEP_BETWEEN_MOVES = MARBLE_ANIMATION_DURATION + 100;
export const STEP_WIDTH = 7.0422535211; // percent — 13 cells × w + 12 gutters × (w/10) = 100 → w = 100/14.2
export const STEP_GUTTER = 0.7042253521; // percent — STEP_WIDTH / 10
export const PATH_STEPS_COUNT = 54; // 11 commons × 4 sides + 4 junction squares + 5 inner endpoints + 1 final = 54
export const STORAGE_KEY = 'store';
