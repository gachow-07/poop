# FridgeChef

**Tell us what's in your fridge. We'll tell you what to cook.**

FridgeChef turns the food you already have into a practical meal plan. It cooks whatever expires first, carries leftovers into later meals and keeps the grocery list short.

## What it does

- **My Kitchen.** Track what's in your fridge, freezer and pantry: name, quantity, unit, category, expiration date and notes. Freshness shows as 🟢 Fresh, 🟡 Use soon or 🔴 Expiring. You can search, sort, adjust quantities, edit items and mark them as used (with undo).
- **Fast entry.** Autocomplete covers about 170 common groceries ("chi…" suggests chicken breast, thighs, wings and stock), and quick-add chips add an item in one tap. You can also type a whole list, say it out loud, snap a photo of your fridge or scan a receipt.
- **Preferences.** Choose days (1, 3, 5, 7 or 14), meals, diets, allergies (these always win), cooking time, skill level, servings, cuisines, calorie and protein targets, budget mode, leftover-friendly mode and whether you have basic staples.
- **AI meal planner.** Meals stream onto the board as they're planned. Each one shows prep, cook and total time, servings, difficulty, nutrition, ingredients you **already have** and ingredients you **need to buy**, with **recommended substitutions** from what you own.
- **Waste reduction.** "Use it before it's gone" lists what's expiring and suggests recipes to rescue it. A **Food Waste Score** shows how much of your fresh food the plan uses.
- **Meal Plan board.** A weekly board you can rearrange by drag and drop (mouse, touch or keyboard). It shows daily nutrition totals and how leftovers flow from one meal to the next.
- **Recipe pages.** Each recipe has step-by-step instructions, storage advice, leftover ideas and tips, plus **Start Cooking** mode: one step at a time, with timers, read-aloud and the screen kept awake.
- **"Not feeling this?"** Regenerate a single meal to be faster, healthier, higher protein, vegetarian, use fewer ingredients, use expiring food, cost less, or replace a specific ingredient. The rest of the plan stays the same, and you can undo.
- **🎲 Surprise Me.** Get one creative, practical dish from what's on hand.
- **Grocery list.** Built automatically and grouped by aisle. You can check items off, edit quantities, remove items and add your own. It shows "You already have X% of what you need" and an estimated cost.
- **Recipe library.** Search and filter by time, calories, protein, cuisine, difficulty, ingredient and diet, and save favorites.

On first open, the app shows a clearly labelled sample kitchen and a 3-day plan, so every screen has something in it. **Start with my own food** clears the sample data.

## Running it

```bash
npm install
```

```bash
npm run server
```

```bash
npm run dev
```

`npm run server` starts the AI server on port 8787. It needs `ANTHROPIC_API_KEY`, or a profile from `ant auth login`. `npm run dev` starts the app on http://localhost:5173 and sends `/api` requests to the server.

For production, run `npm run build`, then `npm run server`. The server also serves the built app from `dist/`.

`npm run build:artifact` builds a single self-contained HTML file (`dist-artifact/fridgechef.html`) that runs as a Claude artifact. There, meal planning uses the viewer's own Claude access, so no server or API key is needed.

Optional environment variables for the server are `PORT` and `FRIDGECHEF_MODEL` (default `claude-opus-5-5`).

## How it's built

React 18 + TypeScript + Tailwind CSS, with Zustand for state (saved to the browser), Zod for form and AI-response validation, and dnd-kit for drag and drop.

```
src/
  ai/                 Meal generation, kept separate from the UI
    provider.ts         How we reach a model: Claude artifact runtime or POST /api/ai
    prompts.ts          Turns inventory and preferences into structured prompts
    schemas.ts          Zod schemas for every model response
    guards.ts           Safety net: allergen detection and have/need decisions
    mealPlanner.ts      The service API: plan, details, alternatives, surprise, rescue, ingredient parsing
  store/              useKitchen (persisted data), useUI (sheets, toasts, generation job), actions (AI ↔ state)
  components/         FoodArt, cards (ingredient, recipe, meal, grocery, widget), Nav, forms, modals, cooking mode
    ui/                 Button, Modal (<dialog>), Chip, Segmented, Switch, Stepper, Field, Toasts, Ring…
  pages/              Landing, Dashboard, Kitchen, Plan, Recipes, Grocery
  data/               Categories, ingredient catalog (autocomplete), sample data
  lib/                Dates, freshness, metrics, routing, speech
server/index.ts       Streams model output; keeps the API key server-side
```

### AI rules, enforced in code as well as in the prompt

The prompt spells out the rules: allergies first, never invent inventory, respect diet, time, skill, servings and quantities, cook expiring food first, reuse leftovers, keep purchases to a minimum. The model's answer is then **checked against real data** before anything is shown:

- An ingredient counts as "already have" only if it maps to a real inventory item (the id must exist **and** match the name), an assumed staple (only when that setting is on), or a leftover planned earlier in the same plan. Everything else goes on the grocery list.
- Inventory items that match an allergen are left out of the prompt. Every recipe is also scanned for allergen keywords, with exceptions such as "eggplant" is not eggs and "peanut butter" is not dairy. A recipe that still contains an allergen is flagged in red and gets a **Make it safe** button.
- Waste score, "already have" percentage, cost and nutrition totals are calculated from the reconciled data, not from the model's own claims.
- If there isn't enough food, the model is told to say so in `warnings`, which the plan page displays.

Plans stream as JSON Lines, one meal per line, so the board fills in live. Full cooking steps are fetched the first time a recipe is opened, which keeps plan generation fast.

### Not included yet

- **User accounts.** Everything is saved in the browser, so it stays between visits on the same device. All state goes through one store (`src/store/useKitchen.ts`), which is the place to add a backend for cross-device accounts.
- **Barcode scanning.** Receipt and fridge-photo scanning cover packaged food for now.
- **Real food photos.** Claude artifacts can't load outside images, so dishes use generated plate illustrations (`FoodArt`). A photo URL field could be added for the web build.

`legacy/fridge-to-table.html` is the earlier one-page planner, kept for reference.
