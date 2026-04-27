<template>
  <div class="home">
    <div class="home-card">
      <div class="brand">
        <div class="brand-dots" aria-hidden="true">
          <span class="dot dot-1"></span>
          <span class="dot dot-2"></span>
          <span class="dot dot-3"></span>
          <span class="dot dot-4"></span>
        </div>
        <h1 class="title">Ludo</h1>
        <p class="subtitle">A modern take on a classic board.</p>
      </div>
      <div class="cta">
        <router-link class="ui-btn ui-btn--primary ui-btn--lg" to="/play">Play</router-link>
        <router-link class="ui-btn ui-btn--lg" to="/about">About</router-link>
      </div>
    </div>

    <footer class="footer">
      <button class="version" type="button" @click="showBuildInfo = !showBuildInfo">v{{ appVersion }}</button>
      <span v-if="showBuildInfo" class="build-info">{{ appVersionTitle }}</span>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store/index';

export default defineComponent({
  name: 'HomeView',

  data() {
    return { showBuildInfo: false };
  },

  computed: {
    appVersion(): string {
      return store.getters['appVersion'];
    },
    buildDate(): string {
      const date = new Date(Number(store.getters['buildDate']));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },
    appVersionTitle(): string {
      return `Built ${this.buildDate}`;
    }
  }
});
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  position: relative;
}
.home-card {
  width: min(440px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2.5rem;
  padding: 3rem 2.5rem;
  border-radius: $border-radius-lg;
  @include glass;
  animation: fade-in-up 500ms $ease-out both;
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.brand-dots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 6px;
  width: 56px;
  height: 56px;
  margin-bottom: 0.5rem;
  .dot { border-radius: 8px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15); }
  .dot-1 { background: $brand-1; }
  .dot-2 { background: $brand-4; }
  .dot-3 { background: $brand-2; }
  .dot-4 { background: $brand-3; }
}
.title {
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: $text-1;
}
.subtitle { color: $text-2; font-size: 0.95rem; }
.cta {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.7rem;
  .ui-btn { width: 100%; }
}
.footer {
  position: absolute;
  bottom: 1.25rem;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: $text-3;
  font-size: 0.8rem;
}
.version { color: $text-3; letter-spacing: 0.04em; &:hover { color: $text-2; } }
.build-info { font-family: $font-family-numeric; font-size: 0.75rem; }
</style>
