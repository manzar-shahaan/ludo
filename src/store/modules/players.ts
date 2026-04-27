import { Player } from '@/types/types';

export default {
  namespaced: true,
  state: () => ({ list: [] as Player[] }),
  mutations: {
    update(state: any, player: Player) {
      const index = state.list.findIndex((p: Player) => p.id === player.id);
      state.list.splice(index, 1, player);
    },
    setList(state: any, list: Player[]) {
      state.list = list;
    },
    add(state: any, player: Player) {
      state.list.push(player);
    }
  },
  actions: {
    remove({ commit }: { commit: any }) {
      commit('setList', []);
    },
    update({ commit }: { commit: any }, player: Player) {
      commit('update', player);
    },
    add({ commit, getters }: { commit: any; getters: any }, player: Player) {
      const playersCount = getters.list.length;
      const newPlayer = {
        id: playersCount + 1,
        side: playersCount + 1,
        name: `Player ${playersCount + 1}`,
        ...player
      };
      commit('add', newPlayer);
    }
  },
  getters: {
    list: (state: any) => state.list,
    itemById: (state: any) => (id: number) => state.list.find((p: Player) => p.id === id),
    itemBySide: (state: any) => (side: number) => state.list.find((p: Player) => p.side === side),
    listInGame: (state: any) => state.list.filter((p: Player) => p.isInGame),
    indexInListById: (state: any) => (playerId: number) => state.list.findIndex((p: Player) => p.id === playerId)
  }
};
