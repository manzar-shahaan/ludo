<template>
  <div class="dice-area">
    <div class="dice-wrap" :class="[`side-${side}`, { rolling: isRolling, idle: shouldShowWaitingDice, hidden: !shouldRender }]">
      <div class="die" :class="`face-${displayValue}`" :key="animKey">
        <span v-for="n in 9" :key="n" class="pip" :data-pip="n"></span>
      </div>
    </div>

    <transition name="callout">
      <div v-if="showResult" class="callout">
        <span class="callout-name" :class="`side-${side}`">{{ playerActive?.name }}</span>
        <span class="callout-text">rolled</span>
        <span class="callout-value">{{ diceInfo.value }}</span>
      </div>
    </transition>

    <button v-if="shouldShowWaitingDice" class="ui-btn ui-btn--primary roll-btn" type="button" @click="onClickTurn()">
      Roll <span class="kbd">space</span>
    </button>
    <p v-else-if="shouldRender" class="hint">{{ hint }}</p>
    <p v-else class="hint dim">Waiting for game to start…</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { BoardStatus, Player, DiceInfo } from '@/types/types';
import store from '@/store/index';

export default defineComponent({
  name: 'DiceRoller',

  data() {
    return {
      isRolling: false,
      rollingFace: 1,
      animKey: 0,
      calloutReady: false,
      calloutTimerId: 0 as ReturnType<typeof setTimeout>,
      BoardStatus
    };
  },

  computed: {
    side(): number {
      return this.playerActive ? this.playerActive.side : 0;
    },
    playerActive(): Player {
      return store.getters['board/playerActive'];
    },
    diceInfo(): DiceInfo {
      return store.getters['board/diceInfo'];
    },
    boardStatus(): number {
      return store.getters['board/boardStatus'];
    },
    diceSpeed(): number {
      return store.getters['settings/diceSpeed'] ?? 1.5;
    },
    shouldShowWaitingDice(): boolean {
      return this.boardStatus === BoardStatus.WAITING_TURN_DICE && !this.playerActive?.isAI;
    },
    shouldShowResult(): boolean {
      return [BoardStatus.TURNING_DICE, BoardStatus.PLAYER_IS_THINKING, BoardStatus.MOVING_MARBLES].includes(this.boardStatus);
    },
    shouldRender(): boolean {
      return this.shouldShowResult || this.shouldShowWaitingDice;
    },
    showResult(): boolean {
      return this.calloutReady
        && !!this.diceInfo?.value
        && this.shouldShowResult;
    },
    displayValue(): number {
      return this.isRolling ? this.rollingFace : (this.diceInfo?.value || 1);
    },
    hint(): string {
      if (this.isRolling) return 'Rolling…';
      if (this.boardStatus === BoardStatus.PLAYER_IS_THINKING) {
        return !this.playerActive?.isAI ? 'Pick a marble' : `${this.playerActive?.name ?? ''} is thinking…`;
      }
      if (this.boardStatus === BoardStatus.MOVING_MARBLES) return 'Moving…';
      return '';
    }
  },

  watch: {
    boardStatus(next: number) {
      if (next === BoardStatus.TURNING_DICE) this.startRollAnimation();
    }
  },

  mounted() {
    // If the component mounts while TURNING_DICE is already set (common for AI where
    // the store update and component mount race), the watcher misses the change.
    if (this.boardStatus === BoardStatus.TURNING_DICE) this.startRollAnimation();
  },

  beforeUnmount() {
    clearTimeout(this.calloutTimerId);
  },

  methods: {
    startRollAnimation() {
      if (this.isRolling) return;
      clearTimeout(this.calloutTimerId);
      this.calloutReady = false;
      this.isRolling = true;
      this.animKey++;

      // All intervals scale with diceSpeed so the total duration is proportional.
      // The curve shape (accel → peak → decel) is the same at every speed.
      const scale = this.diceSpeed / 1.5;  // 1.0 at Normal, <1 at Fast, >1 at Slow
      const peakDelay  = 12  * scale;  // fastest tick interval
      const stopDelay  = 300 * scale;  // interval at which decel phase ends
      const PEAK_TICKS = 3;            // ticks held at peak before decelerating

      let delay    = 70 * scale;  // starting interval (medium — will accelerate)
      let peaked   = false;
      let peakTick = 0;

      const tick = () => {
        this.rollingFace = 1 + Math.floor(Math.random() * 6);

        if (!peaked) {
          delay *= 0.65;              // accelerate sharply — intervals shrink very fast
          if (delay <= peakDelay) {
            delay  = peakDelay;
            peaked = true;
          }
        } else if (peakTick < PEAK_TICKS) {
          peakTick++;                 // stay at peak speed for a few ticks
        } else {
          delay *= 1.18;             // decelerate gently — grinding to a halt
          if (delay >= stopDelay) {
            // Die has come to rest; show the final face then trigger callout after 2 s.
            setTimeout(() => {
              this.isRolling = false;
              this.animKey++;
              this.calloutTimerId = setTimeout(() => {
                this.calloutReady = true;
              }, 2000);
            }, 80 * scale);
            return;
          }
        }

        setTimeout(tick, delay);
      };

      setTimeout(tick, delay);
    },

    onClickTurn() {
      this.$emit('turn_dice');
    }
  }
});
</script>

