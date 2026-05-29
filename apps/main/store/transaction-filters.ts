import { create } from "zustand";

interface TransactionFiltersState {
  type: string | null;
  category: string | null;
  startDate: Date | null;
  endDate: Date | null;
  amountMin: number | null;
  amountMax: number | null;

  // Actions
  setType: (type: string | null) => void;
  setCategory: (category: string | null) => void;
  setStartDate: (date: Date | null) => void;
  setEndDate: (date: Date | null) => void;
  setAmountMin: (amount: number | null) => void;
  setAmountMax: (amount: number | null) => void;
  resetFilters: () => void;
}

export const useTransactionFilters = create<TransactionFiltersState>((set) => ({
  // Initial state
  type: null,
  category: null,
  startDate: null,
  endDate: null,
  amountMin: null,
  amountMax: null,

  // Actions
  setType: (type) => set({ type }),
  setCategory: (category) => set({ category }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setAmountMin: (amountMin) => set({ amountMin }),
  setAmountMax: (amountMax) => set({ amountMax }),
  resetFilters: () =>
    set({
      type: null,
      category: null,
      startDate: null,
      endDate: null,
      amountMin: null,
      amountMax: null,
    }),
}));
