import { StepType, Player, StepPlace, PositionInBoard, StepPlaceProps } from '@/types/types';
import { listInitial } from '@/store/initials/steps-initial';
import { isSameStep, getPositionOfStep, isSameStepPlace } from '@/helpers';

export default {
  namespaced: true,
  state: () => ({ list: listInitial }),
  mutations: {
    update(state: any, step: StepPlace) {
      const index = state.list.findIndex((s: StepPlace) => isSameStep(getPositionOfStep(s), getPositionOfStep(step)));
      state.list.splice(index, 1, step);
    }
  },
  actions: {
    update({ commit }: { commit: any }, step: StepPlace) {
      commit('update', step);
    },
    updateSomeProps({ commit, state }: any, { step, setType }: { step: StepPlace; setType: StepType }) {
      const index = state.list.findIndex((s: StepPlace) => isSameStepPlace(s, step));
      const types = [...state.list[index][StepPlaceProps.STEP_TYPE], setType];
      const updatedStep = [...state.list[index]] as StepPlace;
      updatedStep[StepPlaceProps.STEP_TYPE] = types;
      commit('update', updatedStep);
    }
  },
  getters: {
    getStepByPosition: (state: any) => (position: PositionInBoard) =>
      state.list.find((step: StepPlace) => step[StepPlaceProps.ROW] === position.row && step[StepPlaceProps.COLUMN] === position.column),
    allBenchs: (state: any) => state.list.filter((s: StepPlace) => s[StepPlaceProps.STEP_TYPE].includes(StepType.BENCH)),
    sideBenchs: (state: any) => ({ side }: Player) => state.list.filter((s: StepPlace) => s[StepPlaceProps.SIDE] === side && s[StepPlaceProps.STEP_TYPE].includes(StepType.BENCH)),
    sideCommons: (state: any) => ({ side }: Player) => state.list.filter((s: StepPlace) => s[StepPlaceProps.SIDE] === side && s[StepPlaceProps.STEP_TYPE].includes(StepType.COMMON)),
    sideEndpoints: (state: any) => ({ side }: Player) => state.list.filter((s: StepPlace) => s[StepPlaceProps.SIDE] === side && s[StepPlaceProps.STEP_TYPE].includes(StepType.ENDPOINT)),
    sideStartpoint: (state: any) => ({ side }: Player) => state.list.find((s: StepPlace) => s[StepPlaceProps.SIDE] === side && s[StepPlaceProps.STEP_TYPE].includes(StepType.STARTPOINT)),
    sideSteps: (state: any, getters: any) => ({ side }: Player) => [...getters.sideCommons({ side }), ...getters.sideEndpoints({ side })],
    finalStep: (state: any) => state.list.find((s: StepPlace) => s[StepPlaceProps.STEP_TYPE].includes(StepType.FINAL)),
    allSteps(state: any, getters: any) {
      return [
        ...getters.allBenchs,
        ...getters.sideSteps({ side: 1 }),
        ...getters.sideSteps({ side: 2 }),
        ...getters.sideSteps({ side: 3 }),
        ...getters.sideSteps({ side: 4 }),
        getters.finalStep
      ];
    },
    allPaths: (state: any, getters: any) => ({ side }: Player) => {
      switch (side) {
        case 1: return [...getters.sideCommons({ side: 1 }), ...getters.sideCommons({ side: 2 }), ...getters.sideCommons({ side: 3 }), ...getters.sideCommons({ side: 4 }), ...getters.sideEndpoints({ side: 1 }), getters.finalStep];
        case 2: return [...getters.sideCommons({ side: 2 }), ...getters.sideCommons({ side: 3 }), ...getters.sideCommons({ side: 4 }), ...getters.sideCommons({ side: 1 }), ...getters.sideEndpoints({ side: 2 }), getters.finalStep];
        case 3: return [...getters.sideCommons({ side: 3 }), ...getters.sideCommons({ side: 4 }), ...getters.sideCommons({ side: 1 }), ...getters.sideCommons({ side: 2 }), ...getters.sideEndpoints({ side: 3 }), getters.finalStep];
        case 4: return [...getters.sideCommons({ side: 4 }), ...getters.sideCommons({ side: 1 }), ...getters.sideCommons({ side: 2 }), ...getters.sideCommons({ side: 3 }), ...getters.sideEndpoints({ side: 4 }), getters.finalStep];
      }
    }
  }
};
