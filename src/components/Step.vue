<template>
  <span class="step">
    <span :class="getClasses()" class="inner"></span>
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { StepType } from '@/types/types';

export default defineComponent({
  name: 'StepCell',

  props: {
    row:    { type: Number, required: true },
    column: { type: Number, required: true },
    side:   { type: Number, required: true },
    types:  { type: Array as PropType<StepType[]>, required: true }
  },

  methods: {
    getClasses() {
      const result = this.types.map((t: StepType) => `type-${t}`);
      result.push(`side-${this.side}`);
      return result;
    }
  }
});
</script>

<style lang="scss" scoped>
.step {
  width: $step-width;
  height: $step-width;
  display: flex;
  justify-content: center;
  align-items: center;
}
.inner {
  position: relative;
  border-radius: 28%;
  background: $bg-3;
  box-shadow: inset 0 0 0 1px $hairline;
  width: 100%;
  height: 100%;
}

.type-2 {
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 38%;
    height: 38%;
    border-top: 2px solid rgba(255, 255, 255, 0.55);
    border-right: 2px solid rgba(255, 255, 255, 0.55);
    border-radius: 2px;
    transform-origin: center;
  }
  &.side-1::before { transform: translate(-50%, -50%) rotate(-45deg); }
  &.side-2::before { transform: translate(-50%, -50%) rotate(45deg); }
  &.side-3::before { transform: translate(-50%, -50%) rotate(135deg); }
  &.side-4::before { transform: translate(-50%, -50%) rotate(-135deg); }
}

.type-3 {
  width: 100%;
  height: 100%;
  border-radius: 28%;
  &.side-1 { background: rgba($brand-1, 0.22); box-shadow: inset 0 0 0 1px rgba($brand-1, 0.45); }
  &.side-2 { background: rgba($brand-2, 0.22); box-shadow: inset 0 0 0 1px rgba($brand-2, 0.45); }
  &.side-3 { background: rgba($brand-3, 0.22); box-shadow: inset 0 0 0 1px rgba($brand-3, 0.45); }
  &.side-4 { background: rgba($brand-4, 0.22); box-shadow: inset 0 0 0 1px rgba($brand-4, 0.45); }
}

.type-6 {
  background: linear-gradient(135deg, rgba($brand-1, 0.4), rgba($brand-3, 0.4));
  box-shadow: inset 0 0 0 1px $hairline-strong;
  &::before {
    content: '';
    position: absolute;
    inset: 22%;
    background: $bg-3;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }
}

.type-0 {
  background: $bg-3;
  box-shadow: inset 0 0 0 1px $hairline;
  &.side-1 { background: rgba($brand-1, 0.16); box-shadow: inset 0 0 0 1px rgba($brand-1, 0.32); }
  &.side-2 { background: rgba($brand-2, 0.16); box-shadow: inset 0 0 0 1px rgba($brand-2, 0.32); }
  &.side-3 { background: rgba($brand-3, 0.16); box-shadow: inset 0 0 0 1px rgba($brand-3, 0.32); }
  &.side-4 { background: rgba($brand-4, 0.16); box-shadow: inset 0 0 0 1px rgba($brand-4, 0.32); }
}

.type-4 {
  background-repeat: no-repeat;
  background-position: center;
  transition: opacity #{$step-go-to-heaven-duration}ms $ease-out #{$step-go-to-heaven-delay}ms;
  &::after {
    content: '';
    position: absolute;
    inset: 28%;
    border-radius: 50%;
    opacity: 0;
  }
  &.side-1::after { background: $brand-1; opacity: 1; }
  &.side-2::after { background: $brand-2; opacity: 1; }
  &.side-3::after { background: $brand-3; opacity: 1; }
  &.side-4::after { background: $brand-4; opacity: 1; }
}

.type-5 {
  box-shadow: inset 0 0 0 1px $hairline-strong;
  background: color.adjust($bg-3, $lightness: 4%);
}
</style>
