<template>
  <span
    @click="onClickMarble"
    class="marble"
    :class="[{ moveable: model.isMoveable, 'is-moving': model.isMoving }, `is-side-${model.side}`]"
    :style="getWrapperStyle()"
  >
    <span class="inner" :class="{ 'is-at-final': model.isAtFinal, 'no-animation': noAnimation }">
      <span class="gloss" aria-hidden="true"></span>
    </span>
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Marble } from '@/types/types';
import { STEP_WIDTH, STEP_GUTTER } from '@/constants';

export default defineComponent({
  name: 'MarblePiece',

  props: {
    model: { type: Object as PropType<Marble>, required: true }
  },

  data() {
    return { noAnimation: false };
  },

  mounted() {
    if (this.model.isAtFinal) this.noAnimation = true;
  },

  methods: {
    getWrapperStyle() {
      const step = STEP_WIDTH + STEP_GUTTER;
      return {
        left: `${(this.model.column - 1) * step}%`,
        top: `${(this.model.row - 1) * step}%`,
      };
    },
    onClickMarble() {
      this.$emit('clickmarble', this.model);
    }
  }
});
</script>

<style lang="scss" scoped>
.marble {
  position: absolute;
  transition: left #{$marble-animation-duration}ms $ease-out, top #{$marble-animation-duration}ms $ease-out;
  width: $step-width;
  height: $step-width;
  display: flex;
  align-items: center;
  justify-content: center;
}
.inner {
  position: relative;
  width: 78%;
  height: 78%;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45), inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18);
  transition: box-shadow 180ms $ease-out;
  &.is-at-final { animation: #{$marble-go-to-heaven-duration}ms linear 0s 1 scale-easeInBounce; transform: scale(0); }
  &.no-animation { animation: none; }
}
.gloss {
  position: absolute;
  top: 12%; left: 18%;
  width: 38%; height: 32%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(255,255,255,0) 70%);
  pointer-events: none;
}
.moveable {
  cursor: pointer;
  z-index: 2;
  .inner {
    box-shadow: 0 0 0 3px rgba(124,156,255,0.6), 0 2px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
    animation: pulse-ring 1600ms ease-out infinite;
  }
}
.is-moving { z-index: 2; }
.is-side-1 { z-index: 1; .inner { background: radial-gradient(circle at 35% 30%, color.adjust($brand-1, $lightness: 8%), color.adjust($brand-1, $lightness: -14%)); } }
.is-side-2 .inner { background: radial-gradient(circle at 35% 30%, color.adjust($brand-2, $lightness: 8%), color.adjust($brand-2, $lightness: -14%)); }
.is-side-3 .inner { background: radial-gradient(circle at 35% 30%, color.adjust($brand-3, $lightness: 8%), color.adjust($brand-3, $lightness: -14%)); }
.is-side-4 .inner { background: radial-gradient(circle at 35% 30%, color.adjust($brand-4, $lightness: 6%), color.adjust($brand-4, $lightness: -18%)); }
</style>
