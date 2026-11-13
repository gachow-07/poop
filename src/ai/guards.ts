// Safety net between the model and the UI. Whatever the model says, these checks decide:
//  - what the cook actually HAS (only real inventory items, assumed staples, or planned leftovers),
//  - which allergens slipped through (the UI blocks those meals).
import type { Aisle, Ingredient, Recipe, RecipeIngredient } from "../types";
import { ALLERGEN_KEYWORDS, CATEGORIES } from "../data/categories";
import { lookupCatalog } from "../data/catalog";
import { findInventoryMatch, namesMatch, norm } from "../lib/utils";

export const STAPLES = ["salt", "black pepper", "pepper", "cooking oil", "olive oil", "vegetable oil", "oil", "water"];

const isStaple = (name: string) => {
  const n = norm(name);
  return STAPLES.some((s) => n === s || n === `${s}s` || (n.endsWith(s) && n.split(" ").length <= 3 && /oil|salt|pepper|water/.test(n)));
};

/** Phrases that contain an allergen word but aren't that allergen. */
const NOT_REALLY: Record<string, string[]> = {
  dairy: ["peanut butter", "almond butter", "nut butter", "apple butter", "cocoa butter", "coconut milk", "almond milk", "oat milk", "soy milk", "rice milk", "cream of tartar", "coconut cream", "dairy free", "vegan"],
  gluten: ["gluten free", "corn tortilla", "rice noodle", "rice paper", "tamari", "coconut flour", "almond flour", "rice flour", "chickpea flour"],
  eggs: ["eggplant", "egg free", "vegan mayo"],
  fish: ["shellfish"],
  "tree nuts": ["coconut", "nutmeg", "butternut", "water chestnut"],
  soy: ["soy free"],
};

export function allergenHits(allergies: string[], texts: string[]): string[] {
  const hits: string[] = [];
  for (const raw of allergies) {
    const key = norm(raw);
    const words = ALLERGEN_KEYWORDS[key] ?? [key.replace(/s$/, "")];
    const exclusions = NOT_REALLY[key] ?? [];
    const found = texts.some((t) => {
      let n = ` ${norm(t)} `;
      for (const ex of exclusions) n = n.split(` ${ex} `).join(" ").split(ex).join(" ");
      return words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?\\b`).test(n));
    });
    if (found) hits.push(raw);
  }
  return hits;
}

export function aisleFor(name: string, given?: Aisle): Aisle {
  if (given) return given;
  const c = lookupCatalog(name);
  return c ? CATEGORIES[c.category].aisle : "other";
}

export interface ReconcileContext {
  inventory: Ingredient[];
  allergies: string[];
  assumeStaples: boolean;
  /** Whether "fromLeftover" ingredients may count as owned (true inside a plan). */
  allowLeftovers: boolean;
}

/** Decides `have` for each ingredient from facts, not from the model's say-so. */
export function reconcileIngredients(list: RecipeIngredient[], ctx: ReconcileContext): RecipeIngredient[] {
  const byId = new Map(ctx.inventory.map((i) => [i.id, i]));
  return list.map((ing) => {
    let inventoryId: string | null = ing.inventoryId ?? null;
    let have = false;
    if (inventoryId === "staple") {
      have = ctx.assumeStaples && isStaple(ing.name);
      if (!have) inventoryId = null;
    } else if (inventoryId && byId.has(inventoryId)) {
      const inv = byId.get(inventoryId)!;
      // The id must actually refer to this food (e.g. not "i3" = milk for "heavy cream").
      if (namesMatch(inv.name, ing.name) || norm(ing.name).includes(norm(inv.name)) || norm(inv.name).includes(norm(ing.name))) have = true;
      else inventoryId = null;
    } else {
      inventoryId = null;
    }
    if (!have && ing.fromLeftover && ctx.allowLeftovers) have = true;
    if (!have && !ing.fromLeftover) {
      const match = findInventoryMatch(ing.name, ctx.inventory);
      if (match) { have = true; inventoryId = match.id; }
      else if (ctx.assumeStaples && isStaple(ing.name)) { have = true; inventoryId = "staple"; }
    }
    const substitution = ing.substitution
      ? { ...ing.substitution, inventoryIds: ing.substitution.inventoryIds.filter((id) => byId.has(id)) }
      : undefined;
    return {
      ...ing,
      inventoryId,
      have,
      fromLeftover: ing.fromLeftover && ctx.allowLeftovers ? true : undefined,
      aisle: have ? ing.aisle : aisleFor(ing.name, ing.aisle),
      estCost: have ? undefined : ing.estCost,
      substitution: !have && substitution && substitution.inventoryIds.length ? substitution : !have && substitution?.use ? substitution : undefined,
    };
  });
}

export function reconcileRecipe(recipe: Recipe, ctx: ReconcileContext): Recipe {
  const ingredients = reconcileIngredients(recipe.ingredients, ctx);
  const validIds = new Set(ctx.inventory.map((i) => i.id));
  return {
    ...recipe,
    ingredients,
    usesExpiring: recipe.usesExpiring.filter((id) => validIds.has(id) && ingredients.some((g) => g.inventoryId === id)),
    allergyFlags: allergenHits(ctx.allergies, [recipe.name, ...ingredients.map((i) => i.name), ...ingredients.filter((i) => !i.have && i.substitution).map((i) => i.substitution!.use)]),
  };
}
