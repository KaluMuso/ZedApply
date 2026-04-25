import { create } from "zustand";
import type { UserProfile } from "./api";

interface AppState {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  online: boolean;
  setOnline: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  online: true,
  setOnline: (v) => set({ online: v }),
}));
