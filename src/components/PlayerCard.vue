<template>
  <div class="player-card" :class="[`side-${player.side}`, { active: isActive }]">
    <div class="dot" aria-hidden="true"></div>
    <div class="meta">
      <div class="name">
        {{ player.name }}
        <span v-if="player.isAI" class="tag">AI</span>
      </div>
      <div class="progress">
        <span class="count">{{ marblesHome }}/{{ marblesTotal }}</span>
        <span class="label">home</span>
      </div>
    </div>
    <div v-if="isActive" class="active-pill">Turn</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import store from '@/store/index';
import { Player, Marble } from '@/types/types';

export default defineComponent({
  name: 'PlayerCard',

  props: {
    player: { type: Object as PropType<Player>, required: true }
  },

  computed: {
    activePlayer(): Player | null {
      return store.getters['board/playerActive'];
    },
    isActive(): boolean {
      return !!this.activePlayer && this.activePlayer.id === this.player.id;
    },
    marbles(): Marble[] {
      return store.getters['marbles/listByPlayer'](this.player) || [];
    },
    marblesHome(): number {
      return this.marbles.filter((m: Marble) => m.isAtFinal).length;
    },
    marblesTotal(): number {
      return this.marbles.length || 4;
    }
  }
});
</script>

<style lang="scss" scoped>
.player-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: $border-radius;
  background: $surface;
  border: 1px solid $hairline;
  transition: background 180ms $ease-out, border-color 180ms $ease-out, transform 180ms $ease-out;
}
.player-card.active {
  background: $surface-strong;
  border-color: $hairline-strong;
  transform: translateY(-1px);
}
.dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
}
.side-1 .dot { background: $brand-1; }
.side-2 .dot { background: $brand-2; }
.side-3 .dot { background: $brand-3; }
.side-4 .dot { background: $brand-4; }
.side-1.active .dot { box-shadow: 0 0 0 4px rgba(231,76,99,0.18), inset 0 0 0 1px rgba(255,255,255,0.18); }
.side-2.active .dot { box-shadow: 0 0 0 4px rgba(102,191,122,0.18), inset 0 0 0 1px rgba(255,255,255,0.18); }
.side-3.active .dot { box-shadow: 0 0 0 4px rgba(94,154,232,0.18), inset 0 0 0 1px rgba(255,255,255,0.18); }
.side-4.active .dot { box-shadow: 0 0 0 4px rgba(232,198,81,0.18), inset 0 0 0 1px rgba(255,255,255,0.18); }
.meta { min-width: 0; }
.name {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 600; font-size: 0.95rem; color: $text-1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tag {
  font-size: 0.65rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: $text-3; padding: 1px 6px; border-radius: 999px; border: 1px solid $hairline;
}
.progress { display: flex; align-items: baseline; gap: 0.4rem; margin-top: 2px; }
.count { font-family: $font-family-numeric; font-weight: 600; color: $text-1; }
.label { color: $text-3; font-size: 0.8rem; }
.active-pill {
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 4px 8px; border-radius: 999px; background: $accent-soft; color: $accent;
}
</style>
