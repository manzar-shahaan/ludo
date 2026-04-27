import { Player, Marble, PositionInBoard } from '@/types/types';
import { isSameStep, getPositionOfMarble } from '@/helpers';
import { listInitial } from '@/store/initials/marbles-initial';

function getMarbleIndexById(list: Marble[], marbleId: number) {
  return list.findIndex((m: Marble) => m.id === marbleId);
}

export default {
  namespaced: true,
  state: () => ({
    list: [] as Marble[],
    listInitial
  }),
  mutations: {
    update(state: any, marble: Marble) {
      const index = state.list.findIndex((m: Marble) => m.id === marble.id);
      state.list.splice(index, 1, marble);
    },
    setList(state: any, list: Marble[]) {
      state.list = list;
    },
    setItemMoveable(state: any, marble: Marble) {
      const target = state.list.find((m: Marble) => m.id === marble.id);
      if (target) target.isMoveable = true;
    }
  },
  actions: {
    update({ commit }: any, marble: Marble) {
      commit('update', marble);
    },
    updateSomeProps({ commit, state }: any, { marble, props }: { marble: Marble; props: object }) {
      const index = state.list.findIndex((m: Marble) => m.id === marble.id);
      const updatedMarble = { ...state.list[index], ...props };
      commit('update', updatedMarble);
    },
    reset({ commit }: any) {
      commit('setList', [...listInitial]);
    },
    remove({ commit }: any) {
      commit('setList', []);
    },
    setMoveableItems({ commit }: any, marbles: Marble[] = []) {
      marbles.forEach((m: Marble) => commit('update', { ...m, isMoveable: true }));
    },
    unsetMoveableAll({ commit, getters }: { commit: any; getters: any }) {
      getters.list.forEach((m: Marble) => commit('update', { ...m, isMoveable: false }));
    }
  },
  getters: {
    itemById: (state: any) => (marbleId: number) => state.list[getMarbleIndexById(state.list, marbleId)],
    list: (state: any): Marble[] => state.list,
    listByPlayer: (state: any, getters: any) => (player: Player) => getters.list.filter((m: Marble) => m.side === player.side),
    listInGame: (state: any, getters: any) => getters.list.filter((m: Marble) => m.isInGame === true),
    listInBench: (state: any, getters: any) => getters.list.filter((m: Marble) => m.isInGame === false),
    listInGameByPlayer: (state: any, getters: any) => (player: Player) => getters.list.filter((m: Marble) => m.side === player.side && m.isInGame === true),
    listInBenchByPlayer: (state: any, getters: any) => (player: Player) => getters.list.filter((m: Marble) => m.side === player.side && m.isInGame === false),
    listOtherPlayersMarblesByPosition: (state: any, getters: any) => (player: Player, position: PositionInBoard) =>
      getters.list.filter((m: Marble) => m.side !== player.side && isSameStep(getPositionOfMarble(m), position)),
    listPlayerMarblesByPosition: (state: any, getters: any) => (player: Player, position: PositionInBoard) =>
      getters.list.filter((m: Marble) => m.side === player.side && isSameStep(getPositionOfMarble(m), position)),
    listInitial: (state: any): Marble[] => state.listInitial,
    isAllAtFinal: (state: any, getters: any) => (player: Player) => {
      const playerMarbles = getters.listByPlayer(player);
      return playerMarbles.length && playerMarbles.every((m: Marble) => m.isAtFinal);
    }
  }
};
