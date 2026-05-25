import { StepPlace, StepType } from '@/types/types';

// 13×13 grid, center at (7,7).
// Home columns: col 7 (sides 1 & 3), row 7 (sides 2 & 4).
// Outer ring tracks: col 6 / row 8 (side 1), row 6 / col 6 (side 2),
//                   col 8 / row 6 (side 3), row 8 / col 8 (side 4).
// Corner-conversion: the last common of each side becomes the first endpoint
// of the neighboring side (same position, reassigned type & side).
// Path per player: 11 commons × 4 sides + 4 junction squares + 5 inner endpoints + 1 final = 54.
// Junction square = sideEndpoints(s)[0] (outermost); inner home = sideEndpoints(s).slice(1).

export const listInitial: StepPlace[] = [

  // ── side 1 (red, bottom-left) ────────────────────────────────────────────
  [12, 1, 1, [StepType.BENCH]],
  [12, 2, 1, [StepType.BENCH]],
  [13, 1, 1, [StepType.BENCH]],
  [13, 2, 1, [StepType.BENCH]],
  // 11 commons — approach col 6 (rows 13→8), then row 8 (cols 5→1)
  // corner (13,7) is side-4's converted last common → side-1's first endpoint
  [13, 6, 1, [StepType.COMMON]],
  [12, 6, 1, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [11, 6, 1, [StepType.COMMON]],
  [10, 6, 1, [StepType.COMMON]],
  [9,  6, 1, [StepType.COMMON]],
  [8,  6, 1, [StepType.COMMON]],
  [8,  5, 1, [StepType.COMMON]],
  [8,  4, 1, [StepType.COMMON]],
  [8,  3, 1, [StepType.COMMON]],
  [8,  2, 1, [StepType.COMMON]],
  [8,  1, 1, [StepType.COMMON]],
  // 6 endpoints — col 7 rows 13→8 (farthest from center first)
  // (13,7) is converted from side-4's last common
  [13, 7, 1, [StepType.ENDPOINT]],
  [12, 7, 1, [StepType.ENDPOINT]],
  [11, 7, 1, [StepType.ENDPOINT]],
  [10, 7, 1, [StepType.ENDPOINT]],
  [9,  7, 1, [StepType.ENDPOINT]],
  [8,  7, 1, [StepType.ENDPOINT]],

  // ── side 2 (green, top-left) ──────────────────────────────────────────────
  [1, 1, 2, [StepType.BENCH]],
  [1, 2, 2, [StepType.BENCH]],
  [2, 1, 2, [StepType.BENCH]],
  [2, 2, 2, [StepType.BENCH]],
  // 11 commons — approach row 6 (cols 1→6), then col 6 (rows 5→1)
  // corner (1,7) is side-2's converted last common → side-3's first endpoint
  [6, 1, 2, [StepType.COMMON]],
  [6, 2, 2, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [6, 3, 2, [StepType.COMMON]],
  [6, 4, 2, [StepType.COMMON]],
  [6, 5, 2, [StepType.COMMON]],
  [6, 6, 2, [StepType.COMMON]],
  [5, 6, 2, [StepType.COMMON]],
  [4, 6, 2, [StepType.COMMON]],
  [3, 6, 2, [StepType.COMMON]],
  [2, 6, 2, [StepType.COMMON]],
  [1, 6, 2, [StepType.COMMON]],
  // 6 endpoints — row 7 cols 1→6 (farthest from center first)
  // (7,1) is converted from side-1's last common
  [7, 1, 2, [StepType.ENDPOINT]],
  [7, 2, 2, [StepType.ENDPOINT]],
  [7, 3, 2, [StepType.ENDPOINT]],
  [7, 4, 2, [StepType.ENDPOINT]],
  [7, 5, 2, [StepType.ENDPOINT]],
  [7, 6, 2, [StepType.ENDPOINT]],

  // ── side 3 (blue, top-right) ──────────────────────────────────────────────
  [1, 12, 3, [StepType.BENCH]],
  [1, 13, 3, [StepType.BENCH]],
  [2, 12, 3, [StepType.BENCH]],
  [2, 13, 3, [StepType.BENCH]],
  // 11 commons — approach col 8 (rows 1→6), then row 6 (cols 9→13)
  // corner (7,13) is side-3's converted last common → side-4's first endpoint
  [1,  8, 3, [StepType.COMMON]],
  [2,  8, 3, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [3,  8, 3, [StepType.COMMON]],
  [4,  8, 3, [StepType.COMMON]],
  [5,  8, 3, [StepType.COMMON]],
  [6,  8, 3, [StepType.COMMON]],
  [6,  9, 3, [StepType.COMMON]],
  [6, 10, 3, [StepType.COMMON]],
  [6, 11, 3, [StepType.COMMON]],
  [6, 12, 3, [StepType.COMMON]],
  [6, 13, 3, [StepType.COMMON]],
  // 6 endpoints — col 7 rows 1→6 (farthest from center first)
  // (1,7) is converted from side-2's last common
  [1, 7, 3, [StepType.ENDPOINT]],
  [2, 7, 3, [StepType.ENDPOINT]],
  [3, 7, 3, [StepType.ENDPOINT]],
  [4, 7, 3, [StepType.ENDPOINT]],
  [5, 7, 3, [StepType.ENDPOINT]],
  [6, 7, 3, [StepType.ENDPOINT]],

  // ── side 4 (yellow, bottom-right) ────────────────────────────────────────
  [12, 12, 4, [StepType.BENCH]],
  [12, 13, 4, [StepType.BENCH]],
  [13, 12, 4, [StepType.BENCH]],
  [13, 13, 4, [StepType.BENCH]],
  // 11 commons — approach row 8 (cols 13→8), then col 8 (rows 9→13)
  // corner (13,7) note: this is side-1's first endpoint (converted from here)
  [8,  13, 4, [StepType.COMMON]],
  [8,  12, 4, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [8,  11, 4, [StepType.COMMON]],
  [8,  10, 4, [StepType.COMMON]],
  [8,   9, 4, [StepType.COMMON]],
  [8,   8, 4, [StepType.COMMON]],
  [9,   8, 4, [StepType.COMMON]],
  [10,  8, 4, [StepType.COMMON]],
  [11,  8, 4, [StepType.COMMON]],
  [12,  8, 4, [StepType.COMMON]],
  [13,  8, 4, [StepType.COMMON]],
  // 6 endpoints — row 7 cols 13→8 (farthest from center first)
  // (7,13) is converted from side-3's last common
  [7, 13, 4, [StepType.ENDPOINT]],
  [7, 12, 4, [StepType.ENDPOINT]],
  [7, 11, 4, [StepType.ENDPOINT]],
  [7, 10, 4, [StepType.ENDPOINT]],
  [7,  9, 4, [StepType.ENDPOINT]],
  [7,  8, 4, [StepType.ENDPOINT]],

  // ── final ─────────────────────────────────────────────────────────────────
  [7, 7, 0, [StepType.FINAL, StepType.SAFEZONE]]
];
