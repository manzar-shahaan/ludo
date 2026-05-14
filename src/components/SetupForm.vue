<template>
  <form class="setup" @submit.prevent="onSubmit">
    <div class="row">
      <label class="row-label">Total players</label>
      <div class="seg">
        <button
          v-for="n in [2, 3, 4]"
          :key="n"
          type="button"
          class="seg-btn"
          :class="{ active: totalCount === n }"
          @click="setTotalCount(n)"
        >{{ n }}</button>
      </div>
    </div>

    <div class="row">
      <label class="row-label">Players in person</label>
      <div class="seg">
        <button
          v-for="n in [1, 2, 3, 4].filter(n => n <= totalCount)"
          :key="n"
          type="button"
          class="seg-btn"
          :class="{ active: humanCount === n }"
          @click="setHumanCount(n)"
        >{{ n }}</button>
      </div>
    </div>

    <div class="row">
      <label class="row-label">Names</label>
      <div class="names">
        <div v-for="(name, i) in humanNames.slice(0, humanCount)" :key="i" class="name-row">
          <span class="name-dot" :class="`side-${i + 1}`" aria-hidden="true"></span>
          <input
            v-model="humanNames[i]"
            type="text"
            class="name-input"
            :placeholder="`Player ${i + 1}`"
            maxlength="14"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
        <div v-for="i in aiCount" :key="`ai-${i}`" class="name-row ai-row">
          <span class="name-dot" :class="`side-${humanCount + i}`" aria-hidden="true"></span>
          <span class="name-input ai-name">CPU {{ i }}</span>
          <span class="ai-tag">AI</span>
        </div>
      </div>
    </div>

    <button type="submit" class="ui-btn ui-btn--primary ui-btn--lg">
      {{ submitLabel }}
    </button>
  </form>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import store from '@/store/index';
import type { PlayerSlot } from '@/store/modules/settings';

export default defineComponent({
  name: 'SetupForm',

  props: {
    submitLabel: { type: String, default: 'Start Game' },
    initialRoster: { type: Array as PropType<PlayerSlot[]>, default: null }
  },

  emits: ['submit'],

  data() {
    const seed: PlayerSlot[] = this.initialRoster || store.getters['settings/lastRoster'];
    const humans = seed.filter((s) => !s.isAI);
    const totalCount = Math.max(2, Math.min(4, seed.length));
    const humanCount = Math.max(1, Math.min(totalCount, humans.length || 1));
    const humanNames = Array.from({ length: 4 }, (_, i) =>
      humans[i] ? humans[i].name : `Player ${i + 1}`
    );
    return { totalCount, humanCount, humanNames };
  },

  computed: {
    aiCount(): number {
      return this.totalCount - this.humanCount;
    }
  },

  methods: {
    setTotalCount(n: number) {
      this.totalCount = n;
      if (this.humanCount > n) this.humanCount = n;
    },
    setHumanCount(n: number) {
      this.humanCount = n;
    },
    onSubmit() {
      const roster: PlayerSlot[] = [];
      for (let i = 0; i < this.humanCount; i++) {
        const trimmed = (this.humanNames[i] || '').trim();
        roster.push({ name: trimmed || `Player ${i + 1}`, isAI: false });
      }
      for (let i = 0; i < this.aiCount; i++) {
        roster.push({ name: `CPU ${i + 1}`, isAI: true });
      }
      this.$emit('submit', roster);
    }
  }
});
</script>

<style lang="scss" scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  text-align: left;
}
.row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: $text-3;
}
.seg {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid $hairline;
  border-radius: $border-radius;
}
.seg-btn {
  padding: 0.55rem 0;
  font-family: $font-family-numeric;
  font-weight: 600;
  font-size: 1rem;
  color: $text-2;
  border-radius: 8px;
  transition: background 150ms $ease-out, color 150ms $ease-out;
  &:hover { color: $text-1; background: $surface; }
  &.active {
    background: $accent;
    color: #0b0d10;
  }
}
.names {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 0.75rem;
  background: $surface;
  border: 1px solid $hairline;
  border-radius: $border-radius-sm;
}
.name-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
}
.name-dot.side-1 { background: $brand-1; }
.name-dot.side-2 { background: $brand-2; }
.name-dot.side-3 { background: $brand-3; }
.name-dot.side-4 { background: $brand-4; }
.name-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: $text-1;
  font-size: 0.95rem;
  font-family: inherit;
  padding: 0;
  &.ai-name { color: $text-2; }
}
.name-input::placeholder { color: $text-3; }
.ai-row { opacity: 0.85; }
.ai-tag {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: $text-3;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid $hairline;
}
</style>
