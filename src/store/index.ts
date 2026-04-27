import { createStore } from 'vuex';
import VuexPersistence from 'vuex-persist';
import steps from '@/store/modules/steps';
import players from '@/store/modules/players';
import marbles from '@/store/modules/marbles';
import settings from '@/store/modules/settings';
import board from '@/store/modules/board';
import { GameStatus } from '@/types/types';
import { STORAGE_KEY } from '@/constants';

const persistMutations: string[] = ['saveGame'];

const vuexLocal = new VuexPersistence({
  storage: window.sessionStorage,
  key: STORAGE_KEY,
  filter: (mutation: any) => persistMutations.indexOf(mutation.type) >= 0
});

const store = createStore({
  plugins: [vuexLocal.plugin],
  state: {
    appVersion: process.env.APP_VERSION || '0',
    buildDate: process.env.BUILD_DATE || '0',
    gameStatus: GameStatus.NOT_STARTED,
    lastSavedAt: null as number | null
  },
  mutations: {
    updateGameStatus(state: any, status: GameStatus) {
      state.gameStatus = status;
    },
    saveGame(state: any) {
      state.lastSavedAt = Date.now();
    }
  },
  actions: {
    updateGameStatus({ commit }: { commit: any }, status: GameStatus) {
      commit('updateGameStatus', status);
    },
    saveGame({ commit }: any) {
      commit('saveGame');
    }
  },
  getters: {
    gameStatus: (state: any) => state.gameStatus,
    appVersion: (state: any) => state.appVersion,
    buildDate: (state: any) => state.buildDate
  },
  modules: {
    steps,
    players,
    marbles,
    settings,
    board
  }
});

export default store;
