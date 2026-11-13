import { useRef, useState } from "react";
import { AlarmClock, CalendarDays, ChefHat, Dices, Leaf, Refrigerator, Sparkles, ArrowRight } from "lucide-react";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { runRescue, urgentItems } from "../store/actions";
import { friendlyError } from "../ai/provider";
import { greeting, todayISO, relativeExpiry } from "../lib/dates";
import { navigate } from "../lib/router";
import { planRecipes, todayIndex, totalMinutes, wasteScore } from "../lib/metrics";
import { slotKey } from "../types";
import { MEAL_TYPES } from "../data/categories";
import { emojiFor } from "../data/catalog";
import { plural } from "../lib/utils";
import { FoodArt } from "../components/FoodArt";
import { RecipeCard, Widget, MealCard } from "../components/cards";
import { Banner, FreshnessBadge } from "../components/ui/feedback";
import { Button } from "../components/ui/Button";

export function Dashboard() {
  const inventory = useKitchen((s) => s.inventory);
  const plan = useKitchen((s) => s.plan);
  const recipes = useKitchen((s) => s.recipes);
  const stats = useKitchen((s) => s.stats);
  const rescueIds = useKitchen((s) => s.rescueIds);
  const favorites = useKitchen((s) => s.favorites);
  const toggleFavorite = useKitchen((s) => s.toggleFavorite);
  const clearSample = useKitchen((s) => s.clearSampleData);
  const { openRecipe, startCooking, setPrefsOpen, setSurpriseOpen, openBulkAdd, openIngredientForm } = useUI();
  const [rescuing, setRescuing] = useState(false);
  const [rescueError, setRescueError] = useState("");
  const abort = useRef<AbortController | null>(null);

  const urgent = urgentItems();
  const today = todayISO();
  const dayIdx = plan ? todayIndex(plan, today) : null;
  const todayMeals = plan && dayIdx != null ? plan.mealTypes.map((m) => ({ m, r: recipes[plan.slots[slotKey(dayIdx, m)] ?? ""] })).filter((x) => x.r) : [];
  const dinner = todayMeals.find((x) => x.m === "dinner")?.r ?? todayMeals[todayMeals.length - 1]?.r;
  const planned = planRecipes(plan, recipes);
  const score = wasteScore(plan, recipes, inventory);
  const rescue = rescueIds.map((id) => recipes[id]).filter(Boolean);

  const findRescue = async () => {
    setRescuing(true); setRescueError("");
    abort.current = new AbortController();
    try { await runRescue(abort.current.signal); } catch (e) { setRescueError(friendlyError(e)); } finally { setRescuing(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-8 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted font-medium">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-[32px] md:text-[40px] font-extrabold leading-tight">{greeting()}! <span aria-hidden>👋</span></h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Dices className="size-4" />} onClick={() => setSurpriseOpen(true)} className="md:hidden">Surprise me</Button>
          <Button icon={<Sparkles className="size-4" />} onClick={() => setPrefsOpen(true)}>New meal plan</Button>
        </div>
      </header>

      {plan?.sample && (
        <Banner tone="info" action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { clearSample(); navigate("kitchen"); openBulkAdd("type"); }}>Start with my own food</Button>
          </div>
        }>
          <b>You're exploring a sample kitchen.</b> Everything here is example data, so poke around, then start fresh with your own food.
        </Banner>
      )}

      {/* Tonight */}
      {dinner ? (
        <section className="card overflow-hidden grid md:grid-cols-[minmax(0,1.1fr)_1fr]">
          <button type="button" onClick={() => openRecipe(dinner.id)} className="block" aria-label={`Open ${dinner.name}`}>
            <FoodArt name={dinner.name} emoji={dinner.emoji} garnishes={dinner.ingredients.map((i) => i.name)} size="lg" className="!rounded-none h-full" />
          </button>
          <div className="p-6 md:p-8 grid gap-4 content-center">
            <p className="label">Tonight's {dinner.mealType === "dinner" ? "dinner" : MEAL_TYPES[dinner.mealType].label.toLowerCase()}</p>
            <h2 className="text-[28px] md:text-[34px] font-extrabold leading-tight">{dinner.name}</h2>
            <p className="text-muted">{totalMinutes(dinner)} min · {dinner.tags[0] ?? dinner.cuisine} · {dinner.nutrition.calories} kcal</p>
            {dinner.description && <p className="text-[15.5px]">{dinner.description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button icon={<ChefHat className="size-5" />} onClick={() => (dinner.details ? startCooking(dinner.id) : openRecipe(dinner.id))}>Start cooking</Button>
              <Button variant="secondary" onClick={() => openRecipe(dinner.id)}>View recipe</Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="card p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-5 items-center">
          <div>
            <p className="label">Tonight's dinner</p>
            <h2 className="text-[26px] font-extrabold mt-1">{inventory.length ? "Nothing planned yet" : "Let's stock your kitchen"}</h2>
            <p className="text-muted mt-1">{inventory.length ? `You have ${plural(inventory.length, "ingredient")}. Get a plan built around them in under a minute.` : "Add what's in your fridge, freezer and pantry to get started."}</p>
          </div>
          {inventory.length
            ? <Button size="lg" icon={<Sparkles className="size-5" />} onClick={() => setPrefsOpen(true)}>Plan my meals</Button>
            : <Button size="lg" onClick={() => { navigate("kitchen"); openBulkAdd("type"); }}>Add ingredients</Button>}
        </section>
      )}

      {/* Widgets */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" aria-label="Kitchen at a glance">
        <Widget label="Your kitchen" value={inventory.length} sub="ingredients available" icon={<Refrigerator className="size-5" />} onClick={() => navigate("kitchen")} />
        <Widget label="Expiring soon" value={urgent.length} sub={urgent.length ? "use these first" : "nothing urgent"} icon={<AlarmClock className="size-5" />} tone={urgent.length ? "warn" : "good"} onClick={() => navigate("kitchen")} />
        <Widget label="This week" value={planned.length} sub={plan ? `meals planned · ${Math.round(score.percent)}% of fresh food used` : "meals planned"} icon={<CalendarDays className="size-5" />} onClick={() => navigate("plan")} />
        <Widget label="Food saved" value={stats.savedFromWaste} sub="ingredients used before expiring" icon={<Leaf className="size-5" />} tone="good" />
      </section>

      {/* Today's meals */}
      {todayMeals.length > 1 && (
        <section className="grid gap-3">
          <div className="flex items-end justify-between"><h2 className="text-[22px] font-bold">Today's menu</h2><a href="#plan" className="text-brand font-semibold text-[14.5px] inline-flex items-center gap-1">Full plan <ArrowRight className="size-4" /></a></div>
          <div className={todayMeals.length >= 4 ? "grid sm:grid-cols-2 lg:grid-cols-4 gap-3" : todayMeals.length === 3 ? "grid sm:grid-cols-3 gap-3" : "grid sm:grid-cols-2 gap-3"}>
            {todayMeals.map(({ m, r }) => <MealCard key={m} recipe={r} mealLabel={`${MEAL_TYPES[m].emoji} ${MEAL_TYPES[m].label}`} onOpen={() => openRecipe(r.id)} />)}
          </div>
        </section>
      )}

      {/* Use it before it's gone */}
      <section className="card p-5 md:p-7 grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold inline-flex items-center gap-2"><span aria-hidden>🚨</span> Use it before it's gone</h2>
            <p className="text-muted text-[14.5px]">{urgent.length ? "These are close to their date. Cook them first." : "Nothing is close to expiring. Nice work."}</p>
          </div>
          {urgent.length > 0 && <Button variant="soft" loading={rescuing} icon={<Sparkles className="size-4" />} onClick={findRescue}>Find recipes for these</Button>}
        </div>
        {urgent.length > 0 && (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {urgent.slice(0, 6).map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-sunken p-3">
                <span className="text-2xl" aria-hidden>{emojiFor(i.name)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{i.name}</span>
                  <span className="block text-[13px] text-muted">{i.expiresOn ? relativeExpiry(i.expiresOn) : "opened"}</span>
                </span>
                <FreshnessBadge item={i} compact />
              </li>
            ))}
          </ul>
        )}
        {rescueError && <Banner tone="danger">{rescueError}</Banner>}
        {rescue.length > 0 && (
          <div className="grid gap-3">
            <h3 className="font-bold text-[17px]">Recipes that rescue them</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rescue.map((r) => <RecipeCard key={r.id} recipe={r} favorite={favorites.includes(r.id)} onFavorite={() => toggleFavorite(r.id)} onOpen={() => openRecipe(r.id)} />)}
            </div>
          </div>
        )}
      </section>

      {/* Surprise */}
      <section className="rounded-4xl bg-saffron-soft p-6 md:p-8 grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <span className="size-16 rounded-3xl bg-surface grid place-items-center shadow-card"><Dices className="size-8 text-[rgb(var(--saffron))]" /></span>
        <div>
          <h2 className="text-[22px] font-bold">Feeling adventurous?</h2>
          <p className="text-ink/75">Get one creative, practical dish from what you have right now.</p>
        </div>
        <Button size="lg" variant="secondary" icon={<Dices className="size-5" />} onClick={() => setSurpriseOpen(true)}>Surprise me</Button>
      </section>

      {!inventory.length && (
        <div className="text-center"><Button variant="ghost" onClick={() => openIngredientForm()}>Add a single ingredient</Button></div>
      )}
    </div>
  );
}
