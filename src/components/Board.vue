<template>
  <div class="play" @keyup.space="keySpacePressed()" @keyup.esc="menuToggle()" tabindex="0">
    <header class="topbar">
      <router-link to="/" class="ui-btn ui-btn--ghost back">
        <span aria-hidden="true">←</span> Home
      </router-link>
      <div class="title-block">
        <span class="title">Ludo</span>
        <span v-if="playerActive" class="turn-line">
          <span class="dot" :class="`side-${playerActive.side}`"></span>
          {{ playerActive.name }}'s turn
        </span>
      </div>
      <button class="ui-btn ui-btn--ghost menu-btn" type="button" @click="menuToggle()">
        {{ shouldShowMenu ? 'Close' : 'Menu' }}
      </button>
    </header>

    <div class="layout">
      <aside class="side side-left">
        <PlayerCard v-for="p in playersLeft" :key="p.id" :player="p" />
      </aside>

      <main class="board-stage">
        <div class="board-square">
          <section class="board">
            <div class="board-inner">
              <Road class="road" />
              <Marbles @clickmarble="onClickMarble" class="marbles" />
            </div>
          </section>
          <MenuBoard v-show="shouldShowMenu" @start_game="_startGame" @resume_game="resumeGame()" />

          <transition name="fade">
            <div v-if="handoffPlayer" class="handoff-overlay" @click="dismissHandoff">
              <div class="handoff-card">
                <span class="handoff-dot" :class="`side-${handoffPlayer.side}`"></span>
                <p class="handoff-label">Pass to</p>
                <p class="handoff-name">{{ handoffPlayer.name }}</p>
                <button class="ui-btn ui-btn--primary" type="button">I'm Ready</button>
              </div>
            </div>
          </transition>
        </div>
      </main>

      <aside class="side side-right">
        <PlayerCard v-for="p in playersRight" :key="p.id" :player="p" />
        <div class="dice-panel">
          <Dice @turn_dice="_turnDice()" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store/index';
import Road from '@/components/Road.vue';
import Dice from '@/components/Dice.vue';
import Marbles from '@/components/Marbles.vue';
import MenuBoard from '@/components/MenuBoard.vue';
import PlayerCard from '@/components/PlayerCard.vue';
import { Player, MoveAction, Marble, BoardStatus, GameStatus, DiceInfo } from '@/types/types';
import {
  getAvailableActions, chooseAction, hasMultipleAvailableActions, canMove,
  afterMoveActions, moveStepByStep, beforeMoveActions, afterFinishTurn,
  createMoveAction, wait, turnDice, setShowMenu, startGame, finishGame,
  changeTurn
} from '@/helpers';
import { SLEEP_BETWEEN_TURNS, SLEEP_AFTER_TURN_DICE } from '@/constants';
import type { PlayerSlot } from '@/store/modules/settings';

