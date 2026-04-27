<template>
  <div class="about">
    <article class="card">
      <h1>Ludo</h1>
      <p>
        A modernized fork of an open-source Ludo board, redesigned for a polished
        dark-mode experience and adaptive layout. Local offline multiplayer only —
        no server, no tracking.
      </p>
      <p>
        Original game by
        <a target="_blank" rel="noopener noreferrer" href="https://github.com/mort3za/ludo">Morteza Ziyae</a>.
      </p>
      <hr />
      <router-link class="ui-btn" to="/">Back</router-link>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'AboutView' });
</script>

<style lang="scss" scoped>
.about { min-height: 100vh; display: grid; place-items: center; padding: 2rem; }
.card {
  width: min(560px, 100%);
  padding: 2.5rem;
  border-radius: $border-radius-lg;
  @include glass;
  animation: fade-in-up 400ms $ease-out both;
  h1 { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 1rem; }
  p { color: $text-2; margin-bottom: 1rem; line-height: 1.6; }
  hr { border: none; border-top: 1px solid $hairline; margin: 1.5rem 0; }
}
</style>
