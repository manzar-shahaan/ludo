import { BoardStatus, Player } from '@/types/types';
import store from '@/store/index';

const initialState: any = {
  shouldShowMenu: true,
  boardStatus: BoardStatus.INITIALIZING,
  playerActive: null,
  playerWinner: null,
  finishedPlayers: [] as Player[],
  diceInfo: {
    value: null,
    player: null,
    isDone: null
  }
};

export default {
  namespaced: true,
  state: () => ({ ...initialState, boardWidth: null }),
  mutations: {
    update(state: any, { key, value }: { key: string; value: any }) {
      state[key] = value;
    },
    addFinishedPlayer(state: any, player: Player) {
      state.finishedPlayers = [...state.finishedPlayers, player];
    },
    reset(state: any) {
      for (const key in initialState) {
        if (Object.prototype.hasOwnProperty.call(initialState, key)) {
          state[key] = initialState[key];
        }
      }
    }
  },
  actions: {
    update({ commit }: any, data: { key: string; value: any }) {
      commit('update', data);
    },
    addFinishedPlayer({ commit }: any, player: Player) {
      commit('addFinishedPlayer', player);
    },
    reset({ commit }: { commit: any }) {
      commit('reset');
    }
  },
  getters: {
    shouldShowMenu: (state: any) => state.shouldShowMenu,
    diceInfo: (state: any) => state.diceInfo,
    boardStatus: (state: any) => state.boardStatus,
    boardWidth: (state: any) => state.boardWidth,
    playerActive(state: any): Player | null {
      if (!state.playerActive) return null;
      return store.getters['players/itemById'](state.playerActive.id);
    },
    playerWinner(state: any): Player | null {
      if (!state.playerWinner) return null;
      return store.getters['players/itemById'](state.playerWinner.id);
    },
    finishedPlayers: (state: any): Player[] => state.finishedPlayers
  }
};