export default defineComponent({
  name: 'BoardGame',

  components: { Dice, Road, Marbles, MenuBoard, PlayerCard },

  data() {
    return {
      _turnDiceResolve: null as (() => void) | null,
      _resumeResolve:   null as (() => void) | null,
      _handoffResolve:  null as (() => void) | null,
      handoffPlayer:    null as Player | null,
      lastHumanId:      null as number | null
    };
  },

  computed: {
    shouldShowMenu():          boolean   { return store.getters['board/shouldShowMenu']; },
    boardStatus():             BoardStatus { return store.getters['board/boardStatus']; },
    playerActive():            Player    { return store.getters['board/playerActive']; },
    playerWinner():            Player    { return store.getters['board/playerWinner']; },
    diceInfo():                DiceInfo  { return store.getters['board/diceInfo']; },
    gameStatus():              GameStatus { return store.getters['gameStatus']; },
    isPreviousMoveCompleted(): boolean   { return this.diceInfo.isDone; },
    players():                 Player[]  { return store.getters['players/list'] || []; },
    playersLeft():             Player[]  { return this.players.filter(p => p.side === 1 || p.side === 2); },
    playersRight():            Player[]  { return this.players.filter(p => p.side === 3 || p.side === 4); },
    isGameOver(): boolean {
      if (!this.playerActive) return false;
      return store.getters['marbles/isAllAtFinal'](this.playerActive);
    }
  },

  mounted() {
    this.focusBoard();
    this.continueGame();
  },

  unmounted() {
    store.dispatch('updateGameStatus', GameStatus.NOT_STARTED);
  },

  methods: {
    focusBoard() { (this.$el as HTMLElement).focus(); },

    continueGame() {
      if (this.gameStatus === GameStatus.PLAYING) {
        this.focusBoard();
        this.playTurn();
      }
    },

    resumePromise(): Promise<void> {
      return new Promise(resolve => {
        if (this.gameStatus === GameStatus.PLAYING) {
          resolve();
        } else {
          this._resumeResolve = resolve;
        }
      });
    },

    async resumeGame() {
      await store.dispatch('updateGameStatus', GameStatus.PLAYING);
      setShowMenu(false);
      this.focusBoard();
      if (this._resumeResolve) { this._resumeResolve(); this._resumeResolve = null; }
    },

    async _startGame(roster?: PlayerSlot[]) {
      this.lastHumanId = null;
      this.handoffPlayer = null;
      await startGame(roster);
      this.focusBoard();
      this.playTurn();
    },

    handoffPromise(): Promise<void> {
      return new Promise(resolve => { this._handoffResolve = resolve; });
    },

    dismissHandoff() {
      this.handoffPlayer = null;
      if (this._handoffResolve) { this._handoffResolve(); this._handoffResolve = null; }
    },

    async maybeHandoff() {
      // Show "Pass to {name}" between two distinct human players.
      if (!this.playerActive || this.playerActive.isAI) {
        this.lastHumanId = null;
        return;
      }
      // Only interstitial when there's >1 human and we're switching humans
      const humanCount = this.players.filter(p => !p.isAI).length;
      if (humanCount < 2) return;
      if (this.lastHumanId === this.playerActive.id) return;

      this.handoffPlayer = this.playerActive;
      await this.handoffPromise();
      this.lastHumanId = this.playerActive.id;
    },

    menuToggle() { setShowMenu(!this.shouldShowMenu); },

    shouldChangeTurn(): boolean {
      if (!this.diceInfo.value) return true;
      if (!this.isPreviousMoveCompleted) return false;
      if (this.diceInfo.hasReward) return false;
      return true;
    },

    async playTurn() {
      if (this.isGameOver) { finishGame(); return; }
      await this.resumePromise();
      if (this.shouldChangeTurn()) changeTurn();
      await this.maybeHandoff();
      await this.turnDicePromise();
      await wait(SLEEP_BETWEEN_TURNS);
      const run = this.playerActive.isAI ? this.performActionsOfPlayerAI : this.performActionsOfPlayerNoAI;
      await run();
    },

    async performActionsOfPlayerAI() {
      const actions = this.getAvailableActions();
      if (actions.length === 0) {
        await afterFinishTurn(); this.playTurn();
      } else if (this.shouldAutoMove(actions)) {
        await this.autoMove(actions, this.playerActive);
        await afterFinishTurn(); this.playTurn();
      }
    },

    async performActionsOfPlayerNoAI() {
      const actions = this.getAvailableActions();
      if (actions.length > 0) {
        this.setMoveableMarbles(actions);
        store.dispatch('board/update', { key: 'boardStatus', value: BoardStatus.PLAYER_IS_THINKING });
      } else {
        await afterFinishTurn(); this.playTurn();
      }
    },

    async onClickMarble(marble: Marble) {
      if (!canMove(marble, this.playerActive)) return;
      const moveAction = createMoveAction({ player: this.playerActive, marble, diceInfo: this.diceInfo });
      beforeMoveActions(moveAction, this.playerActive);
      const updated = await this.move(moveAction);
      await afterMoveActions(updated, this.playerActive);
      await afterFinishTurn();
      this.playTurn();
    },

    setMoveableMarbles(actions: MoveAction[]) {
      store.dispatch('marbles/setMoveableItems', actions.map(a => a.marble));
    },

    shouldAutoMove(actions: MoveAction[]): boolean {
      return this.playerActive.isAI || !hasMultipleAvailableActions(actions);
    },

    async autoMove(actions: MoveAction[], player: Player) {
      const moveAction = chooseAction(actions, player);
      beforeMoveActions(moveAction, this.playerActive);
      const updated = await this.move(moveAction);
      await afterMoveActions(updated, this.playerActive);
    },

    async move(moveAction: MoveAction): Promise<MoveAction> {
      return moveStepByStep(moveAction);
    },

    getAvailableActions(): MoveAction[] {
      return getAvailableActions({ player: this.playerActive, diceInfo: this.diceInfo });
    },

    turnDicePromise(): Promise<void> {
      if (!this.isPreviousMoveCompleted) return Promise.resolve();
      store.dispatch('board/update', { key: 'boardStatus', value: BoardStatus.WAITING_TURN_DICE });
      if (this.playerActive.isAI) return this._turnDice();
      return new Promise(resolve => { this._turnDiceResolve = resolve; });
    },

    async _turnDice(): Promise<void> {
      await turnDice(this.playerActive);
      if (this._turnDiceResolve) { this._turnDiceResolve(); this._turnDiceResolve = null; }
      await wait(SLEEP_AFTER_TURN_DICE);
    },

    keySpacePressed() {
      if (this.handoffPlayer) { this.dismissHandoff(); return; }
      if (this.playerActive?.isAI || this.boardStatus !== BoardStatus.WAITING_TURN_DICE) return;
      this._turnDice();
    },

  }

});
</script>

