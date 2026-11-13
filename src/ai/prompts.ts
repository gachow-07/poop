// Prompt builders. Each turns structured app data into the instructions the model reads.
// They never include recipes of our own; the model writes every dish.
import type { Ingredient, Preferences, Recipe } from "../types";
import { DIETS } from "../data/categories";
import { addDays, daysUntil, weekday } from "../lib/dates";
import { formatQty } from "../lib/utils";
import { allergenHits } from "./guards";
import { urgency } from "../lib/freshness";

export interface KitchenContext {
  inventory: Ingredient[];
  prefs: Preferences;
  /** Names of recent meals, to avoid repeats. */
  recent?: string[];
}

function freshnessNote(i: Ingredient): string {
  const notes: string[] = [];
  if (i.expiresOn) {
    const d = daysUntil(i.expiresOn);
    notes.push(d < 0 ? "PAST its date (check before use)" : d === 0 ? "EXPIRES TODAY" : d === 1 ? "expires TOMORROW" : `expires in ${d} days`);
  }
  if (i.opened) notes.push("opened");
  if (i.notes) notes.push(`note: ${i.notes}`);
  return notes.join(", ") || "no date";
}

/** Inventory minus anything the cook is allergic to, most urgent first. */
export function usableInventory(ctx: KitchenContext) {
  return ctx.inventory
    .filter((i) => allergenHits(ctx.prefs.allergies, [i.name]).length === 0)
    .sort((a, b) => urgency(b) - urgency(a));
}

export function inventoryBlock(ctx: KitchenContext): string {
  const items = usableInventory(ctx);
  if (!items.length) return "INVENTORY: (empty)";
  return [
    "INVENTORY (id | item | amount | stored | freshness), most urgent first:",
    ...items.map((i) => `${i.id} | ${i.name} | ${formatQty(i.quantity)} ${i.unit} | ${i.location} | ${freshnessNote(i)}`),
  ].join("\n");
}

export function preferencesBlock(p: Preferences): string {
  const diets = p.diets.map((d) => DIETS.find((x) => x.id === d)?.label ?? d);
  if (p.otherDiet.trim()) diets.push(p.otherDiet.trim());
  return [
    "PREFERENCES:",
    `- Servings per meal: ${p.servings}`,
    `- Diet: ${diets.length ? diets.join(", ") : "no restrictions"}`,
    `- Max total time per meal (prep + cook): ${p.maxMinutes ? `${p.maxMinutes} minutes` : "no limit"}`,
    `- Cooking skill: ${p.skill}${p.skill === "beginner" ? " (simple techniques, short ingredient lists, nothing fussy)" : ""}`,
    p.cuisines.length ? `- Favourite cuisines: ${p.cuisines.join(", ")} (lean toward these, but practicality wins)` : "- Cuisines: any",
    p.caloriesPerMeal ? `- Aim for about ${p.caloriesPerMeal} calories per serving` : "",
    p.proteinPerMeal ? `- Aim for at least ${p.proteinPerMeal} g protein per serving` : "",
    p.budgetMode ? "- Budget-conscious: keep purchases few and cheap; prefer pantry items" : "",
    p.leftoverMode ? "- Leftover-friendly: cook once, eat twice; plan intentional leftovers" : "",
  ].filter(Boolean).join("\n");
}

export function rulesBlock(p: Preferences): string {
  const allergy = p.allergies.length
    ? `1. ALLERGIES: never use ${p.allergies.join(", ")} or anything made from them (check sauces, stocks, breads, dressings, processed foods). This overrides every other goal. If a meal can't be made safely, choose a different meal.`
    : "1. No allergies listed.";
  return [
    "HARD RULES (never break these):",
    allergy,
    "2. Set \"inventoryId\" ONLY to an id from the INVENTORY list, and only when that item really is the ingredient. Everything else gets \"inventoryId\": null and is something the cook must buy. Never pretend the cook has something.",
    p.assumeStaples
      ? "3. Salt, black pepper, cooking oil and water are always available: give them \"inventoryId\": \"staple\"."
      : "3. Don't assume any staples. Salt, oil etc. count as purchases unless they're in the inventory.",
    "4. Respect the diet, the time limit, the skill level and the servings.",
    "5. Track quantities: never use more of an item across all meals than the cook has.",
    "6. Use realistic, appetising combinations a home cook would actually make.",
    "",
    "PRIORITIES (in this order):",
    "1. Use items that expire soonest first, ideally on Day 1-2. Don't leave perishables unused.",
    "2. Use opened items before unopened ones.",
    "3. Use highly perishable foods (fresh meat, fish, greens, berries) early.",
    "4. Use items the cook has a lot of.",
    "5. Reuse ingredients across meals so nothing is half-used.",
    "6. Keep purchases to a minimum. When something is missing but the cook owns a sensible substitute, add a \"substitute\" telling them exactly how much to use.",
  ].join("\n");
}

