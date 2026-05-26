<template>
  <div class="play" @keyup.space="keySpacePressed()" @keyup.esc="menuToggle()" tabindex="0">
    <Confetti v-if="placementBanner || playerWinner" :side="placementBanner ? placementBanner.player.side : playerWinner?.side" />

    <transition name="banner">
      <div v-if="disconnectedPlayer" class="placement-banner disconnect-banner">
        <span class="pb-dot disconnect-dot"></span>
        <div class="pb-text">
          <strong class="pb-name">{{ disconnectedPlayer.name }}</strong>
          <span class="pb-msg">left the game</span>
        </div>
        <template v-if="isOwner">
          <div class="pb-actions">
            <button class="ui-btn ui-btn--ghost pb-btn" type="button"
              @click="sendMpIntent('CONTINUE_WITHOUT', disconnectedPlayer.slotIndex)">Continue without</button>
            <button class="ui-btn ui-btn--primary pb-btn" type="button"
              @click="sendMpIntent('REPLACE_WITH_AI', disconnectedPlayer.slotIndex)">Replace with AI</button>
          </div>
        </template>
        <template v-else>
          <span class="pb-msg pb-waiting">Waiting for host…</span>
        </template>
      </div>
    </transition>

    <transition name="banner">
      <div v-if="placementBanner" class="placement-banner">
        <span class="pb-dot" :class="`side-${placementBanner.player.side}`"></span>
        <div class="pb-text">
          <strong class="pb-name">{{ placementBanner.player.name }}</strong>
          <span class="pb-msg">finished {{ rankLabel(placementBanner.rank) }}!</span>
        </div>
        <div v-if="!isMultiplayerMode" class="pb-actions">
          <button class="ui-btn ui-btn--ghost pb-btn" type="button" @click="onBannerStop()">Stop</button>
          <button class="ui-btn ui-btn--primary pb-btn" type="button" @click="onBannerContinue()">Continue</button>
        </div>
      </div>
    </transition>
    <header class="topbar">
      <button class="ui-btn ui-btn--ghost back" type="button" @click="handleBack()">
        <span aria-hidden="true">←</span> Home
      </button>
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
      <div class="corners-col">
        <PlayerCard v-if="playerSide2" :player="playerSide2" :offline="isPlayerDisconnected(playerSide2)" :isHost="isPlayerHost(playerSide2)" @turn_dice="_turnDice()" />
        <div class="corners-spacer"></div>
        <PlayerCard v-if="playerSide1" :player="playerSide1" :diceTop="true" :offline="isPlayerDisconnected(playerSide1)" :isHost="isPlayerHost(playerSide1)" @turn_dice="_turnDice()" />
      </div>

      <main class="board-stage">
        <div class="board-square">
          <section class="board">
            <div class="board-inner">
              <Road class="road" />
              <Marbles @clickmarble="onClickMarble" class="marbles" />
            </div>

            <!-- Mobile-only: player info chips overlaid on the four home corners.
                 Replaces the side cards on small screens. -->
            <div class="corner-info-layer">
              <div
                v-for="p in players"
                :key="p.id"
                class="ci"
                :class="[
                  `ci-side-${p.side}`,
                  {
                    'ci-active':   isCornerActive(p),
                    'ci-winner':   isCornerWinner(p),
                    'ci-offline':  isPlayerDisconnected(p)
                  }
                ]"
              >
                <div class="ci-row">
                  <span class="ci-dot"></span>
                  <span class="ci-name">{{ p.name }}</span>
                  <span v-if="isPlayerDisconnected(p)" class="ci-tag ci-tag--offline">Off</span>
                  <span v-else-if="p.isAI"             class="ci-tag">AI</span>
                  <span v-if="isPlayerHost(p)"         class="ci-tag ci-tag--host">Host</span>
                </div>
                <div class="ci-row ci-row--meta">
                  <span class="ci-count">{{ marblesHomeFor(p) }}/4</span>
                  <span v-if="isCornerWinner(p)" class="ci-medal">🏆</span>
                  <span v-else-if="isCornerActive(p)" class="ci-turn">TURN</span>
                </div>
                <div v-if="isCornerActive(p) && showCornerDice" class="ci-dice">
                  <Dice @turn_dice="_turnDice()" />
                </div>
              </div>
            </div>
          </section>
          <MenuBoard v-show="shouldShowMenu" @start_game="_startGame" @resume_game="resumeGame()" />
        </div>
      </main>

      <div class="corners-col">
        <PlayerCard v-if="playerSide3" :player="playerSide3" :offline="isPlayerDisconnected(playerSide3)" :isHost="isPlayerHost(playerSide3)" @turn_dice="_turnDice()" />
        <div class="corners-spacer"></div>
        <PlayerCard v-if="playerSide4" :player="playerSide4" :diceTop="true" :offline="isPlayerDisconnected(playerSide4)" :isHost="isPlayerHost(playerSide4)" @turn_dice="_turnDice()" />
      </div>
    </div>

    <transition name="dice-bar">
      <div v-if="showMobileDiceBar" class="mobile-dice-bar">
        <Dice @turn_dice="_turnDice()" />
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store/index';
import Road from '@/components/Road.vue';
import Marbles from '@/components/Marbles.vue';
import MenuBoard from '@/components/MenuBoard.vue';
import PlayerCard from '@/components/PlayerCard.vue';
import Confetti from '@/components/Confetti.vue';
import Dice from '@/components/Dice.vue';
import { Player, MoveAction, Marble, BoardStatus, GameStatus, DiceInfo } from '@/types/types';
import {
  getAvailableActions, chooseAction, hasMultipleAvailableActions, canMove,
  afterMoveActions, moveStepByStep, beforeMoveActions, afterFinishTurn,
  createMoveAction, wait, turnDice, setShowMenu, startGame, finishGame,
  changeTurn, pauseGame
} from '@/helpers';
import { SLEEP_BETWEEN_TURNS } from '@/constants';
import type { PlayerSlot } from '@/store/modules/settings';
import { isMultiplayer, sendIntent, disconnect } from '@/net/transport';
import type { ServerMessage, RoomSlot } from '@/net/types';
import { wsClient } from '@/net/client';

