import type { RoomSlot } from '@/net/types';

interface RoomState {
  code: string | null;
  mySlotIndex: number | null;
  slots: RoomSlot[];
  joinUrl: string;
}

const initialState = (): RoomState => ({
  code: null,
  mySlotIndex: null,
  slots: [],
  joinUrl: ''
});

export default {
  namespaced: true,

  state: initialState,

  mutations: {
    setRoom(state: RoomState, { code, mySlotIndex, slots, joinUrl }: { code: string; mySlotIndex: number; slots: RoomSlot[]; joinUrl: string }) {
      state.code = code;
      state.mySlotIndex = mySlotIndex;
      state.slots = slots;
      state.joinUrl = joinUrl;
    },
    setSlots(state: RoomState, slots: RoomSlot[]) {
      state.slots = slots;
    },
    clear(state: RoomState) {
      const fresh = initialState();
      state.code = fresh.code;
      state.mySlotIndex = fresh.mySlotIndex;
      state.slots = fresh.slots;
      state.joinUrl = fresh.joinUrl;
    }
  },

  getters: {
    code: (state: RoomState) => state.code,
    mySlotIndex: (state: RoomState) => state.mySlotIndex,
    slots: (state: RoomState) => state.slots,
    joinUrl: (state: RoomState) => state.joinUrl,
    isOwner: (state: RoomState) =>
      state.slots.find(sl => sl.slotIndex === state.mySlotIndex)?.isOwner ?? false
  }
};
