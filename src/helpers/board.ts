import store from '@/store/index.ts';
import { BoardStatus, GameStatus, Player } from '@/types/types';
import { getRandom, wait } from '.';
import router from '@/router';
import { STORAGE_KEY, SLEEP_BEFORE_START_GAME } from '@/constants';

export function finishGame() {
  store.dispatch('board/update', {
    key: 'boardStatus',
    value: BoardStatus.FINISHED
  });
  store.dispatch('updateGameStatus', GameStatus.GAME_OVER);
  const finishedPlayers: Player[] = store.getters['board/finishedPlayers'];
  const winner = finishedPlayers[0] ?? store.getters['board/playerActive'];
  _setWinnerPlayer(winner);
  setShowMenu(true);
  saveGame('game finished');
}

export function setShowMenu(shouldShowMenu: boolean): void {
  store.dispatch('board/update', {
    key: 'shouldShowMenu',
    value: shouldShowMenu
  });
}

import type { PlayerSlot } from '@/store/modules/settings';

export async function startGame(roster?: PlayerSlot[]) {
  await resetGame();
  await addPlayers(roster);

  if (roster) {
    await store.dispatch('settings/setLastRoster', roster);
  }

  await store.dispatch('updateGameStatus', GameStatus.PLAYING);
  setShowMenu(false);
  await wait(SLEEP_BEFORE_START_GAME);
}

function _getRandomPlayer(): Player {
  const allPlayers = store.getters['players/list'];
  const random = Math.ceil(getRandom() * allPlayers.length);
  return allPlayers[random - 1];
}

export async function pauseGame() {
  await store.dispatch('updateGameStatus', GameStatus.PAUSED);
}

export function saveGame(reason: string) {
  store.dispatch('saveGame');
}
export async function quitGame() {
  await store.dispatch('updateGameStatus', GameStatus.NOT_STARTED);
  cleanupBoard();
  sessionStorage.removeItem(STORAGE_KEY);
  router.push({ name: 'home' });
}

export async function cleanupBoard() {
  await store.dispatch('marbles/remove');
  await store.dispatch('players/remove');
  await store.dispatch('board/reset');
}
export async function resetGame() {
  await store.dispatch('marbles/reset');
  await store.dispatch('players/remove');
  await store.dispatch('board/reset');
}
const PLAYER_COLORS = ['red', 'green', 'blue', 'yellow'];

export async function addPlayers(roster?: PlayerSlot[]) {
  const slots: PlayerSlot[] = roster ?? store.getters['settings/lastRoster'];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    await store.dispatch('players/add', {
      isAI: slot.isAI,
      isMain: !slot.isAI,
      name: slot.name,
      color: PLAYER_COLORS[i],
      isInGame: true
    });
  }
}

export async function changeTurn() {
  const playerActive = store.getters['board/playerActive'];
  const activePlayers: Player[] = store.getters['players/listInGame'];

  if (!playerActive || activePlayers.length === 0) {
    return _setPlayerActive(activePlayers[0] ?? null);
  }

  const currentIndex = activePlayers.findIndex((p: Player) => p.id === playerActive.id);
  // currentIndex is -1 when the active player was just marked as finished;
  // in that case start from index 0 to preserve order.
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activePlayers.length;
  await _setPlayerActive(activePlayers[nextIndex]);
}

async function _setPlayerActive(player: Player | null) {
  return store.dispatch('board/update', { key: 'playerActive', value: player });
}
async function _setWinnerPlayer(player: Player | null) {
  return store.dispatch('board/update', { key: 'playerWinner', value: player });
}

export function boardWidthUpdater({ boardElement }: { boardElement: HTMLDivElement }) {
  store.dispatch('board/update', {
    key: 'boardWidth',
    value: boardElement.clientWidth
  });
}
