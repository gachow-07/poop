import type { Aisle, Category, Diet, MealType, StorageLocation } from "../types";

export const CATEGORIES: Record<Category, { label: string; emoji: string; aisle: Aisle; location: StorageLocation }> = {
  meat: { label: "Meat", emoji: "🥩", aisle: "meat", location: "fridge" },
  seafood: { label: "Seafood", emoji: "🐟", aisle: "meat", location: "fridge" },
  dairy: { label: "Dairy & Eggs", emoji: "🥚", aisle: "dairy", location: "fridge" },
  vegetables: { label: "Vegetables", emoji: "🥬", aisle: "produce", location: "fridge" },
  fruits: { label: "Fruits", emoji: "🍎", aisle: "produce", location: "fridge" },
  grains: { label: "Grains", emoji: "🌾", aisle: "pantry", location: "pantry" },
  canned: { label: "Canned Goods", emoji: "🥫", aisle: "pantry", location: "pantry" },
  pantry: { label: "Pantry", emoji: "🧂", aisle: "pantry", location: "pantry" },
  frozen: { label: "Frozen", emoji: "🧊", aisle: "frozen", location: "freezer" },
  bakery: { label: "Bakery", emoji: "🥖", aisle: "pantry", location: "pantry" },
  sauces: { label: "Sauces & Condiments", emoji: "🧴", aisle: "pantry", location: "fridge" },
  other: { label: "Other", emoji: "🍽️", aisle: "other", location: "pantry" },
};
export const CATEGORY_ORDER = Object.keys(CATEGORIES) as Category[];

export const LOCATIONS: Record<StorageLocation, { label: string; emoji: string; blurb: string }> = {
  fridge: { label: "Fridge", emoji: "🧊", blurb: "Fresh food, dairy and leftovers" },
  freezer: { label: "Freezer", emoji: "❄️", blurb: "Frozen meat, veg and fruit" },
  pantry: { label: "Pantry", emoji: "🗄️", blurb: "Grains, cans, spices and sauces" },
};

export const AISLES: Record<Aisle, { label: string; emoji: string }> = {
  produce: { label: "Produce", emoji: "🥕" },
  meat: { label: "Meat & Seafood", emoji: "🥩" },
  dairy: { label: "Dairy & Eggs", emoji: "🧀" },
  pantry: { label: "Pantry", emoji: "🥫" },
  frozen: { label: "Frozen", emoji: "🧊" },
  other: { label: "Other", emoji: "🛒" },
};
export const AISLE_ORDER = Object.keys(AISLES) as Aisle[];

export const MEAL_TYPES: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: "Breakfast", emoji: "🍳" },
  lunch: { label: "Lunch", emoji: "🥗" },
  dinner: { label: "Dinner", emoji: "🍝" },
  snack: { label: "Snack", emoji: "🍎" },
};
export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const DIETS: { id: Diet; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "high-protein", label: "High protein" },
  { id: "low-carb", label: "Low carb" },
  { id: "keto", label: "Keto" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "dairy-free", label: "Dairy-free" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "pescatarian", label: "Pescatarian" },
];

export const COMMON_ALLERGIES = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Dairy", "Eggs", "Gluten", "Soy", "Sesame"];

export const CUISINES = ["American", "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian", "Mediterranean", "Korean", "French", "Middle Eastern"];

/** Words that reveal each allergen in a recipe's ingredient names. Used to double-check AI output. */
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  peanuts: ["peanut", "satay"],
  "tree nuts": ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "pine nut", "praline", "nutella"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel", "oyster", "crawfish", "langoustine"],
  fish: ["salmon", "tuna", "cod", "tilapia", "anchovy", "anchovies", "sardine", "trout", "halibut", "fish sauce", "mackerel", "fish"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "parmesan", "mozzarella", "cheddar", "feta", "ricotta", "ghee", "whey", "half and half", "queso"],
  eggs: ["egg", "mayonnaise", "mayo", "aioli", "meringue"],
  gluten: ["flour", "bread", "pasta", "spaghetti", "noodle", "tortilla", "wheat", "couscous", "barley", "rye", "breadcrumb", "panko", "cracker", "bun", "pita", "soy sauce", "seitan", "bagel", "croissant"],
  soy: ["soy", "tofu", "edamame", "tempeh", "miso", "tamari"],
  sesame: ["sesame", "tahini"],
};
