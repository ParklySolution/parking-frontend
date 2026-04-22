import { create } from "zustand";

export type PlateEvent = {
  plate: string;
  confidence?: number;
  timestamp: string;
  source: "camera";
};

export type Transit = {
  id: string;
  plate: string;
  reason: string;
  time: string;
};

type DashboardState = {
  plates: PlateEvent[];
  transits: Transit[];

  addPlate: (plate: PlateEvent) => void;
  addTransit: (transit: Transit) => void;
  clearPlates: () => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  plates: [],
  transits: [],

  addPlate: (plate) =>
    set((state) => ({
      plates: [plate, ...state.plates].slice(0, 10),
    })),

  addTransit: (transit) =>
    set((state) => ({
      transits: [transit, ...state.transits],
    })),

  clearPlates: () => set({ plates: [] }),
}));
