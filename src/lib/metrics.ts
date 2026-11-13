// Numbers derived from the plan and the real inventory (never from the model's claims).
import type { GroceryItem, Ingredient, MealPlan, MealType, Recipe } from "../types";
import { slotKey } from "../types";
import { isPerishable } from "./freshness";
import { addDays } from "./dates";

export function planRecipes(plan: MealPlan | null, recipes: Record<string, Recipe>): Recipe[] {
  if (!plan) return [];
  return Object.values(plan.slots).map((id) => (id ? recipes[id] : undefined)).filter((r): r is Recipe => !!r);
}

/** Share of fresh (perishable) kitchen items the plan uses. */
export function wasteScore(plan: MealPlan | null, recipes: Record<string, Recipe>, inventory: Ingredient[]) {
  const perishable = inventory.filter(isPerishable);
  const used = new Set(planRecipes(plan, recipes).flatMap((r) => r.ingredients.map((i) => i.inventoryId)));
  const usedItems = perishable.filter((i) => used.has(i.id));
  const unused = perishable.filter((i) => !used.has(i.id));
  return { percent: perishable.length ? (usedItems.length / perishable.length) * 100 : 100, used: usedItems.length, total: perishable.length, unused };
}

/** Share of the plan's ingredient lines the cook already has. */
export function haveRatio(rs: Recipe[]) {
  const lines = rs.flatMap((r) => r.ingredients);
  const have = lines.filter((l) => l.have).length;
  return { percent: lines.length ? (have / lines.length) * 100 : 100, have, total: lines.length };
}

export const groceryCost = (items: GroceryItem[]) => items.filter((g) => !g.checked).reduce((a, g) => a + (g.estCost ?? 0), 0);

export function dayTotals(plan: MealPlan, recipes: Record<string, Recipe>, day: number) {
  return plan.mealTypes.reduce(
    (acc, m: MealType) => {
      const r = recipes[plan.slots[slotKey(day, m)] ?? ""];
      if (!r) return acc;
      acc.calories += r.nutrition.calories; acc.protein += r.nutrition.protein;
      acc.carbs += r.nutrition.carbs; acc.fat += r.nutrition.fat;
      acc.minutes += r.prepMinutes + r.cookMinutes;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, minutes: 0 },
  );
}

/** Which plan day is today (or null when today is outside the plan). */
export function todayIndex(plan: MealPlan, today: string): number | null {
  for (let d = 0; d < plan.days; d++) if (addDays(plan.startDate, d) === today) return d;
  return null;
}

export const totalMinutes = (r: Recipe) => r.prepMinutes + r.cookMinutes;
