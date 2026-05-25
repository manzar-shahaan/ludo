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
      const sharedCommons = state.list.filter((s: StepPlace) =>
        s[StepPlaceProps.SIDE] === 0 && !s[StepPlaceProps.STEP_TYPE].includes(StepType.FINAL)
      );
      return [
        ...getters.allBenchs,
        ...sharedCommons,
        ...getters.sideSteps({ side: 1 }),
        ...getters.sideSteps({ side: 2 }),
        ...getters.sideSteps({ side: 3 }),
        ...getters.sideSteps({ side: 4 }),
        getters.finalStep
      ];
    },
    allPaths: (state: any, getters: any) => ({ side }: Player) => {
      // Circuit: 4 sides each with 11 commons split into two segments around a corner junction.
      // Junctions are side=0 COMMON squares, looked up by position.
      // Path per player: 4×12 circuit tiles + 4 neutral home entries + 5 home endpoints + 1 final = 55.
      const c = (s: number): StepPlace[] => getters.sideCommons({ side: s });
      const home = (s: number): StepPlace[] => getters.sideEndpoints({ side: s });
      const junctionPos: Record<number, [number, number]> = {
        1: [9, 6], 2: [6, 7], 3: [6, 9], 4: [15, 9]
      };
      const j = (s: number): StepPlace[] => {
        const [r, col] = junctionPos[s];
        const step = state.list.find((st: StepPlace) =>
          st[StepPlaceProps.ROW] === r && st[StepPlaceProps.COLUMN] === col
        );
        return step ? [step] : [];
      };
      const homeEntryPos: Record<number, [number, number]> = {
        1: [15, 8], 2: [8, 1], 3: [1, 8], 4: [8, 15]
      };
      const homeEntry = (s: number): StepPlace[] => {
        const [r, col] = homeEntryPos[s];
        const step = state.list.find((st: StepPlace) =>
          st[StepPlaceProps.ROW] === r && st[StepPlaceProps.COLUMN] === col
        );
        return step ? [step] : [];
      };
      // territory(s): one side's 12-tile circuit segment in traversal order
      const territory = (s: number): StepPlace[] => {
        const commons = c(s);
        switch (s) {
          case 1: return [...commons.slice(0, 6), ...j(1), ...commons.slice(6)]; // Red B(6) + j + Red A(5)
          case 2: return [...commons.slice(0, 6), ...j(2), ...commons.slice(6)]; // Green B(6) + j + Green A(5)
          case 3: return [...commons.slice(0, 5), ...j(3), ...commons.slice(5)]; // Blue A(5) + j + Blue B(6)
          case 4: return [...commons, ...j(4)];                                   // Yellow A(6) + Yellow B(5) + j
        }
        return [];
      };
      switch (side) {
        case 1: return [...territory(1), ...territory(2), ...territory(3), ...territory(4), ...homeEntry(1), ...home(1), getters.finalStep];
        case 2: return [...territory(2), ...territory(3), ...territory(4), ...territory(1), ...homeEntry(2), ...home(2), getters.finalStep];
        case 3: return [...territory(3), ...territory(4), ...territory(1), ...territory(2), ...homeEntry(3), ...home(3), getters.finalStep];
        case 4: return [...territory(4), ...territory(1), ...territory(2), ...territory(3), ...homeEntry(4), ...home(4), getters.finalStep];
      }
    }
  }
};
