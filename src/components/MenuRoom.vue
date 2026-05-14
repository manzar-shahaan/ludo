<template>
  <div class="menu-room">
    <!-- ── Setup phase ──────────────────────────────── -->
    <div v-if="!roomCode" class="room-card" key="setup">
      <div class="card-header">
        <button class="back-btn ui-btn ui-btn--ghost" type="button" @click="goHome">← Back</button>
        <h2 class="card-title">Host a Room</h2>
      </div>

      <div class="field">
        <label class="field-label" for="host-name">Your name</label>
        <input
          id="host-name"
          v-model="name"
          class="field-input"
          type="text"
          maxlength="20"
          placeholder="Enter your name"
          @keyup.enter="name.trim() && onCreate()"
        />
      </div>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <button
        class="ui-btn ui-btn--primary ui-btn--lg action-btn"
        type="button"
        :disabled="!name.trim()"
        @click="onCreate"
      >
        Create Room
      </button>
    </div>

    <!-- ── Lobby phase ─────────────────────────────── -->
    <div v-else class="room-card room-card--lobby" key="lobby">
      <div class="card-header">
        <h2 class="card-title">Room Lobby</h2>
      </div>

      <transition name="toast">
        <div v-if="ownerToast" class="owner-toast">You are now the room owner</div>
      </transition>

      <div class="code-block">
        <span class="code-label">Room Code</span>
        <span class="code-value">{{ roomCode }}</span>
      </div>

      <div v-if="joinUrl" class="qr-block">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="qr-wrap" v-html="qrSvg"></div>
        <span class="join-url">{{ joinUrl }}</span>
      </div>

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
          <button
            v-if="isOwner && slot.isAI && slots.length > 2"
            class="remove-slot-btn"
            type="button"
            :aria-label="`Remove ${slot.name}`"
            @click="onRemoveSlot(slot.slotIndex)"
          >×</button>
        </li>
      </ul>

      <button
        v-if="isOwner && slots.length < 4"
        class="ui-btn ui-btn--ghost add-ai-btn"
        type="button"
        @click="onAddAI"
      >+ Add AI player</button>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <div class="action-row">
        <button
          v-if="isOwner"
          class="ui-btn ui-btn--primary ui-btn--lg action-btn"
          type="button"
          @click="onStart"
        >
          Start Game
        </button>
        <button
          class="ui-btn ui-btn--ghost action-btn"
          type="button"
          @click="onLeave"
        >
          Leave Room
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// @ts-ignore
import QRCode from 'qrcode-svg';
import { connect, disconnect, sendIntent } from '@/net/transport';
import { wsClient } from '@/net/client';
import store from '@/store/index';
import { GameStatus } from '@/types/types';
import type { ServerMessage } from '@/net/types';

export default defineComponent({
  name: 'MenuRoom',

  data() {
    return {
      name: '',
      errorMsg: '',
      ownerToast: false,
      _unsub: null as (() => void) | null,
      _ownerToastTimer: null as ReturnType<typeof setTimeout> | null
    };
  },

  computed: {
    roomCode(): string | null {
      return store.getters['room/code'];
    },
    joinUrl(): string {
      return store.getters['room/joinUrl'];
    },
    slots() {
      return store.getters['room/slots'];
    },
    isOwner(): boolean {
      return store.getters['room/isOwner'];
    },
    gameStatus(): GameStatus {
      return store.getters['gameStatus'];
    },
    qrSvg(): string {
      if (!this.joinUrl) return '';
      // @ts-ignore
      return new QRCode({ content: this.joinUrl, width: 180, height: 180, padding: 4, color: '#ffffff', background: 'transparent' }).svg();
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

    this._unsub = wsClient.onMessage((msg: ServerMessage) => {
      if (msg.type === 'ROOM_CREATED') {
        store.commit('room/setRoom', {
          code: msg.roomCode,
          mySlotIndex: 0,
          slots: msg.slots,
          joinUrl: msg.joinUrl
        });
      } else if (msg.type === 'SLOTS_UPDATED') {
        store.commit('room/setSlots', msg.slots);
      } else if (msg.type === 'OWNER_CHANGED') {
        if (store.getters['room/mySlotIndex'] === msg.newOwnerSlotIndex) {
          this.ownerToast = true;
          if (this._ownerToastTimer) clearTimeout(this._ownerToastTimer);
          this._ownerToastTimer = setTimeout(() => { this.ownerToast = false; }, 4000);
        }
      } else if (msg.type === 'ERROR') {
        this.errorMsg = msg.message;
      }
    });
  },

  beforeUnmount() {
    this._unsub?.();
    if (this._ownerToastTimer) clearTimeout(this._ownerToastTimer);
  },

  methods: {
    onCreate() {
      this.errorMsg = '';
      sendIntent({ type: 'CREATE_ROOM', playerName: this.name.trim() });
    },
    onStart() {
      sendIntent({ type: 'START_GAME' });
    },
    onAddAI() {
      sendIntent({ type: 'ADD_AI_SLOT' });
    },
    onRemoveSlot(slotIndex: number) {
      sendIntent({ type: 'REMOVE_SLOT', slotIndex });
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
.menu-room {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.room-card {
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
}

// ── Code block ─────────────────────────────────────────────────────────────────

.code-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1.25rem;
  background: $bg-2;
  border: 1px solid $hairline-strong;
  border-radius: $border-radius;
}

.code-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: $text-3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.code-value {
  font-family: $font-family-numeric;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: $text-1;
}

// ── QR block ───────────────────────────────────────────────────────────────────

.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.qr-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $border-radius;
  overflow: hidden;

  :deep(svg) { display: block; }
}

.join-url {
  font-size: 0.7rem;
  color: $text-3;
  word-break: break-all;
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

.remove-slot-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid $hairline;
  background: transparent;
  color: $text-3;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 150ms, color 150ms, border-color 150ms;
  &:hover { background: rgba(220, 80, 90, 0.12); color: $brand-1; border-color: rgba(220, 80, 90, 0.35); }
}

.add-ai-btn {
  font-size: 0.85rem;
  padding: 0.45rem 0.9rem;
  align-self: flex-start;
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

// ── Owner toast ────────────────────────────────────────────────────────────────

.owner-toast {
  font-size: 0.875rem;
  color: hsl(140, 50%, 60%);
  background: rgba(74, 200, 110, 0.1);
  border: 1px solid rgba(74, 200, 110, 0.25);
  border-radius: $border-radius-sm;
  padding: 0.6rem 0.875rem;
  text-align: center;
}

.toast-enter-active { transition: opacity 200ms $ease-out, transform 200ms $ease-out; }
.toast-leave-active { transition: opacity 150ms $ease-out, transform 150ms $ease-out; }
.toast-enter-from   { opacity: 0; transform: translateY(-6px); }
.toast-leave-to     { opacity: 0; transform: translateY(-4px); }

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
