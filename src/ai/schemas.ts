// Runtime validation for everything the model returns. The model's JSON is never trusted as-is:
// it's parsed here, then reconciled against the real inventory in guards.ts.
import { z } from "zod";

const num = z.coerce.number().finite().catch(0);
const str = z.string().catch("");
const strList = z.array(z.string()).catch([]);

export const AISLE = z.enum(["produce", "meat", "dairy", "pantry", "frozen", "other"]);
export const MEAL = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const Step = z.union([
  z.string().transform((text) => ({ text, minutes: undefined as number | undefined })),
  z.object({ text: z.string(), minutes: z.coerce.number().positive().optional().catch(undefined) }),
]);

export const AiIngredient = z.object({
  name: z.string().min(1),
  amount: str,
  inventoryId: z.string().nullable().optional().catch(null),
  fromLeftover: z.boolean().optional().catch(false),
  aisle: AISLE.optional().catch(undefined),
  estCost: z.coerce.number().nonnegative().optional().catch(undefined),
  substitute: z
    .object({ use: z.string(), amount: str, note: str, inventoryIds: strList })
    .nullable()
    .optional()
    .catch(undefined),
});
export type AiIngredient = z.infer<typeof AiIngredient>;

export const AiRecipe = z.object({
  day: z.coerce.number().int().optional().catch(undefined),
  mealType: MEAL.optional().catch(undefined),
  name: z.string().min(1),
  emoji: z.string().max(16).catch("🍽️"),
  description: str,
  cuisine: z.string().catch("Home-style"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).catch("Easy"),
  prepMinutes: num,
  cookMinutes: num,
  servings: z.coerce.number().int().positive().catch(2),
  nutrition: z.object({ calories: num, protein: num, carbs: num, fat: num }).catch({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
  tags: strList,
  ingredients: z.array(z.unknown()).transform((list) =>
    list.map((x) => AiIngredient.safeParse(x)).filter((r) => r.success).map((r) => r.data!),
  ),
  usesExpiring: strList,
  leftovers: z.object({ makes: z.string().nullable().optional(), from: z.string().nullable().optional() }).nullable().optional().catch(undefined),
  steps: z.array(Step).optional().catch(undefined),
  storage: z.string().optional().catch(undefined),
  leftoverIdeas: z.array(z.string()).optional().catch(undefined),
  tips: z.array(z.string()).optional().catch(undefined),
});
export type AiRecipe = z.infer<typeof AiRecipe>;

export const AiSummary = z.object({
  kind: z.literal("summary"),
  summary: str,
  warnings: strList,
});

export const AiDetails = z.object({
  steps: z.array(Step).min(1),
  storage: str,
  leftoverIdeas: strList,
  tips: strList,
});

export const AiParsedItem = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().positive().catch(1),
  unit: z.string().catch("pieces"),
  category: z.enum(["meat", "seafood", "dairy", "vegetables", "fruits", "grains", "canned", "pantry", "frozen", "bakery", "sauces", "other"]).catch("other"),
  location: z.enum(["fridge", "freezer", "pantry"]).catch("fridge"),
  expiresInDays: z.coerce.number().int().nullable().optional().catch(null),
});
export type AiParsedItem = z.infer<typeof AiParsedItem>;