const INGREDIENT_SHAPE = `{"name":"Chicken breast","amount":"2 pieces","inventoryId":"i1"}  or for something to buy: {"name":"Heavy cream","amount":"½ cup","inventoryId":null,"aisle":"dairy","estCost":2.49,"substitute":{"use":"Milk + butter","amount":"6 tbsp milk + 2 tbsp melted butter","note":"Thinner, but works in a pan sauce","inventoryIds":["i4","i9"]}}`;

const RECIPE_FIELDS = `"name","emoji" (one emoji for the dish),"description" (1-2 appetising sentences),"cuisine","difficulty" ("Easy"|"Medium"|"Hard"),"prepMinutes","cookMinutes","servings","nutrition" ({"calories","protein","carbs","fat"} per serving, grams),"tags" (e.g. "High protein","Vegetarian","Quick","Gluten-free"),"ingredients" (list, each like ${INGREDIENT_SHAPE}; "aisle" is one of produce|meat|dairy|pantry|frozen|other; "estCost" is a typical US price in dollars),"usesExpiring" (inventory ids of soon-to-expire items it uses)`;

const DETAIL_FIELDS = `"steps" (4-8 clear steps: [{"text":"...","minutes":5}], minutes only for steps that take time),"storage" (how to store leftovers and for how long),"leftoverIdeas" (1-3 ideas),"tips" (1-2 short tips)`;

export function planPrompt(ctx: KitchenContext, startDate: string): string {
  const p = ctx.prefs;
  const days = Array.from({ length: p.days }, (_, d) => `Day ${d + 1} (${weekday(addDays(startDate, d))})`);
  const order = days.flatMap((d) => p.meals.map((m) => `${d} ${m}`));
  return `You are FridgeChef, a practical home-cooking planner. Plan meals that turn what this cook already has into good food, wasting as little as possible.

${inventoryBlock(ctx)}

${preferencesBlock(p)}

${rulesBlock(p)}

LEFTOVERS: ${p.leftoverMode ? "Design meals so food carries over: e.g. roast extra chicken at dinner, then use it in the next day's wrap and fried rice." : "Leftovers are fine where they make sense."} Mark a meal that cooks extra with "leftovers":{"makes":"2 extra chicken breasts, cooked"}. A meal that uses them lists that ingredient with "fromLeftover":true, "inventoryId":null and "leftovers":{"from":"Day 1 dinner"}. Leftover lunches/dinners count as real meals.
${ctx.recent?.length ? `\nAvoid repeating these recent meals: ${ctx.recent.slice(0, 20).join("; ")}.` : ""}

SLOTS TO FILL, in this exact order (${order.length} meals): ${order.join(", ")}.

OUTPUT FORMAT: JSON Lines only. One complete JSON object per line, no prose, no code fences, no blank lines.
For each slot, in order, one line: {"kind":"meal","day":1,"mealType":"breakfast", ${RECIPE_FIELDS}, "leftovers":{...} (optional)}
Do NOT include cooking steps here; they're fetched separately.
After the last meal, one final line: {"kind":"summary","summary":"2 friendly sentences on how the plan uses their food","warnings":["anything important: e.g. not enough protein for every dinner, an item that's past its date, something missing for a complete meal"]}
If there isn't enough food for some meals, still fill them with the fewest purchases possible and say so in "warnings". Never invent inventory.`;
}

export function detailsPrompt(ctx: KitchenContext, recipe: Recipe): string {
  return `You are FridgeChef. Write the full method for this recipe for a ${ctx.prefs.skill} home cook, ${recipe.servings} servings.

RECIPE: ${recipe.name} (${recipe.cuisine}) — ${recipe.description}
INGREDIENTS:
${recipe.ingredients.map((i) => `- ${i.amount} ${i.name}${i.have ? "" : " (buying)"}${i.substitution ? ` (may substitute: ${i.substitution.amount} ${i.substitution.use})` : ""}`).join("\n")}
${recipe.leftovers?.makes ? `This meal deliberately makes leftovers: ${recipe.leftovers.makes}. Say when to set them aside.` : ""}
${ctx.prefs.allergies.length ? `Allergies: never suggest ${ctx.prefs.allergies.join(", ")}.` : ""}

Use oven temperatures in °F with °C in brackets. Include safe internal temperatures for meat.
Reply with ONLY one JSON object: {${DETAIL_FIELDS}}`;
}

export interface Variant { id: string; label: string; instruction: string }

