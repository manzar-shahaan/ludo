<template>
  <div class="marbles">
    <Marble v-for="item in list" :key="item.id" :model="item" @clickmarble="onClickMarble" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import store from '@/store/index';
import MarbleComponent from '@/components/Marble.vue';
import { Marble } from '@/types/types';

export default defineComponent({
  name: 'MarblesLayer',
  components: { Marble: MarbleComponent },

  computed: {
    list(): Marble[] {
      return store.getters['marbles/list'];
    }
  },

  methods: {
    onClickMarble(marble: Marble) {
      this.$emit('clickmarble', marble);
    }
  }
});
</script>

<style lang="scss" scoped>
.marbles { @include absolute-cover; }
</style>
