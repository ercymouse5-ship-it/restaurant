import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  note: string;
  size?: string;
  sizePrice?: number;
  extras: { name: string; price: number }[];
};
type CartState = {
  restaurantSlug: string | null;
  lines: CartLine[];
  addLine: (line: Omit<CartLine, 'key' | 'quantity'>) => void;
  changeQuantity: (key: string, delta: number) => void;
  updateNote: (key: string, note: string) => void;
  clear: () => void;
  setRestaurant: (slug: string) => void;
};
const fallbackStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useCart = create<CartState>()(persist((set) => ({
  restaurantSlug: null,
  lines: [],
  addLine: (line) => set((state) => {
    const key = [line.itemId, line.size || '', line.extras.map((extra) => extra.name).join(',')].join(':');
    const existing = state.lines.find((candidate) => candidate.key === key && candidate.note === line.note);
    return {
      lines: existing
        ? state.lines.map((candidate) => candidate.key === key && candidate.note === line.note ? { ...candidate, quantity: candidate.quantity + 1 } : candidate)
        : [...state.lines, { ...line, key, quantity: 1 }],
    };
  }),
  changeQuantity: (key, delta) => set((state) => ({
    lines: state.lines.map((line) => line.key === key ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0),
  })),
  updateNote: (key, note) => set((state) => ({ lines: state.lines.map((line) => line.key === key ? { ...line, note } : line) })),
  clear: () => set({ lines: [], restaurantSlug: null }),
  setRestaurant: (slug) => set((state) => state.restaurantSlug && state.restaurantSlug !== slug
    ? { restaurantSlug: slug, lines: [] }
    : { restaurantSlug: slug }),
}), {
  name: 'mat3am-cart-v1',
  storage: createJSONStorage(() => typeof window === 'undefined' ? fallbackStorage : window.localStorage),
  partialize: (state) => ({ restaurantSlug: state.restaurantSlug, lines: state.lines }),
}));