export const VARIANTS: Variant[] = [
  { id: "faster", label: "Make it faster", instruction: "Make it noticeably faster: aim for under 20 minutes total." },
  { id: "healthier", label: "Make it healthier", instruction: "Make it lighter and healthier: more vegetables, less fat and refined carbs." },
  { id: "protein", label: "Higher protein", instruction: "Raise the protein substantially (aim for 35 g+ per serving) using what the cook has." },
  { id: "vegetarian", label: "Make it vegetarian", instruction: "Make it fully vegetarian (no meat, poultry or fish)." },
  { id: "fewer", label: "Fewer ingredients", instruction: "Use as few ingredients as possible (6 or fewer)." },
  { id: "expiring", label: "Use expiring food", instruction: "Rebuild it around the items that expire soonest in the inventory." },
  { id: "cheaper", label: "Make it cheaper", instruction: "Make it cheaper: zero or near-zero purchases, rely on the inventory." },
];

export function alternativePrompt(ctx: KitchenContext, recipe: Recipe, instruction: string, otherMeals: string[]): string {
  return `You are FridgeChef. The cook wants a different version of one meal in their plan.

CURRENT MEAL (${recipe.mealType}): ${recipe.name} — ${recipe.description}
It used: ${recipe.ingredients.map((i) => i.name).join(", ")}
REQUEST: ${instruction}

${inventoryBlock(ctx)}

${preferencesBlock(ctx.prefs)}

${rulesBlock(ctx.prefs)}

Other meals already in the plan (don't duplicate them, and don't use up ingredients they clearly need): ${otherMeals.join("; ") || "none"}.
The replacement must be a ${recipe.mealType} for ${ctx.prefs.servings} servings.

Reply with ONLY one JSON object: {${RECIPE_FIELDS}, ${DETAIL_FIELDS}}`;
}

export function surprisePrompt(ctx: KitchenContext): string {
  return `You are FridgeChef in "Surprise me" mode. Invent ONE creative but genuinely practical dish from what this cook has: something a bit more interesting than their usual, that rescues food before it spoils.

${inventoryBlock(ctx)}

${preferencesBlock(ctx.prefs)}

${rulesBlock(ctx.prefs)}
${ctx.recent?.length ? `\nIt must be different from these recent meals: ${ctx.recent.slice(0, 20).join("; ")}.` : ""}

Reply with ONLY one JSON object: {"mealType":"breakfast|lunch|dinner|snack", ${RECIPE_FIELDS}, ${DETAIL_FIELDS}}`;
}

export function rescuePrompt(ctx: KitchenContext, urgent: Ingredient[]): string {
  return `You are FridgeChef. These items are about to go to waste: ${urgent.map((i) => `${i.name} (${i.id}, ${freshnessNote(i)})`).join("; ")}.
Suggest 3 different recipes that use as many of them as possible, built from the rest of the inventory.

${inventoryBlock(ctx)}

${preferencesBlock(ctx.prefs)}

${rulesBlock(ctx.prefs)}

Reply with ONLY a JSON array of 3 objects, each: {"mealType":"breakfast|lunch|dinner|snack", ${RECIPE_FIELDS}, ${DETAIL_FIELDS}}`;
}

const PARSE_FIELDS = `{"name":"Chicken breast","quantity":2,"unit":"pieces","category":"meat|seafood|dairy|vegetables|fruits|grains|canned|pantry|frozen|bakery|sauces|other","location":"fridge|freezer|pantry","expiresInDays":2}`;

export function parseTextPrompt(text: string): string {
  return `Turn this description of someone's groceries into a clean ingredient list.

TEXT: """${text.slice(0, 4000)}"""

Rules: plain grocery names in Title case ("Chicken breast", "Shredded cheese"); split combined items; turn "half a bag" into quantity 0.5 unit "bag"; default quantity 1. Choose where it's normally stored. "expiresInDays" is a typical shelf life from today for perishables, or null for long-lasting items.
Reply with ONLY a JSON array of objects like ${PARSE_FIELDS}`;
}

export function parseImagePrompt(kind: "fridge" | "receipt"): string {
  return kind === "receipt"
    ? `This is a photo of a grocery receipt. List the FOOD items bought (skip bags, taxes, non-food). Expand abbreviations into plain grocery names ("ORG BNLS CHKN BRST" → "Chicken breast"). Use the quantity on the receipt when shown.
Reply with ONLY a JSON array of objects like ${PARSE_FIELDS}`
    : `This is a photo of the inside of a fridge, freezer or pantry. List every food item you can identify with reasonable confidence. Estimate quantities. Skip containers you can't identify.
Reply with ONLY a JSON array of objects like ${PARSE_FIELDS}`;
}
