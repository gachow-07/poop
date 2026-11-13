// FridgeChef's AI service: the only module the UI calls for generated content.
// Flow for each call: build prompt → model → parse/validate (schemas) → reconcile with real data (guards).
import type { Ingredient, MealType, Recipe, RecipeDetails, RecipeIngredient } from "../types";
import { uid } from "../lib/utils";
import { addDays } from "../lib/dates";
import { CATEGORIES } from "../data/categories";
import { lookupCatalog } from "../data/catalog";
import { AIError, requireProvider } from "./provider";
import { createLineReader, extractJSON } from "./json";
import { AiDetails, AiParsedItem, AiRecipe, AiSummary } from "./schemas";
import { reconcileRecipe, type ReconcileContext } from "./guards";
import {
  alternativePrompt, detailsPrompt, parseImagePrompt, parseTextPrompt, planPrompt,
  rescuePrompt, surprisePrompt, type KitchenContext,
} from "./prompts";

export type { KitchenContext } from "./prompts";
export { VARIANTS } from "./prompts";

const reconcileCtx = (ctx: KitchenContext, allowLeftovers: boolean): ReconcileContext => ({
  inventory: ctx.inventory,
  allergies: ctx.prefs.allergies,
  assumeStaples: ctx.prefs.assumeStaples,
  allowLeftovers,
});

function toRecipe(raw: AiRecipe, origin: Recipe["origin"], fallbackMeal: MealType): Recipe {
  const ingredients: RecipeIngredient[] = raw.ingredients.map((i) => ({
    name: i.name,
    amount: i.amount,
    inventoryId: i.inventoryId ?? null,
    fromLeftover: i.fromLeftover || undefined,
    have: false,
    aisle: i.aisle,
    estCost: i.estCost,
    substitution: i.substitute ? { use: i.substitute.use, amount: i.substitute.amount, note: i.substitute.note, inventoryIds: i.substitute.inventoryIds } : undefined,
  }));
  const details: RecipeDetails | undefined = raw.steps?.length
    ? { steps: raw.steps, storage: raw.storage ?? "", leftoverIdeas: raw.leftoverIdeas ?? [], tips: raw.tips ?? [] }
    : undefined;
  return {
    id: uid("r-"),
    name: raw.name,
    emoji: raw.emoji || "🍽️",
    description: raw.description,
    cuisine: raw.cuisine,
    mealType: raw.mealType ?? fallbackMeal,
    difficulty: raw.difficulty,
    prepMinutes: Math.round(raw.prepMinutes),
    cookMinutes: Math.round(raw.cookMinutes),
    servings: raw.servings,
    nutrition: raw.nutrition,
    tags: raw.tags.slice(0, 5),
    ingredients,
    usesExpiring: raw.usesExpiring,
    leftovers: raw.leftovers ? { makes: raw.leftovers.makes ?? undefined, from: raw.leftovers.from ?? undefined } : undefined,
    details,
    allergyFlags: [],
    createdAt: new Date().toISOString(),
    origin,
  };
}

function parseRecipe(value: unknown, ctx: KitchenContext, origin: Recipe["origin"], fallbackMeal: MealType, allowLeftovers = false): Recipe {
  const parsed = AiRecipe.safeParse(value);
  if (!parsed.success || !parsed.data.ingredients.length) throw new AIError("invalid_output");
  return reconcileRecipe(toRecipe(parsed.data, origin, fallbackMeal), reconcileCtx(ctx, allowLeftovers));
}

function ensureFood(ctx: KitchenContext) {
  if (!ctx.inventory.length) throw new AIError("invalid_output", "Add a few ingredients to your kitchen first.");
}

// ---------------------------------------------------------------- meal plan

export interface PlanProgress {
  onMeal(recipe: Recipe, day: number, meal: MealType): void;
  onSummary?(summary: string, warnings: string[]): void;
}

/**
 * Streams a full meal plan. Meals arrive one by one through `onMeal` as the model writes them,
 * so the board fills in live. Resolves with the summary once everything is in.
 */
export async function generateMealPlan(
  ctx: KitchenContext, startDate: string, progress: PlanProgress, signal?: AbortSignal,
): Promise<{ summary: string; warnings: string[]; count: number }> {
  ensureFood(ctx);
  const ai = await requireProvider();
  const reader = createLineReader();
  const seen = new Set<string>();
  let summary = "", warnings: string[] = [], count = 0;
  const validDays = ctx.prefs.days;

  const handle = (obj: unknown) => {
    const kind = (obj as { kind?: string })?.kind;
    if (kind === "summary") {
      const s = AiSummary.safeParse(obj);
      if (s.success) { summary = s.data.summary; warnings = s.data.warnings; progress.onSummary?.(summary, warnings); }
      return;
    }
    const parsed = AiRecipe.safeParse(obj);
    if (!parsed.success || !parsed.data.ingredients.length) return;
    const day = (parsed.data.day ?? 1) - 1;
    const meal = parsed.data.mealType;
    if (!meal || day < 0 || day >= validDays || !ctx.prefs.meals.includes(meal)) return;
    const key = `${day}:${meal}`;
    if (seen.has(key)) return;
    seen.add(key);
    const recipe = reconcileRecipe(toRecipe(parsed.data, "plan", meal), reconcileCtx(ctx, true));
    count++;
    progress.onMeal(recipe, day, meal);
  };

  const text = await ai.complete(planPrompt(ctx, startDate), {
    signal,
    onText: (t) => reader.feed(t).forEach(handle),
  });
  reader.flush(text).forEach(handle);
  if (!count) throw new AIError("invalid_output");
  return { summary, warnings, count };
}

