// Transient UI state: which sheet is open, toasts, and the live meal-plan generation job.
import { create } from "zustand";
import type { Ingredient } from "../types";
import { uid } from "../lib/utils";

export interface Toast { id: string; text: string; tone?: "default" | "success" | "error"; action?: { label: string; run: () => void } }

interface UIState {
  recipeId: string | null;
  cookingId: string | null;
  ingredientForm: { open: boolean; editing?: Ingredient };
  bulkAdd: { open: boolean; tab?: "type" | "voice" | "photo" | "receipt" };
  prefsOpen: boolean;
  surpriseOpen: boolean;
  toasts: Toast[];
  generation: { running: boolean; done: number; total: number; status: string; error?: string; abort?: AbortController };

  openRecipe(id: string | null): void;
  startCooking(id: string | null): void;
  openIngredientForm(editing?: Ingredient): void;
  closeIngredientForm(): void;
  openBulkAdd(tab?: UIState["bulkAdd"]["tab"]): void;
  closeBulkAdd(): void;
  setPrefsOpen(v: boolean): void;
  setSurpriseOpen(v: boolean): void;
  toast(t: Omit<Toast, "id">): void;
  dismissToast(id: string): void;
  setGeneration(g: Partial<UIState["generation"]>): void;
}

export const useUI = create<UIState>()((set, get) => ({
  recipeId: null,
  cookingId: null,
  ingredientForm: { open: false },
  bulkAdd: { open: false },
  prefsOpen: false,
  surpriseOpen: false,
  toasts: [],
  generation: { running: false, done: 0, total: 0, status: "" },

  openRecipe: (recipeId) => set({ recipeId }),
  startCooking: (cookingId) => set({ cookingId }),
  openIngredientForm: (editing) => set({ ingredientForm: { open: true, editing } }),
  closeIngredientForm: () => set({ ingredientForm: { open: false } }),
  openBulkAdd: (tab = "type") => set({ bulkAdd: { open: true, tab } }),
  closeBulkAdd: () => set({ bulkAdd: { open: false } }),
  setPrefsOpen: (prefsOpen) => set({ prefsOpen }),
  setSurpriseOpen: (surpriseOpen) => set({ surpriseOpen }),
  toast: (t) => {
    const id = uid("t");
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.action ? 7000 : 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setGeneration: (g) => set((s) => ({ generation: { ...s.generation, ...g } })),
}));