<style lang="scss" scoped>
.dice-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1rem;
}
.dice-wrap {
  width: 84px; height: 84px;
  display: grid; place-items: center;
  perspective: 600px;
  transition: opacity 200ms $ease-out;
  &.hidden { opacity: 0; pointer-events: none; }
  &.idle .die { animation: dice-settle 600ms $ease-out, pulse-ring 1800ms ease-out infinite; }
  &.rolling .die { animation: dice-spin 300ms ease-out; }
}
.die {
  position: relative;
  width: 76px; height: 76px;
  border-radius: 16px;
  background: linear-gradient(160deg, #f4f5f8, #d8dbe2);
  box-shadow: 0 6px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.08);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 12px; gap: 4px;
  transform-style: preserve-3d;
  will-change: transform;
}
.pip {
  width: 11px; height: 11px;
  align-self: center; justify-self: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a4f5a, #1a1d22);
  opacity: 0;
}
.face-1 .pip[data-pip="5"] { opacity: 1; }
.face-2 .pip[data-pip="1"], .face-2 .pip[data-pip="9"] { opacity: 1; }
.face-3 .pip[data-pip="1"], .face-3 .pip[data-pip="5"], .face-3 .pip[data-pip="9"] { opacity: 1; }
.face-4 .pip[data-pip="1"], .face-4 .pip[data-pip="3"], .face-4 .pip[data-pip="7"], .face-4 .pip[data-pip="9"] { opacity: 1; }
.face-5 .pip[data-pip="1"], .face-5 .pip[data-pip="3"], .face-5 .pip[data-pip="5"], .face-5 .pip[data-pip="7"], .face-5 .pip[data-pip="9"] { opacity: 1; }
.face-6 .pip[data-pip="1"], .face-6 .pip[data-pip="3"], .face-6 .pip[data-pip="4"], .face-6 .pip[data-pip="6"], .face-6 .pip[data-pip="7"], .face-6 .pip[data-pip="9"] { opacity: 1; }
.side-1 .pip { background: radial-gradient(circle at 35% 30%, color.adjust($brand-1, $lightness: 8%), color.adjust($brand-1, $lightness: -18%)); }
.side-2 .pip { background: radial-gradient(circle at 35% 30%, color.adjust($brand-2, $lightness: 8%), color.adjust($brand-2, $lightness: -18%)); }
.side-3 .pip { background: radial-gradient(circle at 35% 30%, color.adjust($brand-3, $lightness: 8%), color.adjust($brand-3, $lightness: -18%)); }
.side-4 .pip { background: radial-gradient(circle at 35% 30%, color.adjust($brand-4, $lightness: 8%), color.adjust($brand-4, $lightness: -22%)); }
.roll-btn { min-width: 130px; }
.kbd {
  font-family: $font-family-numeric; font-size: 0.7rem;
  padding: 2px 6px; border-radius: 6px;
  background: rgba(0,0,0,0.18); color: rgba(11,13,16,0.7);
}
.hint { font-size: 0.85rem; color: $text-2; min-height: 1.2rem; text-align: center; &.dim { color: $text-3; } }

.callout {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.6rem 0.9rem;
  border-radius: $border-radius;
  background: $surface-strong;
  border: 1px solid $hairline-strong;
  text-align: center;
}
.callout-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: $text-1;
  &.side-1 { color: color.adjust($brand-1, $lightness: 12%); }
  &.side-2 { color: color.adjust($brand-2, $lightness: 12%); }
  &.side-3 { color: color.adjust($brand-3, $lightness: 12%); }
  &.side-4 { color: color.adjust($brand-4, $lightness: 12%); }
}
.callout-text {
  font-size: 0.85rem;
  color: $text-2;
}
.callout-value {
  font-family: $font-family-numeric;
  font-weight: 700;
  font-size: 1.6rem;
  line-height: 1;
  color: $text-1;
  padding: 0 0.45rem;
  border-radius: 8px;
  background: $bg-1;
  border: 1px solid $hairline;
}

.callout-enter-active { transition: opacity 250ms $ease-out, transform 250ms $ease-out; }
.callout-leave-active { transition: opacity 160ms $ease-out, transform 160ms $ease-out; }
.callout-enter-from { opacity: 0; transform: translateY(6px) scale(0.96); }
.callout-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>
