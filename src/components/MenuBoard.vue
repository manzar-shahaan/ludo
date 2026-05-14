<template>
  <nav class="menu-overlay" :class="{ 'game-over': playerWinner }">
    <div class="menu-card" :class="{ wide: showSetup }">
      <p v-if="playerWinner" class="winner">
        <span class="dot" :class="`side-${playerWinner.side}`"></span>
        <span class="name">{{ playerWinner.name }}</span>
        <span class="msg">won the game</span>
      </p>
      <p v-else-if="!showSetup" class="menu-title">Game</p>
      <p v-else class="menu-title">{{ playerWinner ? 'New Game' : 'New Game' }}</p>

      <SetupForm
        v-if="showSetup"
        :submit-label="playerWinner ? 'Play Again' : 'Start Game'"
        @submit="onStart"
      />

      <div v-if="!showSetup" class="actions">
        <button v-if="gameStatus === GameStatus.PLAYING" @click="onClickPause()"  class="ui-btn ui-btn--lg" type="button">Pause</button>
        <button v-if="gameStatus === GameStatus.PAUSED"  @click="onClickResume()" class="ui-btn ui-btn--primary ui-btn--lg" type="button">Resume</button>
        <button @click="onClickQuit()" class="ui-btn ui-btn--ghost" type="button">Quit</button>
      </div>

      <div class="settings-section">
        <div class="setting-row">
          <span class="setting-label">Roll Speed</span>
          <div class="speed-btns">
            <button v-for="opt in speedOptions" :key="opt.value"
              class="speed-btn" :class="{ active: diceSpeed === opt.value }"
              type="button" @click="setDiceSpeed(opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store/index';
import { GameStatus, BoardStatus, Player } from '@/types/types';
import { quitGame, pauseGame } from '@/helpers';
import SetupForm from '@/components/SetupForm.vue';
import type { PlayerSlot } from '@/store/modules/settings';

export default defineComponent({
  name: 'MenuBoard',

  components: { SetupForm },

  emits: ['start_game', 'resume_game'],

  data() {
    return {
      GameStatus,
      speedOptions: [
        { label: 'Fast',   value: 0.7 },
        { label: 'Normal', value: 1.5 },
        { label: 'Slow',   value: 2.5 },
      ]
    };
  },

  computed: {
    playerWinner(): Player { return store.getters['board/playerWinner']; },
    boardStatus(): BoardStatus { return store.getters['board/boardStatus']; },
    gameStatus(): GameStatus { return store.getters['gameStatus']; },
    showSetup(): boolean {
      return this.gameStatus === GameStatus.NOT_STARTED || this.gameStatus === GameStatus.GAME_OVER;
    },
    diceSpeed(): number { return store.getters['settings/diceSpeed']; }
  },

  methods: {
    onStart(roster: PlayerSlot[]) { this.$emit('start_game', roster); },
    onClickPause()  { pauseGame(); },
    onClickResume() { this.$emit('resume_game'); },
    onClickQuit()   { quitGame(); },
    setDiceSpeed(value: number) { store.dispatch('settings/setGamePlay', { diceSpeed: value }); }
  }
});
</script>

<style lang="scss" scoped>
.menu-overlay {
  @include absolute-cover;
  z-index: 5;
  display: grid;
  place-items: center;
  border-radius: $border-radius-lg;
  background: rgba(11, 13, 16, 0.6);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  animation: fade-in 200ms $ease-out;
}
.menu-card {
  width: min(360px, 86%);
  padding: 1.75rem;
  border-radius: $border-radius-lg;
  background: $bg-2;
  border: 1px solid $hairline;
  box-shadow: $shadow-2;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  text-align: center;
  animation: fade-in-up 280ms $ease-out;
  max-height: 90%;
  overflow-y: auto;
}
.menu-card.wide {
  width: min(420px, 92%);
}
.menu-title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: $text-3;
}
.winner {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  .dot {
    width: 16px; height: 16px; border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
  }
  .dot.side-1 { background: $brand-1; }
  .dot.side-2 { background: $brand-2; }
  .dot.side-3 { background: $brand-3; }
  .dot.side-4 { background: $brand-4; }
  .name { font-size: 1.4rem; font-weight: 700; color: $text-1; }
  .msg { color: $text-2; font-size: 0.95rem; }
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  .ui-btn { width: 100%; }
}
.settings-section {
  border-top: 1px solid $hairline;
  padding-top: 1rem;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.setting-label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: $text-3;
  white-space: nowrap;
}
.speed-btns {
  display: flex;
  gap: 0.35rem;
}
.speed-btn {
  padding: 0.3rem 0.75rem;
  border-radius: $border-radius;
  border: 1px solid $hairline;
  background: $surface;
  color: $text-2;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms, border-color 150ms, color 150ms;
  &:hover { background: $surface-strong; color: $text-1; }
  &.active { background: $accent-soft; border-color: $accent; color: $accent; font-weight: 600; }
}

@media (max-width: 700px) {
  // Override the absolute-cover mixin — needs !important because mixin and
  // media-query rules share equal specificity in scoped CSS.
  .menu-overlay {
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    border-radius: 0;
    z-index: 30;
    // Fully opaque so the board behind doesn't create a second visual container
    background: $bg-1;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    // Stack content from top, let overlay scroll
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow-y: auto;
    padding: 2rem 1rem env(safe-area-inset-bottom, 1rem);
  }
  // Card merges visually into the overlay — one unified surface
  .menu-card {
    background: transparent;
    border: none;
    box-shadow: none;
    width: 100%;
    max-width: 480px;
    max-height: none;
    overflow-y: visible;
    padding: 0;
  }
}
</style>
