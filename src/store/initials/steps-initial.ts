import { StepPlace, StepType } from '@/types/types';

export const listInitial: StepPlace[] = [
  // side 1
  [10, 1, 1, [StepType.BENCH]],
  [10, 2, 1, [StepType.BENCH]],
  [11, 1, 1, [StepType.BENCH]],
  [11, 2, 1, [StepType.BENCH]],
  // commons (9 steps — corner (6,1) is now side-2's endpoint entry)
  [11, 5, 1, [StepType.COMMON]],
  [10, 5, 1, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [9, 5, 1, [StepType.COMMON]],
  [8, 5, 1, [StepType.COMMON]],
  [7, 5, 1, [StepType.COMMON]],
  [7, 4, 1, [StepType.COMMON]],
  [7, 3, 1, [StepType.COMMON]],
  [7, 2, 1, [StepType.COMMON]],
  [7, 1, 1, [StepType.COMMON]],
  // endpoints (5 steps, farthest-from-center first)
  [11, 6, 1, [StepType.ENDPOINT]],
  [10, 6, 1, [StepType.ENDPOINT]],
  [9, 6, 1, [StepType.ENDPOINT]],
  [8, 6, 1, [StepType.ENDPOINT]],
  [7, 6, 1, [StepType.ENDPOINT]],

  // side 2
  [1, 1, 2, [StepType.BENCH]],
  [1, 2, 2, [StepType.BENCH]],
  [2, 1, 2, [StepType.BENCH]],
  [2, 2, 2, [StepType.BENCH]],
  // commons (9 steps — corner (1,6) is now side-3's endpoint entry)
  [5, 1, 2, [StepType.COMMON]],
  [5, 2, 2, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [5, 3, 2, [StepType.COMMON]],
  [5, 4, 2, [StepType.COMMON]],
  [5, 5, 2, [StepType.COMMON]],
  [4, 5, 2, [StepType.COMMON]],
  [3, 5, 2, [StepType.COMMON]],
  [2, 5, 2, [StepType.COMMON]],
  [1, 5, 2, [StepType.COMMON]],
  // endpoints (5 steps, farthest-from-center first)
  [6, 1, 2, [StepType.ENDPOINT]],
  [6, 2, 2, [StepType.ENDPOINT]],
  [6, 3, 2, [StepType.ENDPOINT]],
  [6, 4, 2, [StepType.ENDPOINT]],
  [6, 5, 2, [StepType.ENDPOINT]],

  // side 3
  [1, 10, 3, [StepType.BENCH]],
  [1, 11, 3, [StepType.BENCH]],
  [2, 10, 3, [StepType.BENCH]],
  [2, 11, 3, [StepType.BENCH]],
  // commons (9 steps — corner (6,11) is now side-4's endpoint entry)
  [1, 7, 3, [StepType.COMMON]],
  [2, 7, 3, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [3, 7, 3, [StepType.COMMON]],
  [4, 7, 3, [StepType.COMMON]],
  [5, 7, 3, [StepType.COMMON]],
  [5, 8, 3, [StepType.COMMON]],
  [5, 9, 3, [StepType.COMMON]],
  [5, 10, 3, [StepType.COMMON]],
  [5, 11, 3, [StepType.COMMON]],
  // endpoints (5 steps, farthest-from-center first)
  [1, 6, 3, [StepType.ENDPOINT]],
  [2, 6, 3, [StepType.ENDPOINT]],
  [3, 6, 3, [StepType.ENDPOINT]],
  [4, 6, 3, [StepType.ENDPOINT]],
  [5, 6, 3, [StepType.ENDPOINT]],

  // side 4
  [10, 10, 4, [StepType.BENCH]],
  [10, 11, 4, [StepType.BENCH]],
  [11, 10, 4, [StepType.BENCH]],
  [11, 11, 4, [StepType.BENCH]],
  // commons (9 steps — corner (11,6) is now side-1's endpoint entry)
  [7, 11, 4, [StepType.COMMON]],
  [7, 10, 4, [StepType.COMMON, StepType.STARTPOINT, StepType.SAFEZONE]],
  [7, 9, 4, [StepType.COMMON]],
  [7, 8, 4, [StepType.COMMON]],
  [7, 7, 4, [StepType.COMMON]],
  [8, 7, 4, [StepType.COMMON]],
  [9, 7, 4, [StepType.COMMON]],
  [10, 7, 4, [StepType.COMMON]],
  [11, 7, 4, [StepType.COMMON]],
  // endpoints (5 steps, farthest-from-center first)
  [6, 11, 4, [StepType.ENDPOINT]],
  [6, 10, 4, [StepType.ENDPOINT]],
  [6, 9, 4, [StepType.ENDPOINT]],
  [6, 8, 4, [StepType.ENDPOINT]],
  [6, 7, 4, [StepType.ENDPOINT]],

  // final step
  [6, 6, 0, [StepType.FINAL, StepType.SAFEZONE]]
];