<style lang="scss">
.play {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  outline: none;
}
.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid $hairline;
  background: rgba(11, 13, 16, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 10;
  .back      { justify-self: start; padding: 0.45rem 0.9rem; font-size: 0.9rem; color: $text-2; }
  .menu-btn  { justify-self: end;   padding: 0.45rem 0.9rem; font-size: 0.9rem; color: $text-2; }
  .title-block {
    display: flex; align-items: center; gap: 0.85rem;
    .title { font-weight: 700; letter-spacing: -0.01em; }
    .turn-line {
      display: inline-flex; align-items: center; gap: 0.45rem;
      font-size: 0.85rem; color: $text-2;
      padding: 4px 10px; border-radius: 999px; border: 1px solid $hairline; background: $surface;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      &.side-1 { background: $brand-1; }
      &.side-2 { background: $brand-2; }
      &.side-3 { background: $brand-3; }
      &.side-4 { background: $brand-4; }
    }
  }
}
.layout {
  flex: 1;
  display: flex;
  align-items: stretch; // board-stage must stretch to get a definite height
  gap: 1.5rem;
  padding: 1.5rem;
  height: calc(100vh - 4rem);
  overflow: hidden;
}
.side {
  flex: 0 0 240px;
  align-self: flex-start; // opt out of stretch so sides size to content
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 100%;
  overflow-y: auto;
}
.dice-panel {
  margin-top: auto;
  border-radius: $border-radius;
  background: $surface;
  border: 1px solid $hairline;
}
.board-stage {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  // height comes from align-items: stretch on .layout
}
.board-square {
  position: relative;
  height: 100%;
  aspect-ratio: 1 / 1;
  // Don't let the width spill past what the column actually has
  max-width: 100%;
}
.board {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: $border-radius-lg;
  background: radial-gradient(circle at 50% 50%, $bg-2 0%, $bg-1 70%);
  border: 1px solid $hairline;
  box-shadow: $shadow-2;
  padding: 16px;
  box-sizing: border-box;
}
.board-inner {
  position: relative;
  width: 100%;
  height: 100%;
}
.road { @include absolute-cover; }

.handoff-overlay {
  @include absolute-cover;
  z-index: 6;
  display: grid;
  place-items: center;
  border-radius: $border-radius-lg;
  background: rgba(11, 13, 16, 0.7);
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  cursor: pointer;
}
.handoff-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2rem 2.25rem;
  border-radius: $border-radius-lg;
  background: $bg-2;
  border: 1px solid $hairline;
  box-shadow: $shadow-2;
  text-align: center;
  animation: fade-in-up 240ms $ease-out;
}
.handoff-dot {
  width: 22px; height: 22px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 0 6px rgba(255,255,255,0.04);
  &.side-1 { background: $brand-1; }
  &.side-2 { background: $brand-2; }
  &.side-3 { background: $brand-3; }
  &.side-4 { background: $brand-4; }
}
.handoff-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $text-3;
}
.handoff-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: $text-1;
}

.fade-enter-active, .fade-leave-active { transition: opacity 200ms $ease-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1080px) {
  .side { flex: 0 0 200px; }
  .board-square { max-height: calc(100vw - 440px); }
}
@media (max-width: 880px) {
  .layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
    align-items: stretch;
  }
  .side {
    flex: none;
    width: 100%;
    align-self: auto;
    flex-direction: row;
    flex-wrap: wrap;
    max-height: none;
    overflow-y: visible;
  }
  .side .player-card { flex: 1 1 200px; }
  .board-stage { width: 100%; }
  .dice-panel { width: 100%; margin-top: 0; }
  .board-square {
    height: auto;
    width: min(100%, 80vh);
    max-width: 100%;
    margin: 0 auto;
  }
}
</style>
