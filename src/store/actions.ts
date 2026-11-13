// Glue between the AI service (src/ai) and app state. Components call these; they never call the model directly.
import type { MealPlan, Preferences, Recipe } from "../types";
import { slotKey } from "../types";
import { useKitchen } from "./useKitchen";
import { useUI } from "./useUI";
import {
  generateAlternative, generateMealPlan, generateRecipeDetails, rescueRecipes, surpriseMe,
  type KitchenContext,
} from "../ai/mealPlanner";
import { AIError, friendlyError } from "../ai/provider";
import { MEAL_TYPES } from "../data/categories";
import { todayISO } from "../lib/dates";
import { needsUsingSoon, urgency } from "../lib/freshness";
import { uid } from "../lib/utils";

export function kitchenContext(prefs?: Preferences): KitchenContext {
  const s = useKitchen.getState();
  return { inventory: s.inventory, prefs: prefs ?? s.prefs, recent: s.recentMeals };
}

/** Generates a new plan, filling the board live as meals stream in. */
export async function runGeneratePlan(prefs: Preferences) {
  const kitchen = useKitchen.getState();
  const ui = useUI.getState();
  if (ui.generation.running) return;
  kitchen.setPrefs(prefs);
  const total = prefs.days * prefs.meals.length;
  const abort = new AbortController();
  const previous = kitchen.plan;
  const plan: MealPlan = {
    id: uid("plan-"), createdAt: new Date().toISOString(), startDate: todayISO(), days: prefs.days,
    mealTypes: prefs.meals, slots: {}, summary: "", warnings: [],
  };
  kitchen.setPlan(plan);
  ui.setGeneration({ running: true, done: 0, total, status: "Reading your kitchen…", error: undefined, abort });

  try {
    const result = await generateMealPlan(kitchenContext(prefs), plan.startDate, {
      onMeal(recipe, day, meal) {
        const k = useKitchen.getState();
        k.upsertRecipe(recipe);
        k.setSlot(slotKey(day, meal), recipe.id);
        const g = useUI.getState().generation;
        useUI.getState().setGeneration({ done: g.done + 1, status: `Planned Day ${day + 1} ${MEAL_TYPES[meal].label.toLowerCase()}: ${recipe.name}` });
      },
      onSummary(summary, warnings) {
        const current = useKitchen.getState().plan;
        if (current?.id === plan.id) useKitchen.setState({ plan: { ...current, summary, warnings } });
      },
    }, abort.signal);
    const missing = total - result.count;
    useUI.getState().setGeneration({ running: false, status: "" });
    useUI.getState().toast({ text: missing > 0 ? `Plan ready. ${missing} slot${missing === 1 ? "" : "s"} couldn't be filled.` : "Your meal plan is ready.", tone: "success" });
  } catch (e) {
    const filled = Object.keys(useKitchen.getState().plan?.slots ?? {}).length;
    if (!filled && previous) useKitchen.getState().setPlan(previous);
    else if (!filled) useKitchen.getState().setPlan(null);
    const cancelled = e instanceof AIError && e.code === "cancelled";
    useUI.getState().setGeneration({ running: false, status: "", error: cancelled ? undefined : friendlyError(e) });
    if (cancelled) useUI.getState().toast({ text: filled ? `Stopped. Kept the ${filled} meals planned so far.` : "Stopped." });
  }
}

export function stopGeneration() {
  useUI.getState().generation.abort?.abort();
}

const detailJobs = new Map<string, Promise<void>>();

/** Fetches cooking steps for a recipe the first time it's opened. */
export function ensureDetails(recipeId: string): Promise<void> {
  const r = useKitchen.getState().recipes[recipeId];
  if (!r || r.details) return Promise.resolve();
  if (!detailJobs.has(recipeId)) {
    const job = generateRecipeDetails(kitchenContext(), r)
      .then((details) => {
        const latest = useKitchen.getState().recipes[recipeId];
        if (latest) useKitchen.getState().upsertRecipe({ ...latest, details });
      })
      .finally(() => detailJobs.delete(recipeId));
    detailJobs.set(recipeId, job);
  }
  return detailJobs.get(recipeId)!;
}

export function findSlotOf(recipeId: string): string | null {
  const plan = useKitchen.getState().plan;
  if (!plan) return null;
  return Object.entries(plan.slots).find(([, id]) => id === recipeId)?.[0] ?? null;
}

/** "Not feeling this?": replaces one meal without touching the rest of the plan. Undo-able. */
export async function replaceWithAlternative(recipe: Recipe, instruction: string, signal?: AbortSignal): Promise<Recipe> {
  const k = useKitchen.getState();
  const others = Object.values(k.plan?.slots ?? {}).filter((id) => id && id !== recipe.id).map((id) => k.recipes[id!]?.name).filter(Boolean) as string[];
  const alt = await generateAlternative(kitchenContext(), recipe, instruction, others, signal);
  k.upsertRecipe(alt);
  const slot = findSlotOf(recipe.id);
  if (slot) {
    k.setSlot(slot, alt.id);
    useUI.getState().toast({
      text: `Swapped in ${alt.name}.`, tone: "success",
      action: { label: "Undo", run: () => { useKitchen.getState().setSlot(slot, recipe.id); useUI.getState().openRecipe(recipe.id); } },
    });
  }
  return alt;
}

export async function runSurprise(signal?: AbortSignal): Promise<Recipe> {
  const r = await surpriseMe(kitchenContext(), signal);
  useKitchen.getState().upsertRecipe(r);
  return r;
}

export function urgentItems() {
  return useKitchen.getState().inventory.filter(needsUsingSoon).sort((a, b) => urgency(b) - urgency(a));
}

export async function runRescue(signal?: AbortSignal): Promise<Recipe[]> {
  const urgent = urgentItems().slice(0, 6);
  const recipes = await rescueRecipes(kitchenContext(), urgent, signal);
  const k = useKitchen.getState();
  recipes.forEach((r) => k.upsertRecipe(r));
  k.setRescue(recipes.map((r) => r.id));
  return recipes;
}

/** Removes the kitchen items a cooked recipe used up. */
export function finishCooking(recipeId: string, usedIds: string[]) {
  const k = useKitchen.getState();
  usedIds.forEach((id) => k.markUsed(id));
  k.noteCooked(recipeId);
}
