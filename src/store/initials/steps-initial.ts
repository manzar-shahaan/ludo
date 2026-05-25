import { StepPlace, StepType } from '@/types/types';

// 15×15 grid, center at (8,8).
// 3-lane cross: outer lanes (col7/9, row7/9) carry the common path;
//               center lane (col8, row8) carries home arms.
// Junction squares (side=0, COMMON): Red=(9,6), Green=(6,7), Blue=(6,9), Yellow=(15,9).
// Path per player: 11 commons × 4 sides + 4 junctions + 4 home entries + 5 home endpoints + 1 final = 55.

export const listInitial: StepPlace[] = [

  // ── side 1 (red) ──────────────────────────────────────────────────────────
  [12, 3, 1, [StepType.BENCH]],
  [12, 4, 1, [StepType.BENCH]],
  [13, 3, 1, [StepType.BENCH]],
  [13, 4, 1, [StepType.BENCH]],
  // Commons in path order — Red B: col 7 rows 15→10 (startpoint at row 14)
  [15, 7, 1, [StepType.COMMON]],
  [14, 7, 1, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [13, 7, 1, [StepType.COMMON]],
  [12, 7, 1, [StepType.COMMON]],
  [11, 7, 1, [StepType.COMMON]],
  [10, 7, 1, [StepType.COMMON]],
  // Red A: row 9 cols 5→1
  [ 9, 5, 1, [StepType.COMMON]],
  [ 9, 4, 1, [StepType.COMMON]],
  [ 9, 3, 1, [StepType.COMMON, StepType.SAFEZONE]],
  [ 9, 2, 1, [StepType.COMMON]],
  [ 9, 1, 1, [StepType.COMMON]],
  // Home arm: col 8 rows 15→10 (outermost entry neutral, then 5 colored endpoints)
  [15, 8, 0, [StepType.COMMON]],
  [14, 8, 1, [StepType.ENDPOINT]],
  [13, 8, 1, [StepType.ENDPOINT]],
  [12, 8, 1, [StepType.ENDPOINT]],
  [11, 8, 1, [StepType.ENDPOINT]],
  [10, 8, 1, [StepType.ENDPOINT]],

  // ── side 2 (green) ────────────────────────────────────────────────────────
  [3, 3, 2, [StepType.BENCH]],
  [3, 4, 2, [StepType.BENCH]],
  [4, 3, 2, [StepType.BENCH]],
  [4, 4, 2, [StepType.BENCH]],
  // Commons in path order — Green B: row 7 cols 1→6 (startpoint at col 2)
  [7, 1, 2, [StepType.COMMON]],
  [7, 2, 2, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [7, 3, 2, [StepType.COMMON]],
  [7, 4, 2, [StepType.COMMON]],
  [7, 5, 2, [StepType.COMMON]],
  [7, 6, 2, [StepType.COMMON]],
  // Green A: col 7 rows 5→1
  [5, 7, 2, [StepType.COMMON]],
  [4, 7, 2, [StepType.COMMON]],
  [3, 7, 2, [StepType.COMMON, StepType.SAFEZONE]],
  [2, 7, 2, [StepType.COMMON]],
  [1, 7, 2, [StepType.COMMON]],
  // Home arm: row 8 cols 1→6 (outermost entry neutral, then 5 colored endpoints)
  [8, 1, 0, [StepType.COMMON]],
  [8, 2, 2, [StepType.ENDPOINT]],
  [8, 3, 2, [StepType.ENDPOINT]],
  [8, 4, 2, [StepType.ENDPOINT]],
  [8, 5, 2, [StepType.ENDPOINT]],
  [8, 6, 2, [StepType.ENDPOINT]],

  // ── side 3 (blue) ─────────────────────────────────────────────────────────
  [3, 12, 3, [StepType.BENCH]],
  [3, 13, 3, [StepType.BENCH]],
  [4, 12, 3, [StepType.BENCH]],
  [4, 13, 3, [StepType.BENCH]],
  // Commons in path order — Blue A: col 9 rows 1→5 (startpoint at row 2)
  [1,  9, 3, [StepType.COMMON]],
  [2,  9, 3, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [3,  9, 3, [StepType.COMMON]],
  [4,  9, 3, [StepType.COMMON]],
  [5,  9, 3, [StepType.COMMON]],
  // Blue B: row 7 cols 10→15
  [7, 10, 3, [StepType.COMMON]],
  [7, 11, 3, [StepType.COMMON]],
  [7, 12, 3, [StepType.COMMON]],
  [7, 13, 3, [StepType.COMMON, StepType.SAFEZONE]],
  [7, 14, 3, [StepType.COMMON]],
  [7, 15, 3, [StepType.COMMON]],
  // Home arm: col 8 rows 1→6 (outermost entry neutral, then 5 colored endpoints)
  [1, 8, 0, [StepType.COMMON]],
  [2, 8, 3, [StepType.ENDPOINT]],
  [3, 8, 3, [StepType.ENDPOINT]],
  [4, 8, 3, [StepType.ENDPOINT]],
  [5, 8, 3, [StepType.ENDPOINT]],
  [6, 8, 3, [StepType.ENDPOINT]],

  // ── side 4 (yellow) ───────────────────────────────────────────────────────
  [12, 12, 4, [StepType.BENCH]],
  [12, 13, 4, [StepType.BENCH]],
  [13, 12, 4, [StepType.BENCH]],
  [13, 13, 4, [StepType.BENCH]],
  // Commons in path order — Yellow A: row 9 cols 15→10 (startpoint at col 14)
  [ 9, 15, 4, [StepType.COMMON]],
  [ 9, 14, 4, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [ 9, 13, 4, [StepType.COMMON]],
  [ 9, 12, 4, [StepType.COMMON]],
  [ 9, 11, 4, [StepType.COMMON]],
  [ 9, 10, 4, [StepType.COMMON]],
  // Yellow B: col 9 rows 10→14
  [10,  9, 4, [StepType.COMMON]],
  [11,  9, 4, [StepType.COMMON]],
  [12,  9, 4, [StepType.COMMON]],
  [13,  9, 4, [StepType.COMMON, StepType.SAFEZONE]],
  [14,  9, 4, [StepType.COMMON]],
  // Home arm: row 8 cols 15→10 (outermost entry neutral, then 5 colored endpoints)
  [8, 15, 0, [StepType.COMMON]],
  [8, 14, 4, [StepType.ENDPOINT]],
  [8, 13, 4, [StepType.ENDPOINT]],
  [8, 12, 4, [StepType.ENDPOINT]],
  [8, 11, 4, [StepType.ENDPOINT]],
  [8, 10, 4, [StepType.ENDPOINT]],

  // ── junctions (side=0, COMMON) — in side order 1 2 3 4 ───────────────────
  [ 9, 6, 0, [StepType.COMMON]],  // Red's corner
  [ 6, 7, 0, [StepType.COMMON]],  // Green's corner
  [ 6, 9, 0, [StepType.COMMON]],  // Blue's corner
  [15, 9, 0, [StepType.COMMON]],  // Yellow's corner

  // ── final ─────────────────────────────────────────────────────────────────
  [8, 8, 0, [StepType.FINAL, StepType.SAFEZONE]]
];
