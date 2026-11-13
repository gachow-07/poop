// Common grocery items for autocomplete and quick add: where they live, their usual unit,
// roughly how long they keep once bought, and an emoji for the food art. Ingredient data only, no recipes.
import type { Category, StorageLocation } from "../types";
import { norm, namesMatch } from "../lib/utils";

export interface CatalogItem {
  name: string;
  category: Category;
  location: StorageLocation;
  unit: string;
  /** Typical days it keeps after purchase; 0 = long-lasting, no default date. */
  keeps: number;
  emoji: string;
}

type Row = [string, Category, StorageLocation, string, number, string];

const ROWS: Row[] = [
  // Meat
  ["Chicken breast", "meat", "fridge", "pieces", 2, "🍗"], ["Chicken thighs", "meat", "fridge", "pieces", 2, "🍗"],
  ["Chicken wings", "meat", "fridge", "lb", 2, "🍗"], ["Whole chicken", "meat", "fridge", "whole", 2, "🍗"],
  ["Ground beef", "meat", "fridge", "lb", 2, "🥩"], ["Steak", "meat", "fridge", "pieces", 3, "🥩"],
  ["Ground turkey", "meat", "fridge", "lb", 2, "🦃"], ["Pork chops", "meat", "fridge", "pieces", 3, "🥩"],
  ["Bacon", "meat", "fridge", "slices", 7, "🥓"], ["Ham", "meat", "fridge", "slices", 5, "🍖"],
  ["Italian sausage", "meat", "fridge", "links", 3, "🌭"], ["Deli turkey", "meat", "fridge", "slices", 5, "🥪"],
  ["Ground pork", "meat", "fridge", "lb", 2, "🥩"],
  // Seafood
  ["Salmon fillet", "seafood", "fridge", "pieces", 2, "🐟"], ["Shrimp", "seafood", "fridge", "lb", 2, "🦐"],
  ["Cod fillet", "seafood", "fridge", "pieces", 2, "🐟"], ["Tilapia", "seafood", "fridge", "pieces", 2, "🐟"],
  ["Canned tuna", "canned", "pantry", "cans", 0, "🐟"],
  // Dairy & eggs
  ["Eggs", "dairy", "fridge", "pieces", 21, "🥚"], ["Milk", "dairy", "fridge", "cups", 7, "🥛"],
  ["Butter", "dairy", "fridge", "tbsp", 30, "🧈"], ["Shredded cheese", "dairy", "fridge", "cups", 14, "🧀"],
  ["Cheddar cheese", "dairy", "fridge", "oz", 21, "🧀"], ["Mozzarella", "dairy", "fridge", "oz", 10, "🧀"],
  ["Parmesan", "dairy", "fridge", "oz", 30, "🧀"], ["Feta cheese", "dairy", "fridge", "oz", 10, "🧀"],
  ["Greek yogurt", "dairy", "fridge", "cups", 10, "🥣"], ["Heavy cream", "dairy", "fridge", "cups", 7, "🥛"],
  ["Sour cream", "dairy", "fridge", "cups", 10, "🥛"], ["Cream cheese", "dairy", "fridge", "oz", 14, "🧀"],
  // Vegetables
  ["Spinach", "vegetables", "fridge", "bag", 5, "🥬"], ["Lettuce", "vegetables", "fridge", "head", 7, "🥬"],
  ["Kale", "vegetables", "fridge", "bunch", 6, "🥬"], ["Tomatoes", "vegetables", "fridge", "pieces", 6, "🍅"],
  ["Cherry tomatoes", "vegetables", "fridge", "cups", 6, "🍅"], ["Onion", "vegetables", "pantry", "pieces", 30, "🧅"],
  ["Red onion", "vegetables", "pantry", "pieces", 30, "🧅"], ["Garlic", "vegetables", "pantry", "cloves", 30, "🧄"],
  ["Bell pepper", "vegetables", "fridge", "pieces", 7, "🫑"], ["Broccoli", "vegetables", "fridge", "head", 6, "🥦"],
  ["Cauliflower", "vegetables", "fridge", "head", 7, "🥦"], ["Carrots", "vegetables", "fridge", "pieces", 21, "🥕"],
  ["Celery", "vegetables", "fridge", "stalks", 14, "🥬"], ["Cucumber", "vegetables", "fridge", "pieces", 7, "🥒"],
  ["Zucchini", "vegetables", "fridge", "pieces", 6, "🥒"], ["Mushrooms", "vegetables", "fridge", "oz", 5, "🍄"],
  ["Potatoes", "vegetables", "pantry", "pieces", 30, "🥔"], ["Sweet potatoes", "vegetables", "pantry", "pieces", 21, "🍠"],
  ["Avocado", "vegetables", "fridge", "pieces", 4, "🥑"], ["Green onions", "vegetables", "fridge", "bunch", 7, "🧅"],
  ["Cilantro", "vegetables", "fridge", "bunch", 6, "🌿"], ["Basil", "vegetables", "fridge", "bunch", 5, "🌿"],
  ["Ginger", "vegetables", "fridge", "inch", 21, "🫚"], ["Corn", "vegetables", "fridge", "ears", 4, "🌽"],
  ["Green beans", "vegetables", "fridge", "cups", 6, "🫛"], ["Asparagus", "vegetables", "fridge", "bunch", 4, "🥬"],
  ["Cabbage", "vegetables", "fridge", "head", 21, "🥬"], ["Jalapeño", "vegetables", "fridge", "pieces", 10, "🌶️"],
  // Fruit
  ["Bananas", "fruits", "pantry", "pieces", 5, "🍌"], ["Apples", "fruits", "fridge", "pieces", 30, "🍎"],
  ["Strawberries", "fruits", "fridge", "cups", 4, "🍓"], ["Blueberries", "fruits", "fridge", "cups", 7, "🫐"],
  ["Lemons", "fruits", "fridge", "pieces", 21, "🍋"], ["Limes", "fruits", "fridge", "pieces", 21, "🍋"],
  ["Oranges", "fruits", "fridge", "pieces", 21, "🍊"], ["Grapes", "fruits", "fridge", "cups", 7, "🍇"],
  ["Mango", "fruits", "fridge", "pieces", 5, "🥭"], ["Pineapple", "fruits", "fridge", "pieces", 5, "🍍"],
  // Grains
  ["Rice", "grains", "pantry", "cups", 0, "🍚"], ["Brown rice", "grains", "pantry", "cups", 0, "🍚"],
  ["Pasta", "grains", "pantry", "oz", 0, "🍝"], ["Spaghetti", "grains", "pantry", "oz", 0, "🍝"],
  ["Rolled oats", "grains", "pantry", "cups", 0, "🥣"], ["Quinoa", "grains", "pantry", "cups", 0, "🌾"],
  ["Flour", "grains", "pantry", "cups", 0, "🌾"], ["Couscous", "grains", "pantry", "cups", 0, "🌾"],
  ["Ramen noodles", "grains", "pantry", "packs", 0, "🍜"], ["Egg noodles", "grains", "pantry", "oz", 0, "🍜"],
  // Canned
  ["Black beans", "canned", "pantry", "cans", 0, "🥫"], ["Chickpeas", "canned", "pantry", "cans", 0, "🥫"],
  ["Kidney beans", "canned", "pantry", "cans", 0, "🥫"], ["Diced tomatoes", "canned", "pantry", "cans", 0, "🥫"],
  ["Tomato sauce", "canned", "pantry", "cans", 0, "🥫"], ["Coconut milk", "canned", "pantry", "cans", 0, "🥥"],
  ["Chicken stock", "canned", "pantry", "cups", 0, "🍲"], ["Vegetable stock", "canned", "pantry", "cups", 0, "🍲"],
  ["Corn (canned)", "canned", "pantry", "cans", 0, "🌽"],
  // Pantry staples
  ["Olive oil", "pantry", "pantry", "tbsp", 0, "🫒"], ["Vegetable oil", "pantry", "pantry", "tbsp", 0, "🫗"],
  ["Salt", "pantry", "pantry", "tsp", 0, "🧂"], ["Black pepper", "pantry", "pantry", "tsp", 0, "🧂"],
  ["Sugar", "pantry", "pantry", "cups", 0, "🍬"], ["Brown sugar", "pantry", "pantry", "cups", 0, "🍬"],
  ["Honey", "pantry", "pantry", "tbsp", 0, "🍯"], ["Peanut butter", "pantry", "pantry", "tbsp", 0, "🥜"],
  ["Chili powder", "pantry", "pantry", "tsp", 0, "🌶️"], ["Cumin", "pantry", "pantry", "tsp", 0, "🫙"],
  ["Paprika", "pantry", "pantry", "tsp", 0, "🫙"], ["Italian seasoning", "pantry", "pantry", "tsp", 0, "🌿"],
  ["Cinnamon", "pantry", "pantry", "tsp", 0, "🫙"], ["Baking powder", "pantry", "pantry", "tsp", 0, "🫙"],
  ["Almonds", "pantry", "pantry", "cups", 0, "🌰"], ["Walnuts", "pantry", "pantry", "cups", 0, "🌰"],
  ["Granola", "pantry", "pantry", "cups", 0, "🥣"],
  // Frozen
  ["Frozen peas", "frozen", "freezer", "cups", 0, "🫛"], ["Frozen mixed vegetables", "frozen", "freezer", "cups", 0, "🥦"],
  ["Frozen broccoli", "frozen", "freezer", "cups", 0, "🥦"], ["Frozen berries", "frozen", "freezer", "cups", 0, "🫐"],
  ["Frozen corn", "frozen", "freezer", "cups", 0, "🌽"], ["Frozen shrimp", "frozen", "freezer", "lb", 0, "🦐"],
  ["Frozen chicken breasts", "frozen", "freezer", "pieces", 0, "🍗"], ["Frozen pizza", "frozen", "freezer", "pieces", 0, "🍕"],
  ["Ice cream", "frozen", "freezer", "pints", 0, "🍨"], ["Frozen spinach", "frozen", "freezer", "cups", 0, "🥬"],
  // Bakery
  ["Bread", "bakery", "pantry", "slices", 6, "🍞"], ["Tortillas", "bakery", "pantry", "pieces", 14, "🫓"],
  ["Bagels", "bakery", "pantry", "pieces", 5, "🥯"], ["Pita bread", "bakery", "pantry", "pieces", 6, "🫓"],
  ["Hamburger buns", "bakery", "pantry", "pieces", 6, "🍔"], ["Naan", "bakery", "pantry", "pieces", 6, "🫓"],
  // Sauces
  ["Soy sauce", "sauces", "pantry", "tbsp", 0, "🍶"], ["Ketchup", "sauces", "fridge", "tbsp", 0, "🍅"],
  ["Mustard", "sauces", "fridge", "tbsp", 0, "🌭"], ["Mayonnaise", "sauces", "fridge", "tbsp", 60, "🥪"],
  ["Hot sauce", "sauces", "fridge", "tbsp", 0, "🌶️"], ["Salsa", "sauces", "fridge", "cups", 10, "🍅"],
  ["Pesto", "sauces", "fridge", "tbsp", 7, "🌿"], ["Marinara sauce", "sauces", "pantry", "cups", 0, "🍝"],
  ["BBQ sauce", "sauces", "fridge", "tbsp", 0, "🍖"], ["Sriracha", "sauces", "fridge", "tbsp", 0, "🌶️"],
  ["Balsamic vinegar", "sauces", "pantry", "tbsp", 0, "🫙"], ["Teriyaki sauce", "sauces", "fridge", "tbsp", 0, "🍶"],
  ["Ranch dressing", "sauces", "fridge", "tbsp", 30, "🥗"], ["Hummus", "sauces", "fridge", "cups", 7, "🫘"],
  ["Tofu", "other", "fridge", "block", 7, "🧈"],
];

