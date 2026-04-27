<template>
  <div class="road">
    <Step
      v-for="step in steps"
      :key="`${step[SP.ROW]}-${step[SP.COLUMN]}-${step[SP.SIDE]}`"
      :style="getStepStyle(step)"
      :row="step[SP.ROW]"
      :column="step[SP.COLUMN]"
      :side="step[SP.SIDE]"
      :types="step[SP.STEP_TYPE]"
      :class="`step row-${step[SP.ROW]} column-${step[SP.COLUMN]}`"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store/index';
import Step from '@/components/Step.vue';
import { StepPlace, StepPlaceProps } from '@/types/types';
import { STEP_WIDTH, STEP_GUTTER } from '@/constants';

export default defineComponent({
  name: 'RoadGrid',
  components: { Step },

  data() {
    return { SP: StepPlaceProps };
  },

  computed: {
    steps(): StepPlace[] {
      return store.getters['steps/allSteps'];
    }
  },

  methods: {
    getStepStyle(step: StepPlace) {
      return {
        top:  `${(step[StepPlaceProps.ROW]    - 1) * (STEP_WIDTH + STEP_GUTTER)}%`,
        left: `${(step[StepPlaceProps.COLUMN] - 1) * (STEP_WIDTH + STEP_GUTTER)}%`
      };
    }
  }
});
</script>

<style lang="scss" scoped>
.road { position: relative; width: 100%; height: 100%; }
.step { position: absolute; }
</style>
