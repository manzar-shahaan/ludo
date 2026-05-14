<template>
  <div class="menu-join">
    <!-- ── Form phase ──────────────────────────────── -->
    <div v-if="!joined" class="join-card" key="form">
      <div class="card-header">
        <button class="back-btn ui-btn ui-btn--ghost" type="button" @click="goHome">← Back</button>
        <h2 class="card-title">Join a Room</h2>
      </div>

      <div class="field">
        <label class="field-label" for="join-code">Room code</label>
        <input
          id="join-code"
          v-model="code"
          class="field-input field-input--code"
          type="text"
          maxlength="4"
          placeholder="XXXX"
          @input="code = code.toUpperCase()"
          @keyup.enter="code.trim() && name.trim() && onJoin()"
        />
      </div>

      <div class="field">
        <label class="field-label" for="join-name">Your name</label>
        <input
          id="join-name"
          v-model="name"
          class="field-input"
          type="text"
          maxlength="20"
          placeholder="Enter your name"
          @keyup.enter="code.trim() && name.trim() && onJoin()"
        />
      </div>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <div class="action-row">
        <button
          class="ui-btn ui-btn--primary ui-btn--lg action-btn"
          type="button"
          :disabled="!code.trim() || !name.trim()"
          @click="onJoin"
        >
          Join
        </button>
        <button
          class="ui-btn ui-btn--ghost action-btn"
          type="button"
          @click="goHome"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- ── Waiting phase ───────────────────────────── -->
    <div v-else class="join-card join-card--waiting" key="waiting">
      <div class="card-header">
        <h2 class="card-title">Waiting for host…</h2>
      </div>

      <p class="waiting-msg">The host will start the game when everyone is ready.</p>

      <ul class="slots-list">
        <li
          v-for="slot in slots"
          :key="slot.slotIndex"
          class="slot-row"
          :class="{ 'slot-row--faded': !slot.isConnected && !slot.isAI }"
        >
          <span class="slot-dot" :class="`side-${slot.slotIndex + 1}`"></span>
          <span class="slot-name">{{ slot.name || 'Empty' }}</span>
          <span class="slot-badge" :class="slot.isAI ? 'badge--ai' : slot.isConnected ? 'badge--ready' : 'badge--waiting'">
            {{ slot.isAI ? 'AI' : slot.isConnected ? 'Ready' : 'Waiting…' }}
          </span>
        </li>
      </ul>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <button
        class="ui-btn ui-btn--ghost ui-btn--lg action-btn"
        type="button"
        @click="onLeave"
      >
        Leave Room
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { connect, disconnect, sendIntent } from '@/net/transport';
import { wsClient } from '@/net/client';
import store from '@/store/index';
import { GameStatus } from '@/types/types';
import type { ServerMessage } from '@/net/types';

export default defineComponent({
  name: 'MenuJoin',

  data() {
    return {
      code: '',
      name: '',
      joined: false,
      errorMsg: '',
      _unsub: null as (() => void) | null
    };
  },

  computed: {
    slots() {
      return store.getters['room/slots'];
    },
    gameStatus(): GameStatus {
      return store.getters['gameStatus'];
    }
  },

  watch: {
    gameStatus(s: GameStatus) {
      if (s === GameStatus.PLAYING) {
        this.$router.push('/play');
      }
    }
  },

  mounted() {
    connect();

    this.code = ((this.$route.query.code as string) ?? '').toUpperCase();

    this._unsub = wsClient.onMessage((msg: ServerMessage) => {
      if (msg.type === 'ROOM_JOINED') {
        store.commit('room/setRoom', {
          code: msg.roomCode,
          mySlotIndex: msg.mySlotIndex,
          slots: msg.slots,
          joinUrl: ''
        });
      } else if (msg.type === 'SLOTS_UPDATED') {
        store.commit('room/setSlots', msg.slots);
      } else if (msg.type === 'ERROR') {
        this.errorMsg = msg.message;
        this.joined = false;
      }
    });

    if (store.getters['room/code']) {
      this.joined = true;
    }
  },

  beforeUnmount() {
    this._unsub?.();
  },

  methods: {
    onJoin() {
      this.errorMsg = '';
      sendIntent({
        type: 'JOIN_ROOM',
        roomCode: this.code.trim().toUpperCase(),
        playerName: this.name.trim()
      });
      this.joined = true;
    },
    onLeave() {
      sendIntent({ type: 'LEAVE_ROOM' });
      disconnect();
      store.commit('room/clear');
      this.$router.push('/');
    },
    goHome() {
      this.$router.push('/');
    }
  }
});
</script>

<style lang="scss" scoped>
.menu-join {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.join-card {
  width: min(440px, 92%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2.5rem;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-2;
  animation: fade-in-up 400ms $ease-out both;
  @include glass;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-btn {
  font-size: 0.875rem;
  padding: 0.4rem 0.75rem;
  color: $text-2;
  &:hover { color: $text-1; }
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: $text-1;
}

// ── Form fields ────────────────────────────────────────────────────────────────

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: $text-2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.field-input {
  background: $bg-2;
  border: 1px solid $hairline-strong;
  border-radius: $border-radius;
  color: $text-1;
  font-family: inherit;
  font-size: 1rem;
  padding: 0.7rem 1rem;
  outline: none;
  transition: border-color 150ms $ease-out, box-shadow 150ms $ease-out;

  &::placeholder { color: $text-3; }

  &:focus {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }

  &--code {
    font-family: $font-family-numeric;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    text-align: center;
  }
}

// ── Waiting message ────────────────────────────────────────────────────────────

.waiting-msg {
  font-size: 0.9rem;
  color: $text-2;
  text-align: center;
}

// ── Slots list ─────────────────────────────────────────────────────────────────

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  background: $surface;
  border: 1px solid $hairline;
  border-radius: $border-radius-sm;
  transition: opacity 200ms $ease-out;

  &--faded {
    opacity: 0.45;
  }
}

.slot-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;

  &.side-1 { background: $brand-1; }
  &.side-2 { background: $brand-2; }
  &.side-3 { background: $brand-3; }
  &.side-4 { background: $brand-4; }
}

.slot-name {
  flex: 1;
  font-size: 0.9rem;
  color: $text-1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-badge {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;

  &--ai {
    background: rgba(124, 156, 255, 0.15);
    color: $accent;
  }

  &--ready {
    background: rgba(74, 200, 110, 0.15);
    color: hsl(140, 50%, 60%);
  }

  &--waiting {
    background: $surface;
    color: $text-3;
  }
}

// ── Actions ────────────────────────────────────────────────────────────────────

.action-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.action-btn {
  width: 100%;
}

// ── Error ──────────────────────────────────────────────────────────────────────

.error-msg {
  font-size: 0.875rem;
  color: $brand-1;
  background: rgba(220, 80, 90, 0.1);
  border: 1px solid rgba(220, 80, 90, 0.25);
  border-radius: $border-radius-sm;
  padding: 0.6rem 0.875rem;
  text-align: center;
}
</style>
