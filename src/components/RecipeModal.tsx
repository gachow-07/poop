import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, ChefHat, Clock, Heart, Info, Package, Repeat2, ShieldAlert, ShoppingCart, Sparkles, Users, X, CalendarPlus } from "lucide-react";
import type { MealType, Recipe } from "../types";
import { slotKey } from "../types";
import { MEAL_TYPES } from "../data/categories";
import { VARIANTS } from "../ai/mealPlanner";
import { friendlyError, getProvider } from "../ai/provider";
import { ensureDetails, findSlotOf, replaceWithAlternative } from "../store/actions";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { addDays, weekday } from "../lib/dates";
import { cx, money } from "../lib/utils";
import { Modal } from "./ui/Modal";
import { Button, IconButton } from "./ui/Button";
import { Banner } from "./ui/feedback";
import { FoodArt } from "./FoodArt";
import { Tag } from "./cards";

export function RecipeModal() {
  const id = useUI((s) => s.recipeId);
  const recipe = useKitchen((s) => (id ? s.recipes[id] : undefined));
  const openRecipe = useUI((s) => s.openRecipe);
  return (
    <Modal open={!!recipe} onClose={() => openRecipe(null)} title={recipe?.name ?? "Recipe"} hideTitle size="lg">
      {recipe && <RecipeDetail key={recipe.id} recipe={recipe} />}
    </Modal>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const openRecipe = useUI((s) => s.openRecipe);
  const startCooking = useUI((s) => s.startCooking);
  const favorite = useKitchen((s) => s.favorites.includes(recipe.id));
  const toggleFavorite = useKitchen((s) => s.toggleFavorite);
  const inventory = useKitchen((s) => s.inventory);
  const plan = useKitchen((s) => s.plan);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "error" | "unavailable">("idle");
  const [detailError, setDetailError] = useState("");

  const slot = findSlotOf(recipe.id);
  const slotLabel = slot && plan ? (() => { const [d, m] = slot.split(":"); return `${weekday(addDays(plan.startDate, +d))} ${MEAL_TYPES[m as MealType].label.toLowerCase()}`; })() : null;
  const have = recipe.ingredients.filter((i) => i.have);
  const need = recipe.ingredients.filter((i) => !i.have);
  const cost = need.reduce((a, i) => a + (i.estCost ?? 0), 0);
  const invName = (ids: string[]) => ids.map((i) => inventory.find((x) => x.id === i)?.name).filter(Boolean).join(" + ");

  const loadDetails = () => {
    setDetailState("loading");
    getProvider().then((p) => {
      if (!p) { setDetailState("unavailable"); return; }
      ensureDetails(recipe.id).then(() => setDetailState("idle")).catch((e) => { setDetailState("error"); setDetailError(friendlyError(e)); });
    });
  };
  useEffect(() => { if (!recipe.details) loadDetails(); }, [recipe.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-[max(24px,env(safe-area-inset-bottom,0px))]">
      <div className="relative">
        <FoodArt name={recipe.name} emoji={recipe.emoji} garnishes={recipe.ingredients.map((i) => i.name)} size="lg" className="!rounded-none" />
        <div className="absolute top-3 right-3 flex gap-2">
          <IconButton label={favorite ? "Remove from favorites" : "Save to favorites"} onClick={() => toggleFavorite(recipe.id)} className="bg-white/90 !text-[#1d2b22] backdrop-blur shadow-card hover:bg-white">
            <Heart className={cx("size-5", favorite && "fill-tomato text-tomato")} />
          </IconButton>
          <IconButton label="Close" onClick={() => openRecipe(null)} className="bg-white/90 !text-[#1d2b22] backdrop-blur shadow-card hover:bg-white"><X className="size-5" /></IconButton>
        </div>
      </div>

      <div className="gutter md:px-8 pt-6 grid gap-7">
        <header className="grid gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Tag>{MEAL_TYPES[recipe.mealType].emoji} {MEAL_TYPES[recipe.mealType].label}</Tag>
            {slotLabel && <Tag tone="good">Planned for {slotLabel}</Tag>}
            <Tag>{recipe.cuisine}</Tag>
            {recipe.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          <h2 className="text-[30px] md:text-[36px] font-extrabold leading-[1.08]">{recipe.name}</h2>
          {recipe.description && <p className="text-[16.5px] text-muted max-w-[62ch]">{recipe.description}</p>}
          {recipe.allergyFlags.length > 0 && (
            <Banner tone="danger" action={<AltButton recipe={recipe} instruction={`Remove every trace of ${recipe.allergyFlags.join(", ")}: the cook is allergic.`} label="Make it safe" />}>
              <span className="inline-flex items-center gap-2 font-semibold"><ShieldAlert className="size-5 text-tomato" />This recipe appears to contain {recipe.allergyFlags.join(", ")}, which you're allergic to. Don't cook it as written.</span>
            </Banner>
          )}
          {(recipe.leftovers?.makes || recipe.leftovers?.from) && (
            <p className="inline-flex items-center gap-2 text-[14.5px] font-medium text-brand-deep bg-brand-soft rounded-xl px-3 py-2 w-fit">
              <Repeat2 className="size-4" />
              {recipe.leftovers.from ? `Uses leftovers from ${recipe.leftovers.from}` : `Makes leftovers: ${recipe.leftovers.makes}`}
            </p>
          )}
        </header>

        <dl className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            ["Prep", `${recipe.prepMinutes} min`], ["Cook", `${recipe.cookMinutes} min`], ["Total", `${recipe.prepMinutes + recipe.cookMinutes} min`],
            ["Serves", String(recipe.servings)], ["Level", recipe.difficulty], ["Calories", `${recipe.nutrition.calories}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-sunken px-3 py-2.5">
              <dt className="label !text-[11px]">{k}</dt>
              <dd className="font-display font-bold text-[18px] num">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="grid gap-2" aria-label="Nutrition per serving">
          <h3 className="text-[18px] font-bold">Nutrition <span className="text-muted font-sans font-normal text-[14px]">per serving, estimated</span></h3>
          <div className="grid grid-cols-3 gap-3">
            {([["Protein", recipe.nutrition.protein, 50, "bg-brand"], ["Carbs", recipe.nutrition.carbs, 90, "bg-saffron"], ["Fat", recipe.nutrition.fat, 40, "bg-tomato"]] as const).map(([k, v, max, color]) => (
              <div key={k} className="grid gap-1.5">
                <div className="flex justify-between text-[14px]"><span className="text-muted">{k}</span><span className="font-semibold num">{v} g</span></div>
                <div className="h-2 rounded-full bg-sunken overflow-hidden"><div className={cx("h-full rounded-full", color)} style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-line p-5 grid gap-3 content-start">
            <h3 className="text-[18px] font-bold inline-flex items-center gap-2"><Package className="size-5 text-fresh" />Already have <span className="text-muted font-sans font-normal text-[14px]">{have.length}</span></h3>
            {have.length ? (
              <ul className="grid gap-2">
                {have.map((i) => (
                  <li key={i.name} className="flex items-start gap-2.5">
                    <Check className="size-4 mt-1 text-fresh shrink-0" strokeWidth={3} />
                    <span className="flex-1"><span className="font-medium">{i.name}</span> <span className="text-muted">· {i.amount}</span>
                      {i.fromLeftover && <span className="ml-1.5 text-[12px] font-semibold text-brand-deep bg-brand-soft rounded-full px-2 py-0.5">leftover</span>}
                      {i.inventoryId === "staple" && <span className="ml-1.5 text-[12px] text-muted">staple</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted text-[14.5px]">None of these are in your kitchen yet.</p>}
          </div>
          <div className="rounded-3xl border border-line p-5 grid gap-3 content-start">
            <h3 className="text-[18px] font-bold inline-flex items-center gap-2"><ShoppingCart className="size-5 text-[rgb(var(--saffron))]" />Need to buy <span className="text-muted font-sans font-normal text-[14px]">{need.length}{cost > 0 && ` · about ${money(cost)}`}</span></h3>
            {need.length ? (
              <ul className="grid gap-3">
                {need.map((i) => (
                  <li key={i.name} className="grid gap-1.5">
                    <div className="flex items-start gap-2.5">
                      <span className="size-4 mt-1 rounded-full border-2 border-[rgb(var(--saffron))] shrink-0" aria-hidden />
                      <span className="flex-1"><span className="font-medium">{i.name}</span> <span className="text-muted">· {i.amount}</span></span>
                      {i.estCost != null && <span className="text-[13px] text-muted num">{money(i.estCost)}</span>}
                    </div>
                    {i.substitution && (
                      <div className="ml-6 rounded-2xl bg-brand-soft px-3.5 py-2.5 text-[14px]">
                        <p className="font-semibold text-brand-deep inline-flex items-center gap-1.5"><ArrowLeftRight className="size-4" />Recommended substitution</p>
                        <p className="mt-0.5">Use <b>{i.substitution.amount || i.substitution.use}</b>{i.substitution.inventoryIds.length > 0 && <> ({invName(i.substitution.inventoryIds)}, which you have)</>}. {i.substitution.note}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-fresh font-semibold text-[15px]">You have everything for this one.</p>}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-[22px] font-bold">Method</h3>
            {recipe.details && <Button icon={<ChefHat className="size-5" />} size="lg" onClick={() => startCooking(recipe.id)}>Start cooking</Button>}
          </div>
          {recipe.details ? (
            <ol className="grid gap-3">
              {recipe.details.steps.map((s, n) => (
                <li key={n} className="flex gap-4">
                  <span className="size-8 shrink-0 rounded-full bg-ink text-bg grid place-items-center font-display font-bold num">{n + 1}</span>
                  <p className="pt-1 text-[16px] leading-relaxed flex-1">{s.text}{s.minutes ? <span className="ml-2 inline-flex items-center gap-1 text-[13px] text-muted"><Clock className="size-3.5" />{s.minutes} min</span> : null}</p>
                </li>
              ))}
            </ol>
          ) : detailState === "loading" ? (
            <div className="grid gap-3" aria-label="Writing the method">
              {[0, 1, 2, 3].map((n) => <div key={n} className="flex gap-4"><span className="size-8 rounded-full skeleton" /><span className="flex-1 h-12 skeleton" /></div>)}
              <p className="text-muted text-[14px]">Writing step-by-step instructions…</p>
            </div>
          ) : detailState === "error" ? (
            <Banner tone="danger" action={<Button size="sm" variant="secondary" onClick={loadDetails}>Try again</Button>}>{detailError}</Banner>
          ) : (
            <Banner tone="warn">Step-by-step instructions are written by the AI, which isn't connected here.</Banner>
          )}
        </section>

        {recipe.details && (recipe.details.storage || recipe.details.leftoverIdeas.length > 0 || recipe.details.tips.length > 0) && (
          <section className="grid sm:grid-cols-3 gap-3">
            {recipe.details.storage && <InfoCard title="Storage" icon="🧊" items={[recipe.details.storage]} />}
            {recipe.details.leftoverIdeas.length > 0 && <InfoCard title="Leftover ideas" icon="♻️" items={recipe.details.leftoverIdeas} />}
            {recipe.details.tips.length > 0 && <InfoCard title="Chef's tips" icon="💡" items={recipe.details.tips} />}
          </section>
        )}

        <Alternatives recipe={recipe} />
        {!slot && plan && <AddToPlan recipe={recipe} />}
        <p className="text-[12.5px] text-muted inline-flex items-start gap-1.5"><Info className="size-3.5 mt-0.5 shrink-0" />Nutrition and prices are AI estimates. Always check labels for allergens.</p>
      </div>
    </div>
  );
}

function InfoCard({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <div className="rounded-3xl bg-sunken p-4 grid gap-1.5 content-start">
      <h4 className="font-bold text-[15px]"><span aria-hidden>{icon}</span> {title}</h4>
      <ul className="grid gap-1 text-[14.5px] text-ink/85">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

function AltButton({ recipe, instruction, label }: { recipe: Recipe; instruction: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const openRecipe = useUI((s) => s.openRecipe);
  const toast = useUI((s) => s.toast);
  return (
    <Button size="sm" variant="secondary" loading={busy} onClick={async () => {
      setBusy(true);
      try { const alt = await replaceWithAlternative(recipe, instruction); openRecipe(alt.id); }
      catch (e) { toast({ text: friendlyError(e), tone: "error" }); }
      finally { setBusy(false); }
    }}>{label}</Button>
  );
}

function Alternatives({ recipe }: { recipe: Recipe }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [target, setTarget] = useState(recipe.ingredients[0]?.name ?? "");
  const [withWhat, setWithWhat] = useState("");
  const [error, setError] = useState("");
  const openRecipe = useUI((s) => s.openRecipe);
  const inSlot = !!findSlotOf(recipe.id);

  const run = async (key: string, instruction: string) => {
    setBusy(key); setError("");
    try { const alt = await replaceWithAlternative(recipe, instruction); openRecipe(alt.id); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(null); }
  };

  return (
    <section className="rounded-3xl border border-dashed border-line p-5 grid gap-3">
      <div>
        <h3 className="text-[20px] font-bold inline-flex items-center gap-2"><Sparkles className="size-5 text-[rgb(var(--saffron))]" />Not feeling this?</h3>
        <p className="text-muted text-[14.5px]">{inSlot ? "Swap just this meal. The rest of your plan stays as it is." : "Get a new take on this recipe."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <Button key={v.id} size="sm" variant="secondary" loading={busy === v.id} disabled={!!busy && busy !== v.id} onClick={() => run(v.id, v.instruction)}>{v.label}</Button>
        ))}
        <Button size="sm" variant={replacing ? "soft" : "secondary"} disabled={!!busy} onClick={() => setReplacing((r) => !r)}>Replace an ingredient</Button>
      </div>
      {replacing && (
        <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end" onSubmit={(e) => {
          e.preventDefault();
          void run("replace", `Replace ${target} with ${withWhat.trim() || "something the cook already has"}, keeping the dish as close as possible.`);
        }}>
          <label className="grid gap-1 text-[13.5px] font-semibold">Replace
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              {recipe.ingredients.map((i) => <option key={i.name}>{i.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[13.5px] font-semibold">With
            <input className="input" placeholder="Something I already have" value={withWhat} onChange={(e) => setWithWhat(e.target.value)} />
          </label>
          <Button type="submit" loading={busy === "replace"} disabled={!!busy && busy !== "replace"}>Swap it</Button>
        </form>
      )}
      {error && <Banner tone="danger">{error}</Banner>}
    </section>
  );
}

function AddToPlan({ recipe }: { recipe: Recipe }) {
  const plan = useKitchen((s) => s.plan)!;
  const recipes = useKitchen((s) => s.recipes);
  const setSlot = useKitchen((s) => s.setSlot);
  const setPlan = useKitchen((s) => s.setPlan);
  const toast = useUI((s) => s.toast);
  const [day, setDay] = useState(0);
  const [meal, setMeal] = useState<MealType>(plan.mealTypes.includes(recipe.mealType) ? recipe.mealType : plan.mealTypes[0]);
  const current = recipes[plan.slots[slotKey(day, meal)] ?? ""];
  return (
    <section className="rounded-3xl bg-sunken p-5 grid gap-3">
      <h3 className="text-[18px] font-bold inline-flex items-center gap-2"><CalendarPlus className="size-5" />Add to your plan</h3>
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <label className="grid gap-1 text-[13.5px] font-semibold">Day
          <select className="input" value={day} onChange={(e) => setDay(+e.target.value)}>
            {Array.from({ length: plan.days }, (_, d) => <option key={d} value={d}>{weekday(addDays(plan.startDate, d))} (Day {d + 1})</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[13.5px] font-semibold">Meal
          <select className="input" value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
            {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((m) => <option key={m} value={m}>{MEAL_TYPES[m].label}</option>)}
          </select>
        </label>
        <Button onClick={() => {
          if (!plan.mealTypes.includes(meal)) setPlan({ ...plan, mealTypes: [...plan.mealTypes, meal].sort((a, b) => ["breakfast", "lunch", "dinner", "snack"].indexOf(a) - ["breakfast", "lunch", "dinner", "snack"].indexOf(b)) });
          setSlot(slotKey(day, meal), recipe.id);
          toast({ text: `Added to Day ${day + 1} ${MEAL_TYPES[meal].label.toLowerCase()}.`, tone: "success" });
        }}>Add</Button>
      </div>
      {current && <p className="text-[13.5px] text-muted">This replaces {current.name}.</p>}
      <p className="text-[13.5px] text-muted inline-flex items-center gap-1.5"><Users className="size-3.5" />Missing ingredients go straight onto your grocery list.</p>
    </section>
  );
}
