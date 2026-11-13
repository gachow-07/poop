// App state: inventory, preferences, plan, recipe library, grocery list and progress stats.
// Persisted to this browser so the kitchen survives between visits.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GroceryItem, Ingredient, MealPlan, Preferences, Recipe } from "../types";
import { sampleInventory, samplePlan, sampleRecipes } from "../data/sample";
import { reconcileRecipe } from "../ai/guards";
import { needsUsingSoon } from "../lib/freshness";
import { norm, uid } from "../lib/utils";

export const DEFAULT_PREFS: Preferences = {
  days: 3,
  meals: ["breakfast", "lunch", "dinner"],
  diets: [],
  otherDiet: "",
  allergies: [],
  maxMinutes: 45,
  skill: "intermediate",
  servings: 2,
  cuisines: [],
  budgetMode: true,
  leftoverMode: true,
  assumeStaples: true,
};

interface KitchenState {
  onboarded: boolean;
  inventory: Ingredient[];
  prefs: Preferences;
  recipes: Record<string, Recipe>;
  plan: MealPlan | null;
  favorites: string[];
  grocery: GroceryItem[];
  /** grocery names the user removed from this plan's list (normalized) */
  dismissedGrocery: string[];
  rescueIds: string[];
  stats: { savedFromWaste: number; cooked: number };
  recentMeals: string[];

  setOnboarded(v: boolean): void;
  addIngredients(items: Omit<Ingredient, "id" | "addedAt">[]): void;
  updateIngredient(id: string, patch: Partial<Ingredient>): void;
  removeIngredient(id: string): void;
  adjustQuantity(id: string, delta: number): void;
  /** Used it up (counts toward food saved when it was close to expiring). */
  markUsed(id: string): void;
  /** Undo for delete / mark used. */
  restoreIngredient(item: Ingredient, wasUsed: boolean): void;
  clearSampleData(): void;

  setPrefs(p: Preferences): void;
  upsertRecipe(r: Recipe): void;
  /** Re-run inventory checks on every recipe (after the kitchen or allergies change). */
  refreshRecipes(): void;
  setPlan(plan: MealPlan | null): void;
  setSlot(key: string, recipeId: string | null): void;
  swapSlots(a: string, b: string): void;
  toggleFavorite(id: string): void;
  setRescue(ids: string[]): void;
  noteCooked(recipeId: string): void;

  syncGrocery(): void;
  toggleGrocery(id: string): void;
  updateGrocery(id: string, patch: Partial<GroceryItem>): void;
  removeGrocery(id: string): void;
  addGrocery(name: string, quantity: string, aisle: GroceryItem["aisle"]): void;
  clearCheckedGrocery(): void;
}

function initial() {
  const inventory = sampleInventory();
  const ctx = { inventory, allergies: [], assumeStaples: true, allowLeftovers: true };
  const recipes = Object.fromEntries(sampleRecipes().map((r) => [r.id, reconcileRecipe(r, ctx)]));
  return { inventory, recipes, plan: samplePlan() };
}

/** Builds the shopping list from the plan's missing ingredients, keeping the user's edits. */
function buildGrocery(state: Pick<KitchenState, "plan" | "recipes" | "grocery" | "dismissedGrocery">): GroceryItem[] {
  const custom = state.grocery.filter((g) => g.custom);
  if (!state.plan) return custom;
  const prev = new Map(state.grocery.filter((g) => !g.custom).map((g) => [norm(g.name), g]));
  const merged = new Map<string, GroceryItem>();
  for (const id of Object.values(state.plan.slots)) {
    const r = id ? state.recipes[id] : undefined;
    if (!r || r.allergyFlags.length) continue;
    for (const ing of r.ingredients) {
      if (ing.have || ing.fromLeftover) continue;
      const key = norm(ing.name);
      if (state.dismissedGrocery.includes(key)) continue;
      const existing = merged.get(key);
      if (existing) {
        if (!existing.recipeIds.includes(r.id)) existing.recipeIds.push(r.id);
        existing.quantity = existing.quantity && ing.amount && existing.quantity !== ing.amount ? `${existing.quantity} + ${ing.amount}` : existing.quantity || ing.amount;
        existing.estCost = (existing.estCost ?? 0) + (ing.estCost ?? 0) || undefined;
      } else {
        const old = prev.get(key);
        merged.set(key, {
          id: old?.id ?? uid("g-"),
          name: ing.name,
          quantity: ing.amount,
          aisle: ing.aisle ?? "other",
          checked: old?.checked ?? false,
          custom: false,
          estCost: ing.estCost,
          recipeIds: [r.id],
        });
      }
    }
  }
  // Keep quantities the user typed themselves.
  for (const [key, item] of merged) {
    const old = prev.get(key);
    if (old?.edited) { item.quantity = old.quantity; item.edited = true; }
  }
  return [...merged.values(), ...custom];
}