export const CATALOG: CatalogItem[] = ROWS.map(([name, category, location, unit, keeps, emoji]) => ({ name, category, location, unit, keeps, emoji }));

export const UNITS = ["pieces", "lb", "oz", "g", "kg", "cups", "tbsp", "tsp", "ml", "l", "cans", "bag", "bunch", "head", "slices", "packs", "cloves", "block", "whole", "dozen", "jar", "bottle", "stalks", "links", "ears", "inch", "pints"];

export function searchCatalog(q: string, limit = 6): CatalogItem[] {
  const n = norm(q);
  if (!n) return [];
  const starts = CATALOG.filter((c) => norm(c.name).startsWith(n));
  const wordStarts = CATALOG.filter((c) => !starts.includes(c) && norm(c.name).split(" ").some((w) => w.startsWith(n)));
  const contains = CATALOG.filter((c) => !starts.includes(c) && !wordStarts.includes(c) && norm(c.name).includes(n));
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

export function lookupCatalog(name: string): CatalogItem | undefined {
  const n = norm(name);
  return CATALOG.find((c) => norm(c.name) === n) ?? CATALOG.find((c) => namesMatch(c.name, name));
}

/** Best-effort emoji for any ingredient or dish name. */
export function emojiFor(name: string): string {
  const hit = lookupCatalog(name);
  if (hit) return hit.emoji;
  const n = norm(name);
  const kw = CATALOG.find((c) => n.includes(norm(c.name).split(" ").pop()!));
  return kw?.emoji ?? "🍽️";
}

export const QUICK_ADD = ["Eggs", "Milk", "Chicken breast", "Spinach", "Rice", "Onion", "Garlic", "Tomatoes", "Shredded cheese", "Bread", "Tortillas", "Ground beef", "Bananas", "Pasta", "Butter", "Greek yogurt"];
