export interface PlayerSlot {
  name: string;
  isAI: boolean;
}

const defaultRoster: PlayerSlot[] = [
  { name: 'Player 1', isAI: false },
  { name: 'CPU 1',    isAI: true  },
  { name: 'CPU 2',    isAI: true  },
  { name: 'CPU 3',    isAI: true  }
];

export default {
  namespaced: true,
  state: () => ({
    gamePlay: {
      isSafezonesEnabled: false,
      diceSpeed: 1.5
    },
    lastRoster: defaultRoster as PlayerSlot[]
  }),
  mutations: {
    setLastRoster(state: any, roster: PlayerSlot[]) {
      state.lastRoster = roster;
    },
    setGamePlay(state: any, patch: object) {
      state.gamePlay = { ...state.gamePlay, ...patch };
    }
  },
  actions: {
    setLastRoster({ commit }: any, roster: PlayerSlot[]) {
      commit('setLastRoster', roster);
    },
    setGamePlay({ commit }: any, patch: object) {
      commit('setGamePlay', patch);
    }
  },
  getters: {
    gamePlay: (state: any) => state.gamePlay,
    diceSpeed: (state: any): number => state.gamePlay.diceSpeed,
    lastRoster: (state: any): PlayerSlot[] => state.lastRoster
  }
};