export const useKitchen = create<KitchenState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      ...initial(),
      prefs: DEFAULT_PREFS,
      favorites: ["r-s6"],
      grocery: [],
      dismissedGrocery: [],
      rescueIds: [],
      stats: { savedFromWaste: 12, cooked: 9 },
      recentMeals: [],

      setOnboarded: (v) => set({ onboarded: v }),

      addIngredients: (items) => {
        const now = new Date().toISOString();
        set((s) => ({ inventory: [...items.map((i) => ({ ...i, id: uid("i-"), addedAt: now })), ...s.inventory] }));
        get().refreshRecipes();
      },
      updateIngredient: (id, patch) => {
        set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
        if ("name" in patch) get().refreshRecipes();
      },
      removeIngredient: (id) => {
        set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) }));
        get().refreshRecipes();
      },
      adjustQuantity: (id, delta) => {
        const item = get().inventory.find((i) => i.id === id);
        if (!item) return;
        const step = item.quantity < 1 || (item.quantity % 1 !== 0 && Math.abs(delta) === 1) ? 0.5 * Math.sign(delta) : delta;
        const q = Math.round((item.quantity + step) * 100) / 100;
        if (q <= 0) get().markUsed(id);
        else set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, quantity: q } : i)) }));
      },
      markUsed: (id) => {
        const item = get().inventory.find((i) => i.id === id);
        if (!item) return;
        set((s) => ({
          inventory: s.inventory.filter((i) => i.id !== id),
          stats: { ...s.stats, savedFromWaste: s.stats.savedFromWaste + (needsUsingSoon(item) ? 1 : 0) },
        }));
        get().refreshRecipes();
      },
      restoreIngredient: (item, wasUsed) => {
        set((s) => ({
          inventory: [item, ...s.inventory.filter((i) => i.id !== item.id)],
          stats: wasUsed && needsUsingSoon(item) ? { ...s.stats, savedFromWaste: Math.max(0, s.stats.savedFromWaste - 1) } : s.stats,
        }));
        get().refreshRecipes();
      },
      clearSampleData: () => {
        set({ inventory: [], recipes: {}, plan: null, favorites: [], grocery: [], dismissedGrocery: [], rescueIds: [], stats: { savedFromWaste: 0, cooked: 0 }, recentMeals: [] });
      },

      setPrefs: (prefs) => { set({ prefs }); get().refreshRecipes(); },
      upsertRecipe: (r) => set((s) => ({ recipes: { ...s.recipes, [r.id]: r } })),
      refreshRecipes: () => {
        const s = get();
        const ctx = { inventory: s.inventory, allergies: s.prefs.allergies, assumeStaples: s.prefs.assumeStaples, allowLeftovers: true };
        const planned = new Set(Object.values(s.plan?.slots ?? {}));
        const recipes = Object.fromEntries(
          Object.entries(s.recipes).map(([id, r]) => [id, reconcileRecipe(r, { ...ctx, allowLeftovers: planned.has(id) || r.origin === "sample" })]),
        );
        set({ recipes });
        get().syncGrocery();
      },
      setPlan: (plan) => {
        set((s) => ({
          plan,
          dismissedGrocery: plan?.id === s.plan?.id ? s.dismissedGrocery : [],
          grocery: plan?.id === s.plan?.id ? s.grocery : s.grocery.filter((g) => g.custom),
        }));
        get().syncGrocery();
      },
      setSlot: (key, recipeId) => {
        const plan = get().plan;
        if (!plan) return;
        set({ plan: { ...plan, slots: { ...plan.slots, [key]: recipeId } } });
        get().syncGrocery();
      },
      swapSlots: (a, b) => {
        const plan = get().plan;
        if (!plan || a === b) return;
        set({ plan: { ...plan, slots: { ...plan.slots, [a]: plan.slots[b] ?? null, [b]: plan.slots[a] ?? null } } });
      },
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),
      setRescue: (ids) => set({ rescueIds: ids }),
      noteCooked: (recipeId) => {
        const r = get().recipes[recipeId];
        set((s) => ({ stats: { ...s.stats, cooked: s.stats.cooked + 1 }, recentMeals: r ? [r.name, ...s.recentMeals.filter((n) => n !== r.name)].slice(0, 30) : s.recentMeals }));
      },

      syncGrocery: () => set((s) => ({ grocery: buildGrocery(s) })),
      toggleGrocery: (id) => set((s) => ({ grocery: s.grocery.map((g) => (g.id === id ? { ...g, checked: !g.checked } : g)) })),
      updateGrocery: (id, patch) => set((s) => ({ grocery: s.grocery.map((g) => (g.id === id ? { ...g, ...patch, edited: true } : g)) })),
      removeGrocery: (id) =>
        set((s) => {
          const item = s.grocery.find((g) => g.id === id);
          return {
            grocery: s.grocery.filter((g) => g.id !== id),
            dismissedGrocery: item && !item.custom ? [...s.dismissedGrocery, norm(item.name)] : s.dismissedGrocery,
          };
        }),
      addGrocery: (name, quantity, aisle) =>
        set((s) => ({ grocery: [...s.grocery, { id: uid("g-"), name, quantity, aisle, checked: false, custom: true, recipeIds: [] }] })),
      clearCheckedGrocery: () =>
        set((s) => ({
          grocery: s.grocery.filter((g) => !g.checked),
          dismissedGrocery: [...s.dismissedGrocery, ...s.grocery.filter((g) => g.checked && !g.custom).map((g) => norm(g.name))],
        })),
    }),
    {
      name: "fridgechef:v1",
      version: 1,
      storage: createJSONStorage(() => {
        try { localStorage.setItem("fridgechef:probe", "1"); localStorage.removeItem("fridgechef:probe"); return localStorage; }
        catch { const mem = new Map<string, string>(); return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) }; }
      }),
      onRehydrateStorage: () => (state) => { state?.syncGrocery(); },
    },
  ),
);

// Build the sample grocery list on first run.
if (!useKitchen.getState().grocery.length) useKitchen.getState().syncGrocery();
