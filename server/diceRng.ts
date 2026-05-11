import type { DiceInfo, Player } from '../src/types/types.js';

export function rollDice(): number {
  return Math.ceil(Math.random() * 6);
}

export function makeDiceInfo(value: number, player: Player): DiceInfo {
  return {
    value,
    canMoveBench: value === 6,
    hasReward: value === 6,
    isDone: false,
    player,
  };
}
