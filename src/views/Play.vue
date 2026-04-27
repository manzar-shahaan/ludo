<template>
  <div class="page-play">
    <Board />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Board from '@/components/Board.vue';

export default defineComponent({
  name: 'PagePlay',
  components: { Board }
});
</script>