// ---------------------------------------------------------------- single recipes

export async function generateRecipeDetails(ctx: KitchenContext, recipe: Recipe, signal?: AbortSignal): Promise<RecipeDetails> {
  const ai = await requireProvider();
  const text = await ai.complete(detailsPrompt(ctx, recipe), { signal });
  const parsed = AiDetails.safeParse(extractJSON(text));
  if (!parsed.success) throw new AIError("invalid_output");
  return parsed.data;
}

export async function generateAlternative(
  ctx: KitchenContext, recipe: Recipe, instruction: string, otherMeals: string[], signal?: AbortSignal,
): Promise<Recipe> {
  ensureFood(ctx);
  const ai = await requireProvider();
  const text = await ai.complete(alternativePrompt(ctx, recipe, instruction, otherMeals), { signal });
  const r = parseRecipe(extractJSON(text), ctx, "alternative", recipe.mealType);
  return { ...r, mealType: recipe.mealType };
}

export async function surpriseMe(ctx: KitchenContext, signal?: AbortSignal): Promise<Recipe> {
  ensureFood(ctx);
  const ai = await requireProvider();
  const text = await ai.complete(surprisePrompt(ctx), { signal });
  return parseRecipe(extractJSON(text), ctx, "surprise", "dinner");
}

export async function rescueRecipes(ctx: KitchenContext, urgent: Ingredient[], signal?: AbortSignal): Promise<Recipe[]> {
  ensureFood(ctx);
  const ai = await requireProvider();
  const text = await ai.complete(rescuePrompt(ctx, urgent), { signal });
  const value = extractJSON(text);
  const list = Array.isArray(value) ? value : [];
  const recipes = list.flatMap((v) => { try { return [parseRecipe(v, ctx, "rescue", "dinner")]; } catch { return []; } });
  if (!recipes.length) throw new AIError("invalid_output");
  return recipes;
}

// ---------------------------------------------------------------- ingredient capture

export interface ParsedItem {
  name: string; quantity: number; unit: string;
  category: Ingredient["category"]; location: Ingredient["location"];
  expiresOn?: string;
}

function toParsedItems(value: unknown, today: string): ParsedItem[] {
  const list = Array.isArray(value) ? value : [];
  return list.flatMap((v) => {
    const r = AiParsedItem.safeParse(v);
    if (!r.success) return [];
    const d = r.data;
    return [{
      name: d.name, quantity: d.quantity, unit: d.unit, category: d.category, location: d.location,
      expiresOn: d.expiresInDays != null && d.expiresInDays > 0 ? addDays(today, d.expiresInDays) : undefined,
    }];
  });
}

export async function parseIngredientsWithAI(text: string, today: string, signal?: AbortSignal): Promise<ParsedItem[]> {
  const ai = await requireProvider();
  const out = await ai.complete(parseTextPrompt(text), { signal, tier: "quick" });
  return toParsedItems(extractJSON(out), today);
}

export async function parseIngredientsFromImage(image: Blob, kind: "fridge" | "receipt", today: string, signal?: AbortSignal): Promise<ParsedItem[]> {
  const ai = await requireProvider();
  if (!ai.canSeeImages) throw new AIError("unavailable", "Photo scanning isn't available here.");
  const out = await ai.complete(parseImagePrompt(kind), { images: [image], signal });
  return toParsedItems(extractJSON(out), today);
}

/** Offline parser for typed lists like "6 eggs, 2 chicken breasts, 1/2 bag spinach". No AI needed. */
export function parseIngredientsLocally(text: string, today: string): ParsedItem[] {
  const UNIT = "(lbs?|pounds?|oz|ounces?|g|grams?|kg|cups?|tbsp|tablespoons?|tsp|teaspoons?|ml|l|liters?|cans?|bags?|bunch(?:es)?|heads?|slices?|packs?|packages?|cloves?|blocks?|dozen|jars?|bottles?|boxes?|cartons?|pieces?|pcs)";
  const QTY = "(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d*\\.?\\d+|a|an|one|two|three|four|five|six|half(?: a)?)";
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, "half a": 0.5 };
  return text
    .replace(/^\s*(i have|i've got|there'?s|we have)\s*/i, "")
    .split(/,|\n|;|\band\b/i)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((part) => {
      const m = part.match(new RegExp(`^${QTY}\\s*${UNIT}?\\s+(?:of\\s+)?(.+)$`, "i"));
      let quantity = 1, unit = "", name = part;
      if (m) {
        const q = m[1].toLowerCase();
        quantity = words[q] ?? (q.includes("/") ? q.split(/\s+/).reduce((acc, p) => acc + (p.includes("/") ? +p.split("/")[0] / +p.split("/")[1] : +p), 0) : Number(q)) ?? 1;
        unit = m[2] ?? "";
        name = m[3];
      }
      name = name.replace(/^(some|a few|fresh)\s+/i, "").trim();
      name = name.charAt(0).toUpperCase() + name.slice(1);
      const hit = lookupCatalog(name);
      const category = hit?.category ?? "other";
      return {
        name: hit?.name ?? name,
        quantity: quantity || 1,
        unit: (unit || hit?.unit || "pieces").toLowerCase().replace(/^pcs$/, "pieces"),
        category,
        location: hit?.location ?? CATEGORIES[category].location,
        expiresOn: hit?.keeps ? addDays(today, hit.keeps) : undefined,
      };
    });
}
