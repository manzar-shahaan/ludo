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
      isSafezonesEnabled: false
    },
    lastRoster: defaultRoster as PlayerSlot[]
  }),
  mutations: {
    setLastRoster(state: any, roster: PlayerSlot[]) {
      state.lastRoster = roster;
    }
  },
  actions: {
    setLastRoster({ commit }: any, roster: PlayerSlot[]) {
      commit('setLastRoster', roster);
    }
  },
  getters: {
    gamePlay: (state: any) => state.gamePlay,
    lastRoster: (state: any): PlayerSlot[] => state.lastRoster
  }
};
