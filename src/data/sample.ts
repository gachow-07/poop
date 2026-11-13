// Realistic sample data so the app looks complete on first open and during development.
// It is clearly labelled "Sample" in the UI and can be cleared in one tap.
// Real plans always come from the AI service (src/ai), never from this file.
import type { Ingredient, MealPlan, Recipe, RecipeIngredient } from "../types";
import { addDays, todayISO } from "../lib/dates";
import { slotKey } from "../types";

export function sampleInventory(): Ingredient[] {
  const t = todayISO();
  const at = (d: number) => addDays(t, d);
  const added = new Date().toISOString();
  const rows: Omit<Ingredient, "addedAt">[] = [
    { id: "s1", name: "Chicken breast", quantity: 4, unit: "pieces", category: "meat", location: "fridge", expiresOn: at(2) },
    { id: "s2", name: "Eggs", quantity: 10, unit: "pieces", category: "dairy", location: "fridge", expiresOn: at(14) },
    { id: "s3", name: "Spinach", quantity: 1, unit: "bag", category: "vegetables", location: "fridge", expiresOn: at(2), opened: true },
    { id: "s4", name: "Strawberries", quantity: 2, unit: "cups", category: "fruits", location: "fridge", expiresOn: at(3) },
    { id: "s5", name: "Greek yogurt", quantity: 2, unit: "cups", category: "dairy", location: "fridge", expiresOn: at(6) },
    { id: "s6", name: "Shredded cheese", quantity: 2, unit: "cups", category: "dairy", location: "fridge", expiresOn: at(12), opened: true },
    { id: "s7", name: "Milk", quantity: 4, unit: "cups", category: "dairy", location: "fridge", expiresOn: at(5) },
    { id: "s8", name: "Tomatoes", quantity: 3, unit: "pieces", category: "vegetables", location: "fridge", expiresOn: at(4) },
    { id: "s9", name: "Onion", quantity: 2, unit: "pieces", category: "vegetables", location: "pantry" },
    { id: "s10", name: "Garlic", quantity: 8, unit: "cloves", category: "vegetables", location: "pantry" },
    { id: "s11", name: "Bell pepper", quantity: 2, unit: "pieces", category: "vegetables", location: "fridge", expiresOn: at(6) },
    { id: "s12", name: "Broccoli", quantity: 1, unit: "head", category: "vegetables", location: "fridge", expiresOn: at(4) },
    { id: "s13", name: "Ground beef", quantity: 1, unit: "lb", category: "meat", location: "fridge", expiresOn: at(1) },
    { id: "s14", name: "Rice", quantity: 3, unit: "cups", category: "grains", location: "pantry" },
    { id: "s15", name: "Tortillas", quantity: 8, unit: "pieces", category: "bakery", location: "pantry", expiresOn: at(9) },
    { id: "s16", name: "Bread", quantity: 10, unit: "slices", category: "bakery", location: "pantry", expiresOn: at(4) },
    { id: "s17", name: "Bananas", quantity: 3, unit: "pieces", category: "fruits", location: "pantry", expiresOn: at(3) },
    { id: "s18", name: "Black beans", quantity: 1, unit: "cans", category: "canned", location: "pantry" },
    { id: "s19", name: "Frozen peas", quantity: 2, unit: "cups", category: "frozen", location: "freezer" },
    { id: "s20", name: "Butter", quantity: 8, unit: "tbsp", category: "dairy", location: "fridge", expiresOn: at(25) },
    { id: "s21", name: "Rolled oats", quantity: 3, unit: "cups", category: "grains", location: "pantry" },
    { id: "s22", name: "Soy sauce", quantity: 10, unit: "tbsp", category: "sauces", location: "pantry", opened: true },
    { id: "s23", name: "Lemons", quantity: 2, unit: "pieces", category: "fruits", location: "fridge", expiresOn: at(15) },
    { id: "s24", name: "Carrots", quantity: 5, unit: "pieces", category: "vegetables", location: "fridge", expiresOn: at(12) },
  ];
  return rows.map((r) => ({ ...r, addedAt: added }));
}

const I = (name: string, amount: string, inventoryId: string | null, extra: Partial<RecipeIngredient> = {}): RecipeIngredient =>
  ({ name, amount, inventoryId, have: false, ...extra });

type SampleRecipe = Omit<Recipe, "createdAt" | "origin" | "allergyFlags" | "mealType"> & { day: number; meal: Recipe["mealType"] };