export default defineComponent({
  name: 'BoardGame',

  components: { Road, Marbles, MenuBoard, PlayerCard, Confetti, Dice },

  data() {
    return {
      _turnDiceResolve:   null as (() => void) | null,
      _resumeResolve:     null as (() => void) | null,
      _bannerResolve:     null as ((stop: boolean) => void) | null,
      placementBanner:    null as { player: Player; rank: number } | null,
      _mpUnsubscribe:     null as (() => void) | null,
      disconnectedPlayer: null as { slotIndex: number; name: string } | null,
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
    players():    Player[]       { return store.getters['players/list'] || []; },
    playerSide1(): Player | null { return this.players.find((p: Player) => p.side === 1) || null; },
    playerSide2(): Player | null { return this.players.find((p: Player) => p.side === 2) || null; },
    playerSide3(): Player | null { return this.players.find((p: Player) => p.side === 3) || null; },
    playerSide4(): Player | null { return this.players.find((p: Player) => p.side === 4) || null; },
    isGameOver(): boolean {
      if (!this.playerActive) return false;
      return store.getters['marbles/isAllAtFinal'](this.playerActive);
    },
    mySlotIndex(): number | null { return store.getters['room/mySlotIndex']; },
    isOwner(): boolean { return store.getters['room/isOwner']; },
    isMultiplayerMode(): boolean { return isMultiplayer(); },
    finishedPlayers(): Player[] { return store.getters['board/finishedPlayers'] || []; },
    isMyTurn(): boolean {
      const pa = this.playerActive;
      if (!pa || this.mySlotIndex === null) return false;
      return pa.side === (this.mySlotIndex as number) + 1 && !pa.isAI;
    },
    showMobileDiceBar(): boolean {
      if (!this.playerActive || this.playerActive.isAI) return false;
      const relevant = [BoardStatus.WAITING_TURN_DICE, BoardStatus.TURNING_DICE, BoardStatus.PLAYER_IS_THINKING].includes(this.boardStatus);
      if (!relevant) return false;
      if (isMultiplayer()) return this.boardStatus === BoardStatus.TURNING_DICE || this.isMyTurn;
      return true;
    },
    // True when the active player's dice should render inside their corner chip on mobile.
    // Always render once the game is past initializing — covers AI roll animation, waiting
    // for human roll, and the post-roll callout.
    showCornerDice(): boolean {
      if (!this.playerActive) return false;
      return this.boardStatus !== BoardStatus.INITIALIZING;
    },
  },

  watch: {
    finishedPlayers(newList: Player[], oldList: Player[]) {
      if (!isMultiplayer()) return;
      if (newList.length <= oldList.length) return;
      const justFinished = newList[newList.length - 1];
      if (!justFinished) return;
      this.placementBanner = { player: justFinished, rank: newList.length };
      setTimeout(() => {
        if (this.placementBanner?.player.id === justFinished.id) this.placementBanner = null;
      }, 4000);
    },
    boardStatus(newStatus: BoardStatus) {
      if (!isMultiplayer()) return;
      if (newStatus === BoardStatus.PLAYER_IS_THINKING && this.isMyTurn) {
        this.setMoveableMarbles(this.getAvailableActions());
      } else {
        store.dispatch('marbles/unsetMoveableAll');
      }
    },
  },

  mounted() {
    this.focusBoard();
    if (isMultiplayer()) {
      this._setupMultiplayer();
    } else {
      this.continueGame();
    }
  },

  unmounted() {
    store.dispatch('updateGameStatus', GameStatus.NOT_STARTED);
    if (isMultiplayer()) {
      (this._mpUnsubscribe as (() => void) | null)?.();
      disconnect();
      store.commit('room/clear');
    }
  },

  methods: {
    focusBoard() { (this.$el as HTMLElement).focus(); },

    handleBack() {
      if (isMultiplayer()) {
        sendIntent({ type: 'LEAVE_ROOM' });
        disconnect();
        store.commit('room/clear');
      }
      this.$router.push('/');
    },

    isPlayerHost(player: Player | null): boolean {
      if (!player || !isMultiplayer()) return false;
      const slots = store.getters['room/slots'] as RoomSlot[];
      return slots.find(s => s.slotIndex === player.side - 1)?.isOwner ?? false;
    },

    isPlayerDisconnected(player: Player | null): boolean {
      if (!player || !this.disconnectedPlayer || !isMultiplayer()) return false;
      return player.side === (this.disconnectedPlayer as { slotIndex: number }).slotIndex + 1;
    },

    isCornerActive(player: Player): boolean {
      return !!this.playerActive && this.playerActive.id === player.id && !this.isCornerWinner(player);
    },

    isCornerWinner(player: Player): boolean {
      return !!this.playerWinner && this.playerWinner.id === player.id;
    },

    marblesHomeFor(player: Player): number {
      const marbles = (store.getters['marbles/listByPlayer'](player) || []) as Marble[];
      return marbles.filter(m => m.isAtFinal).length;
    },

    sendMpIntent(type: 'CONTINUE_WITHOUT' | 'REPLACE_WITH_AI', slotIndex: number) {
      sendIntent({ type, slotIndex });
      this.disconnectedPlayer = null;
    },

    _setupMultiplayer() {
      store.commit('board/update', { key: 'shouldShowMenu', value: false });
      this._mpUnsubscribe = wsClient.onMessage((msg: ServerMessage) => {
        if (msg.type === 'PLAYER_DISCONNECTED') {
          const finished = store.getters['board/finishedPlayers'] as Player[];
          const alreadyFinished = finished.some((p: Player) => p.side === msg.slotIndex + 1);
          if (!alreadyFinished) {
            this.disconnectedPlayer = { slotIndex: msg.slotIndex, name: msg.playerName };
          }
        } else if (msg.type === 'PLAYER_RECONNECTED') {
          this.disconnectedPlayer = null;
        }
      });
    },

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
      await startGame(roster);
      this.focusBoard();
      this.playTurn();
    },

    menuToggle() {
      const opening = !this.shouldShowMenu;
      if (opening) {
        if (this.gameStatus === GameStatus.PLAYING) pauseGame();
        setShowMenu(true);
      } else {
        if (this.gameStatus === GameStatus.PAUSED) {
          this.resumeGame();
        } else {
          setShowMenu(false);
        }
      }
    },

    shouldChangeTurn(): boolean {
      if (!this.diceInfo.value) return true;
      if (!this.isPreviousMoveCompleted) return false;
      if (this.diceInfo.hasReward) return false;
      return true;
    },

    async playTurn(skipChangeTurn = false) {
      if (this.isGameOver) { await this.onPlayerFinished(); return; }
      await this.resumePromise();
      if (!skipChangeTurn && this.shouldChangeTurn()) changeTurn();
      await this.turnDicePromise();
      await wait(SLEEP_BETWEEN_TURNS);
      const run = this.playerActive.isAI ? this.performActionsOfPlayerAI : this.performActionsOfPlayerNoAI;
      await run();
    },

    async onPlayerFinished() {
      const finishedPlayer: Player = this.playerActive;
      const rank: number = (store.getters['board/finishedPlayers'] as Player[]).length + 1;

      // Change turn BEFORE marking isInGame=false so the rotation is preserved
      await changeTurn();
      await store.dispatch('players/update', { ...finishedPlayer, isInGame: false });
      await store.dispatch('board/addFinishedPlayer', finishedPlayer);

      const remaining: Player[] = store.getters['players/listInGame'];
      if (remaining.length === 0) { finishGame(); return; }

      this.placementBanner = { player: finishedPlayer, rank };
      const stopped = await new Promise<boolean>(resolve => {
        this._bannerResolve = resolve;
      });
      this.placementBanner = null;

      if (stopped) { finishGame(); return; }
      this.playTurn(true);
    },

    onBannerStop()     { this._bannerResolve?.(true);  },
    onBannerContinue() { this._bannerResolve?.(false); },

    rankLabel(rank: number): string {
      return rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
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
      if (actions.length === 0) {
        await afterFinishTurn(); this.playTurn();
      } else if (!hasMultipleAvailableActions(actions)) {
        await this.autoMove(actions, this.playerActive);
        await afterFinishTurn(); this.playTurn();
      } else {
        this.setMoveableMarbles(actions);
        store.dispatch('board/update', { key: 'boardStatus', value: BoardStatus.PLAYER_IS_THINKING });
      }
    },

    async onClickMarble(marble: Marble) {
      if (isMultiplayer()) {
        if (marble.isMoveable) sendIntent({ type: 'MOVE_MARBLE', marbleId: marble.id });
        return;
      }
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
      if (isMultiplayer()) {
        if (this.isMyTurn && this.boardStatus === BoardStatus.WAITING_TURN_DICE) {
          sendIntent({ type: 'ROLL_DICE' });
        }
        return;
      }
      await turnDice(this.playerActive);
      // Wait for the dice animation + the 2 s callout gap before the game proceeds.
      // Animation duration scales linearly with diceSpeed (~2050 ms at Normal/1.5).
      // Resolve _turnDiceResolve AFTER the wait so human players are held until the
      // callout is already visible (same timing as AI players).
      const s: number = store.getters['settings/diceSpeed'] ?? 1.5;
      await wait(Math.round(2050 * (s / 1.5)) + 2280);
      if (this._turnDiceResolve) { this._turnDiceResolve(); this._turnDiceResolve = null; }
    },

    keySpacePressed() {
      if (isMultiplayer()) {
        if (this.isMyTurn && this.boardStatus === BoardStatus.WAITING_TURN_DICE) this._turnDice();
        return;
      }
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
.corners-col {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
}
.corners-spacer {
  flex: 1;
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

.placement-banner {
  position: fixed;
  top: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-radius: $border-radius-lg;
  background: $bg-2;
  border: 1px solid $hairline-strong;
  box-shadow: $shadow-2;
  white-space: nowrap;
}
.pb-dot {
  width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  &.side-1 { background: $brand-1; }
  &.side-2 { background: $brand-2; }
  &.side-3 { background: $brand-3; }
  &.side-4 { background: $brand-4; }
}
.disconnect-dot {
  background: $brand-1;
  box-shadow: 0 0 0 4px rgba(220, 80, 90, 0.18);
  animation: disconnect-pulse 1.8s $ease-out infinite;
}
@keyframes disconnect-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(220, 80, 90, 0.18); }
  50%       { box-shadow: 0 0 0 7px rgba(220, 80, 90, 0.08); }
}
.pb-waiting { color: $text-3; font-style: italic; margin-left: 0.25rem; }
.pb-text {
  display: flex; align-items: baseline; gap: 0.4rem;
}
.pb-name { font-size: 1rem; font-weight: 700; color: $text-1; }
.pb-msg  { font-size: 0.9rem; color: $text-2; }
.pb-actions { display: flex; gap: 0.5rem; margin-left: 0.5rem; }
.pb-btn  { padding: 0.35rem 0.85rem; font-size: 0.85rem; }

.banner-enter-active { transition: opacity 250ms $ease-out, transform 250ms $ease-out; }
.banner-leave-active { transition: opacity 180ms $ease-out, transform 180ms $ease-out; }
.banner-enter-from   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
.banner-leave-to     { opacity: 0; transform: translateX(-50%) translateY(-8px); }

// ── Tablet: shrink side columns ─────────────────────────────────────────────
@media (max-width: 1100px) {
  .corners-col { flex: 0 0 200px; }
}

// ── Mobile (≤700px): board on top, corner-matched 2×2 card grid below ────────
// ── Mobile: cards are replaced with corner overlays on the board itself ─────
@media (max-width: 700px) {
  .layout {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0 0 env(safe-area-inset-bottom, 0.5rem);
    height: auto;
    overflow: visible;
  }
  // Hide the side cards entirely — info now lives inside the board corners.
  .corners-col { display: none; }

  .board-stage {
    flex: none;
    width: 100%;
    min-height: 0;
    justify-content: center;
    align-items: flex-start;
  }
  .board-square { width: 100%; height: auto; max-width: none; margin: 0; }
  .board        { border-radius: 0; border-left: none; border-right: none; padding: 8px; }

  // Compact topbar on small screens
  .topbar {
    padding: 0.6rem 0.75rem;
    .back, .menu-btn { font-size: 0.8rem; padding: 0.35rem 0.65rem; }
    .title-block {
      gap: 0.45rem;
      .title { font-size: 0.9rem; }
      .turn-line { font-size: 0.72rem; padding: 3px 8px; gap: 0.35rem; }
    }
  }
}

// ── Corner info chips (mobile only) ─────────────────────────────────────────
// Sit inside .board, absolutely positioned at each colored home corner.
// Width = 40% = 6/15 of the board = exactly the home zone, so chips never
// reach the common squares. The active player's chip expands downward (or
// upward for bottom corners) to show a compact die + ROLL button.
.corner-info-layer { display: none; }

@media (max-width: 700px) {
  .corner-info-layer {
    display: block;
    position: absolute;
    inset: 8px; // matches .board padding → aligns to board-inner
    pointer-events: none;
    z-index: 4;
  }

  .ci {
    position: absolute;
    pointer-events: auto;
    // 6/15 cells wide = exactly the home zone, never overlaps common path
    width: 40%;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 8px;
    border-radius: $border-radius-sm;
    background: rgba(11, 13, 16, 0.60);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid $hairline;
    transition: border-color 180ms $ease-out, background 180ms $ease-out, box-shadow 180ms $ease-out;
    box-sizing: border-box;
  }

  // Anchor to matching home corner: side-2=TL, side-3=TR, side-1=BL, side-4=BR
  .ci-side-2 { top:    0; left:  0; }
  .ci-side-3 { top:    0; right: 0; }
  .ci-side-1 { bottom: 0; left:  0; }
  .ci-side-4 { bottom: 0; right: 0; }

  .ci-row {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    width: 100%;
  }
  .ci-row--meta { gap: 6px; }

  .ci-dot {
    width: 8px; height: 8px; border-radius: 50%; flex: none;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
  }
  .ci-side-1 .ci-dot { background: $brand-1; }
  .ci-side-2 .ci-dot { background: $brand-2; }
  .ci-side-3 .ci-dot { background: $brand-3; }
  .ci-side-4 .ci-dot { background: $brand-4; }

  .ci-name {
    font-size: 0.75rem; font-weight: 600; color: $text-1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    flex: 1; min-width: 0;
  }
  .ci-tag {
    font-size: 0.52rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    color: $text-3; padding: 0 3px; border-radius: 999px; border: 1px solid $hairline; flex: none;
    &--offline { color: $brand-1; border-color: rgba(220, 80, 90, 0.35); }
    &--host    { color: $accent;  border-color: rgba(124, 156, 255, 0.35); }
  }
  .ci-count {
    font-family: $font-family-numeric; font-weight: 600; color: $text-3; font-size: 0.7rem;
  }
  .ci-turn {
    font-size: 0.52rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 1px 5px; border-radius: 999px; background: $accent-soft; color: $accent; flex: none;
  }
  .ci-medal { font-size: 0.9rem; line-height: 1; flex: none; }

  .ci-active {
    background: rgba(11, 13, 16, 0.82);
    border-color: $hairline-strong;
  }
  .ci-side-1.ci-active { box-shadow: 0 0 0 1px rgba($brand-1, 0.4), 0 4px 14px rgba(0,0,0,0.4); }
  .ci-side-2.ci-active { box-shadow: 0 0 0 1px rgba($brand-2, 0.4), 0 4px 14px rgba(0,0,0,0.4); }
  .ci-side-3.ci-active { box-shadow: 0 0 0 1px rgba($brand-3, 0.4), 0 4px 14px rgba(0,0,0,0.4); }
  .ci-side-4.ci-active { box-shadow: 0 0 0 1px rgba($brand-4, 0.4), 0 4px 14px rgba(0,0,0,0.4); }
  .ci-offline { opacity: 0.50; filter: grayscale(0.4); }
  .ci-winner  { border-color: rgba(232, 198, 81, 0.5); }

  // ── Dice inside the active chip ──
  // Use !important on pixel dimensions to beat Dice.vue's scoped attribute-selector specificity.
  // Die is 30×30px so the whole dice row stays compact inside the 40%-wide chip.
  .ci-dice {
    margin-top: 4px;
    width: 100%;
    border-top: 1px solid $hairline;
    padding-top: 5px;
    overflow: hidden;
  }
  .ci-dice :deep(.dice-area) {
    flex-direction: row !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    padding: 0 !important;
    gap: 5px 7px !important;
  }
  .ci-dice :deep(.dice-wrap) {
    flex: 0 0 auto !important;
    width:  34px !important;
    height: 34px !important;
  }
  .ci-dice :deep(.die) {
    width:  30px !important;
    height: 30px !important;
    border-radius: 7px !important;
    padding: 5px !important;
    gap: 2px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9) !important;
  }
  .ci-dice :deep(.pip) {
    width:  4px !important;
    height: 4px !important;
  }
  .ci-dice :deep(.roll-btn) {
    flex: 1 !important;
    min-width: 0 !important;
    min-height: 34px !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
    padding: 0.3rem 0.5rem !important;
  }
  .ci-dice :deep(.hint) {
    flex: 1 !important;
    font-size: 0.68rem !important;
    text-align: left !important;
    margin: 0 !important;
    min-height: 0 !important;
    color: $text-3;
  }
  .ci-dice :deep(.callout) {
    flex: 0 0 100% !important;
    padding: 3px 5px !important;
    gap: 3px !important;
    justify-content: flex-start !important;
    background: transparent !important;
    border-color: transparent !important;
  }
  .ci-dice :deep(.callout-name)  { font-size: 0.68rem !important; }
  .ci-dice :deep(.callout-text)  { font-size: 0.62rem !important; }
  .ci-dice :deep(.callout-value) { font-size: 0.88rem !important; padding: 0 3px !important; }
}

// ── Mobile dice bar ────────────────────────────────────────────────────────────
.mobile-dice-bar {
  display: none; // hidden on tablet/desktop

  @media (max-width: 700px) {
    display: none; // dice is shown inside player cards on mobile
  }
}

.dice-bar-enter-active { transition: transform 220ms $ease-out, opacity 180ms $ease-out; }
.dice-bar-leave-active { transition: transform 180ms $ease-out, opacity 140ms $ease-out; }
.dice-bar-enter-from   { transform: translateY(100%); opacity: 0; }
.dice-bar-leave-to     { transform: translateY(100%); opacity: 0; }

// ── Board arm: junction (outermost endpoint) squares ─────────────────────────
// Shared corner junction squares traversed by all players — render neutral.
// Red=(9,6), Green=(6,7), Blue=(6,9), Yellow=(15,9).
// Uses !important because Step.vue scoped .type-3.side-X rules share equal specificity.
.row-9.column-6  .inner,
.row-6.column-7  .inner,
.row-6.column-9  .inner,
.row-15.column-9 .inner {
  background: $bg-3 !important;
  box-shadow: inset 0 0 0 1px $hairline !important;
}

// ── Final tile: fill the full 3×3 center void ────────────────────────────────
// The tile is placed at (8,8) by Road.vue. Shifting it back by one stride
// (step_width + step_gutter) and widening to 3W+2G covers rows 7-9, cols 7-9,
// leaving exactly step_gutter gap to the surrounding home-arm tiles.
// gutter = W/10 exactly, so new inner = 3.2× original; star inset adjusts from
// 22% → 41.25% so its rendered pixel size stays unchanged.
.row-8.column-8 {
  width:       calc(3 * #{$step-width} + 2 * #{$step-gutter});
  height:      calc(3 * #{$step-width} + 2 * #{$step-gutter});
  margin-top:  calc(-1 * (#{$step-width} + #{$step-gutter}));
  margin-left: calc(-1 * (#{$step-width} + #{$step-gutter}));

  .inner { border-radius: 14% !important; }
  .inner::before { inset: 41.25% !important; }
}
</style>
