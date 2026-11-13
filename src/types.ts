// Domain model shared by the UI, the store and the AI service.

export type StorageLocation = "fridge" | "freezer" | "pantry";

export type Category =
  | "meat" | "seafood" | "dairy" | "vegetables" | "fruits" | "grains"
  | "canned" | "pantry" | "frozen" | "bakery" | "sauces" | "other";

export type Aisle = "produce" | "meat" | "dairy" | "pantry" | "frozen" | "other";

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  location: StorageLocation;
  /** ISO date (YYYY-MM-DD) */
  expiresOn?: string;
  opened?: boolean;
  notes?: string;
  addedAt: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Diet =
  | "vegetarian" | "vegan" | "high-protein" | "low-carb" | "keto"
  | "mediterranean" | "dairy-free" | "gluten-free" | "pescatarian";
export type Skill = "beginner" | "intermediate" | "advanced";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Preferences {
  days: 1 | 3 | 5 | 7 | 14;
  meals: MealType[];
  diets: Diet[];
  otherDiet: string;
  allergies: string[];
  maxMinutes: 15 | 30 | 45 | 60 | 0; // 0 = no limit
  skill: Skill;
  servings: number;
  cuisines: string[];
  caloriesPerMeal?: number;
  proteinPerMeal?: number;
  budgetMode: boolean;
  leftoverMode: boolean;
  assumeStaples: boolean;
}

export interface Substitution {
  use: string;
  amount: string;
  note: string;
  inventoryIds: string[];
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  /** Inventory id the AI says this comes from. Verified against the real inventory before use. */
  inventoryId: string | null;
  /** Comes from an earlier meal's leftovers. */
  fromLeftover?: boolean;
  /** Computed client-side: true only when backed by a real inventory item, a staple, or a planned leftover. */
  have: boolean;
  aisle?: Aisle;
  estCost?: number;
  substitution?: Substitution;
}

export interface Nutrition { calories: number; protein: number; carbs: number; fat: number }

export interface RecipeStep { text: string; minutes?: number }

export interface RecipeDetails {
  steps: RecipeStep[];
  storage: string;
  leftoverIdeas: string[];
  tips: string[];
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cuisine: string;
  mealType: MealType;
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  nutrition: Nutrition;
  tags: string[];
  ingredients: RecipeIngredient[];
  /** Inventory ids of soon-to-expire items this recipe rescues. */
  usesExpiring: string[];
  leftovers?: { makes?: string; from?: string };
  details?: RecipeDetails;
  /** Allergens found in the recipe despite the rules. The UI blocks these. */
  allergyFlags: string[];
  createdAt: string;
  origin: "plan" | "surprise" | "rescue" | "alternative" | "sample";
}

export interface MealPlan {
  id: string;
  createdAt: string;
  /** ISO date of Day 1 */
  startDate: string;
  days: number;
  mealTypes: MealType[];
  /** key `${dayIndex}:${mealType}` → recipe id */
  slots: Record<string, string | null>;
  summary: string;
  warnings: string[];
  sample?: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  aisle: Aisle;
  checked: boolean;
  custom: boolean;
  /** quantity typed by the user; kept when the list is rebuilt */
  edited?: boolean;
  estCost?: number;
  recipeIds: string[];
}

export const slotKey = (day: number, meal: MealType) => `${day}:${meal}`;
