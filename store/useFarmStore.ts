import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Farm {
  id: string;
  name: string;
}

interface FarmState {
  activeFarmId: string | null;
  setActiveFarmId: (id: string | null) => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      activeFarmId: null,
      setActiveFarmId: (id) => set({ activeFarmId: id }),
    }),
    {
      name: 'farm-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
