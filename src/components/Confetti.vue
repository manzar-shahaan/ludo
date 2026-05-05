<template>
  <div class="confetti-root" aria-hidden="true">
    <div
      v-for="(p, i) in particles"
      :key="i"
      class="particle"
      :style="p"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, CSSProperties } from 'vue';

const BRAND: Record<number, string> = {
  1: 'hsl(355,75%,62%)',
  2: 'hsl(140,50%,55%)',
  3: 'hsl(210,75%,62%)',
  4: 'hsl(45,85%,60%)',
};

export default defineComponent({
  name: 'Confetti',
  props: {
    side: { type: Number, required: true }
  },
  computed: {
    particles(): CSSProperties[] {
      const base = BRAND[this.side] || '#fff';
      return Array.from({ length: 72 }, (_, i) => {
        const isWhite = i % 4 === 0;
        const size = 6 + Math.random() * 7;
        return {
          left:              `${Math.random() * 100}%`,
          width:             `${size}px`,
          height:            `${size * (0.5 + Math.random())}px`,
          borderRadius:      Math.random() > 0.5 ? '50%' : '2px',
          background:        isWhite ? 'rgba(255,255,255,0.9)' : base,
          animationDelay:    `${(Math.random() * 1.2).toFixed(2)}s`,
          animationDuration: `${(2.2 + Math.random() * 1.6).toFixed(2)}s`,
        } as CSSProperties;
      });
    }
  }
});
</script>

<style scoped>
.confetti-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 200;
  overflow: hidden;
}
.particle {
  position: absolute;
  top: -14px;
  animation: confetti-fall linear forwards;
  opacity: 0.92;
}
@keyframes confetti-fall {
  0%   { transform: translateY(0)    rotate(0deg)   scaleX(1);   opacity: 0.95; }
  80%  { opacity: 0.9; }
  100% { transform: translateY(105vh) rotate(720deg) scaleX(0.6); opacity: 0; }
}
</style>