const RECIPES: SampleRecipe[] = [
  {
    id: "r-s1", day: 0, meal: "breakfast", name: "Greek Yogurt Berry Bowl", emoji: "🍓",
    description: "Thick yogurt layered with ripe strawberries, sliced banana and toasted oats. Uses the berries before they soften.",
    cuisine: "American", difficulty: "Easy", prepMinutes: 5, cookMinutes: 3, servings: 2,
    nutrition: { calories: 340, protein: 21, carbs: 48, fat: 7 }, tags: ["Vegetarian", "Quick"],
    ingredients: [I("Greek yogurt", "1½ cups", "s5"), I("Strawberries", "1 cup", "s4"), I("Bananas", "1", "s17"), I("Rolled oats", "½ cup", "s21")],
    usesExpiring: ["s4"],
    details: {
      steps: [{ text: "Toast the oats in a dry pan over medium heat until golden and nutty.", minutes: 3 }, { text: "Hull and slice the strawberries; slice the banana." }, { text: "Spoon yogurt into two bowls and top with fruit and toasted oats." }],
      storage: "Best eaten fresh. Toasted oats keep in a jar for a week.", leftoverIdeas: ["Blend leftover berries and yogurt into a smoothie."], tips: ["Toast a big batch of oats for the week."],
    },
  },
  {
    id: "r-s2", day: 0, meal: "lunch", name: "Spinach & Cheddar Egg Wraps", emoji: "🌯",
    description: "Soft scrambled eggs with wilted spinach and melted cheese, rolled in a warm tortilla.",
    cuisine: "American", difficulty: "Easy", prepMinutes: 5, cookMinutes: 8, servings: 2,
    nutrition: { calories: 430, protein: 24, carbs: 30, fat: 23 }, tags: ["Vegetarian", "Quick"],
    ingredients: [I("Eggs", "4", "s2"), I("Spinach", "2 handfuls", "s3"), I("Shredded cheese", "½ cup", "s6"), I("Tortillas", "2", "s15"), I("Salsa", "4 tbsp", null, { aisle: "pantry", estCost: 3.49 })],
    usesExpiring: ["s3"],
    details: {
      steps: [{ text: "Wilt the spinach in a buttered pan, about 1 minute.", minutes: 1 }, { text: "Pour in the beaten eggs and stir gently until just set.", minutes: 3 }, { text: "Warm the tortillas, fill with eggs, cheese and salsa, and roll up." }],
      storage: "Wrap in foil and refrigerate up to 1 day.", leftoverIdeas: ["Leftover filling makes a quick breakfast quesadilla."], tips: ["Take the eggs off the heat while they still look slightly wet."],
    },
  },
  {
    id: "r-s3", day: 0, meal: "dinner", name: "Garlic Beef & Broccoli Stir-Fry", emoji: "🥦",
    description: "Savory ground beef and crisp broccoli in a garlicky soy glaze over rice. Cooks extra rice for Day 3's fried rice.",
    cuisine: "Chinese", difficulty: "Easy", prepMinutes: 10, cookMinutes: 20, servings: 2,
    nutrition: { calories: 610, protein: 36, carbs: 62, fat: 22 }, tags: ["High protein"],
    ingredients: [I("Ground beef", "1 lb", "s13"), I("Broccoli", "1 head", "s12"), I("Garlic", "3 cloves", "s10"), I("Onion", "½", "s9"), I("Soy sauce", "3 tbsp", "s22"), I("Rice", "1½ cups dry", "s14"), I("Fresh ginger", "1 inch", null, { aisle: "produce", estCost: 1.2 })],
    usesExpiring: ["s13"], leftovers: { makes: "2 cups extra cooked rice" },
    details: {
      steps: [{ text: "Cook all the rice. Set 2 cups aside in the fridge for Day 3.", minutes: 18 }, { text: "Brown the beef in a hot pan, breaking it up, 6–7 minutes.", minutes: 7 }, { text: "Add onion, garlic and ginger; cook 1 minute." }, { text: "Add broccoli florets and a splash of water; cover 3 minutes.", minutes: 3 }, { text: "Stir in soy sauce and serve over rice." }],
      storage: "Refrigerate up to 3 days. Reheat with a splash of water.", leftoverIdeas: ["Leftover rice is perfect for fried rice."], tips: ["Cold rice fries better than fresh."],
    },
  },
  {
    id: "r-s4", day: 1, meal: "breakfast", name: "Garden Veggie Omelet", emoji: "🍳",
    description: "Fluffy omelet filled with sweet pepper, tomato and cheddar.",
    cuisine: "French", difficulty: "Easy", prepMinutes: 5, cookMinutes: 8, servings: 2,
    nutrition: { calories: 360, protein: 22, carbs: 8, fat: 26 }, tags: ["Vegetarian", "Low carb"],
    ingredients: [I("Eggs", "4", "s2"), I("Bell pepper", "1", "s11"), I("Tomatoes", "1", "s8"), I("Shredded cheese", "⅓ cup", "s6"), I("Butter", "1 tbsp", "s20")],
    usesExpiring: [],
    details: {
      steps: [{ text: "Dice the pepper and tomato; soften the pepper in butter, 3 minutes.", minutes: 3 }, { text: "Pour in beaten eggs, tilt the pan and let them set.", minutes: 3 }, { text: "Add tomato and cheese to one half, fold and slide onto a plate." }],
      storage: "Best eaten fresh.", leftoverIdeas: ["Extra diced veg works in Day 2's quesadillas."], tips: ["Keep the heat medium so the eggs stay tender."],
    },
  },
  {
    id: "r-s5", day: 1, meal: "lunch", name: "Black Bean & Tomato Quesadillas", emoji: "🫓",
    description: "Crispy tortillas with smashed black beans, tomato, onion and lots of melted cheese.",
    cuisine: "Mexican", difficulty: "Easy", prepMinutes: 5, cookMinutes: 10, servings: 2,
    nutrition: { calories: 520, protein: 23, carbs: 58, fat: 20 }, tags: ["Vegetarian"],
    ingredients: [I("Tortillas", "4", "s15"), I("Black beans", "1 can", "s18"), I("Shredded cheese", "¾ cup", "s6"), I("Tomatoes", "1", "s8"), I("Onion", "¼", "s9"),
      I("Sour cream", "4 tbsp", null, { aisle: "dairy", estCost: 2.29, substitution: { use: "Greek yogurt", amount: "4 tbsp (same amount)", note: "Tangy and creamy, and you already have it.", inventoryIds: ["s5"] } })],
    usesExpiring: [],
    details: {
      steps: [{ text: "Drain and lightly mash the beans with a pinch of salt." }, { text: "Spread beans over half of each tortilla; add tomato, onion and cheese, then fold." }, { text: "Cook in a dry pan 2–3 minutes a side until crisp.", minutes: 6 }, { text: "Cut into wedges and serve with yogurt or sour cream." }],
      storage: "Refrigerate up to 2 days; re-crisp in a dry pan.", leftoverIdeas: ["Leftover beans make a quick burrito bowl."], tips: ["Press down with a spatula for even browning."],
    },
  },
  {
    id: "r-s6", day: 1, meal: "dinner", name: "Lemon Garlic Roast Chicken & Carrots", emoji: "🍗",
    description: "Juicy roasted chicken breasts with caramelized carrots. Roast all four and save two for the next day.",
    cuisine: "Mediterranean", difficulty: "Easy", prepMinutes: 10, cookMinutes: 30, servings: 2,
    nutrition: { calories: 480, protein: 52, carbs: 18, fat: 21 }, tags: ["High protein", "Gluten-free"],
    ingredients: [I("Chicken breast", "4", "s1"), I("Carrots", "4", "s24"), I("Lemons", "1", "s23"), I("Garlic", "3 cloves", "s10"), I("Olive oil", "2 tbsp", "staple")],
    usesExpiring: ["s1"], leftovers: { makes: "2 roasted chicken breasts" },
    details: {
      steps: [{ text: "Heat the oven to 425°F (220°C)." }, { text: "Toss carrots and chicken with oil, garlic, lemon zest, salt and pepper on a tray." }, { text: "Roast until the chicken reaches 165°F (74°C), about 25–30 minutes.", minutes: 28 }, { text: "Squeeze lemon over everything. Refrigerate 2 breasts for tomorrow." }],
      storage: "Cooked chicken keeps 3–4 days in the fridge.", leftoverIdeas: ["Slice into wraps", "Dice into fried rice"], tips: ["Rest the chicken 5 minutes before slicing."],
    },
  },
  {
    id: "r-s7", day: 2, meal: "breakfast", name: "Banana Oat Pancakes", emoji: "🥞",
    description: "Naturally sweet pancakes made from ripe bananas, oats and eggs.",
    cuisine: "American", difficulty: "Easy", prepMinutes: 5, cookMinutes: 12, servings: 2,
    nutrition: { calories: 390, protein: 15, carbs: 56, fat: 12 }, tags: ["Vegetarian"],
    ingredients: [I("Bananas", "2", "s17"), I("Rolled oats", "1 cup", "s21"), I("Eggs", "2", "s2"), I("Milk", "½ cup", "s7"), I("Butter", "1 tbsp", "s20")],
    usesExpiring: ["s17"],
    details: {
      steps: [{ text: "Blend bananas, oats, eggs and milk until smooth." }, { text: "Cook ¼-cup scoops in a buttered pan, 2 minutes a side.", minutes: 10 }, { text: "Serve with any leftover strawberries." }],
      storage: "Freeze extras between parchment for up to a month.", leftoverIdeas: ["Toast frozen pancakes for a fast breakfast."], tips: ["Spotty bananas make the sweetest pancakes."],
    },
  },
  {
    id: "r-s8", day: 2, meal: "lunch", name: "Leftover Chicken & Spinach Wrap", emoji: "🌯",
    description: "Yesterday's lemon chicken with fresh spinach and a yogurt-garlic sauce.",
    cuisine: "Mediterranean", difficulty: "Easy", prepMinutes: 8, cookMinutes: 0, servings: 2,
    nutrition: { calories: 450, protein: 38, carbs: 32, fat: 17 }, tags: ["High protein", "Quick"],
    ingredients: [I("Roasted chicken (leftover)", "1 breast", null, { fromLeftover: true }), I("Spinach", "2 handfuls", "s3"), I("Tortillas", "2", "s15"), I("Greek yogurt", "4 tbsp", "s5"), I("Garlic", "1 clove", "s10")],
    usesExpiring: ["s3"], leftovers: { from: "Day 2 dinner" },
    details: {
      steps: [{ text: "Stir grated garlic and a pinch of salt into the yogurt." }, { text: "Slice the cold chicken." }, { text: "Fill tortillas with spinach, chicken and sauce; roll tightly." }],
      storage: "Eat the same day.", leftoverIdeas: [], tips: ["Warm the chicken briefly if you prefer it hot."],
    },
  },
  {
    id: "r-s9", day: 2, meal: "dinner", name: "Chicken Fried Rice", emoji: "🍚",
    description: "Uses the rice from Day 1 and the last roast chicken, with peas, carrots and egg.",
    cuisine: "Chinese", difficulty: "Easy", prepMinutes: 10, cookMinutes: 12, servings: 2,
    nutrition: { calories: 560, protein: 34, carbs: 64, fat: 17 }, tags: ["High protein"],
    ingredients: [I("Cooked rice (leftover)", "2 cups", null, { fromLeftover: true }), I("Roasted chicken (leftover)", "1 breast", null, { fromLeftover: true }), I("Eggs", "2", "s2"), I("Frozen peas", "½ cup", "s19"), I("Carrots", "1", "s24"), I("Soy sauce", "2 tbsp", "s22"),
      I("Green onions", "2", null, { aisle: "produce", estCost: 0.99 })],
    usesExpiring: [], leftovers: { from: "Day 1 & Day 2 dinners" },
    details: {
      steps: [{ text: "Dice the carrot and chicken." }, { text: "Fry carrot and peas in a hot oiled pan, 3 minutes.", minutes: 3 }, { text: "Push aside, scramble the eggs, then add rice and chicken.", minutes: 5 }, { text: "Toss with soy sauce until hot; finish with green onions." }],
      storage: "Refrigerate up to 3 days.", leftoverIdeas: ["Top leftovers with a fried egg for lunch."], tips: ["Spread the rice out so it crisps."],
    },
  },
];

export function sampleRecipes(): Recipe[] {
  const now = new Date().toISOString();
  return RECIPES.map(({ day: _day, meal, ...r }) => ({ ...r, mealType: meal, createdAt: now, origin: "sample", allergyFlags: [] }));
}

export function samplePlan(): MealPlan {
  const slots: MealPlan["slots"] = {};
  for (const r of RECIPES) slots[slotKey(r.day, r.meal)] = r.id;
  return {
    id: "plan-sample", createdAt: new Date().toISOString(), startDate: todayISO(), days: 3,
    mealTypes: ["breakfast", "lunch", "dinner"], slots, sample: true,
    summary: "Ground beef and spinach go first. Day 1's extra rice and Day 2's roast chicken carry into Day 3, so only 4 small items need buying.",
    warnings: [],
  };
}
