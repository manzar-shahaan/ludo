<template>
  <div class="marbles">
    <Marble
      v-for="item in stackedList"
      :key="item.marble.id"
      :model="item.marble"
      :stackIndex="item.stackIndex"
      :stackSize="item.stackSize"
      @clickmarble="onClickMarble"
    />
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
    },
    stackedList(): { marble: Marble; stackIndex: number; stackSize: number }[] {
      // Group marbles that share the same board square.
      const groups = new Map<string, Marble[]>();
      for (const m of this.list) {
        const key = `${m.row},${m.column}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
      }
      return this.list.map(m => {
        const group = groups.get(`${m.row},${m.column}`)!;
        return {
          marble:     m,
          stackIndex: group.indexOf(m),
          stackSize:  group.length,
        };
      });
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
