import { useState, type ReactNode } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { AlertTriangle, CalendarRange, GripVertical, Plus, Settings2, ShoppingBasket, Sparkles, Square, Leaf, CheckCircle2 } from "lucide-react";
import type { MealType, Recipe } from "../types";
import { slotKey } from "../types";
import { MEAL_TYPES } from "../data/categories";
import { emojiFor } from "../data/catalog";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { stopGeneration, urgentItems } from "../store/actions";
import { addDays, shortDate, todayISO, weekday } from "../lib/dates";
import { dayTotals, groceryCost, haveRatio, planRecipes, wasteScore } from "../lib/metrics";
import { cx, money, plural } from "../lib/utils";
import { MealCard } from "../components/cards";
import { Button } from "../components/ui/Button";
import { Banner, EmptyState, Ring } from "../components/ui/feedback";

export function Plan() {
  const plan = useKitchen((s) => s.plan);
  const recipes = useKitchen((s) => s.recipes);
  const inventory = useKitchen((s) => s.inventory);
  const grocery = useKitchen((s) => s.grocery);
  const swapSlots = useKitchen((s) => s.swapSlots);
  const gen = useUI((s) => s.generation);
  const { setPrefsOpen, openRecipe, setGeneration } = useUI.getState();
  const [dragging, setDragging] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  if (!plan) {
    return (
      <div className="grid grid-cols-1 gap-6 animate-fade-up">
        <h1 className="text-[32px] md:text-[40px] font-extrabold">Meal Plan</h1>
        {gen.error && <Banner tone="danger" action={<Button size="sm" variant="secondary" onClick={() => setGeneration({ error: undefined })}>Dismiss</Button>}>{gen.error}</Banner>}
        <EmptyState emoji="🗓️" title="No plan yet" text="Pick your days, meals and preferences. FridgeChef plans meals around what you have, using the soonest-expiring food first."
          action={<Button size="lg" icon={<Sparkles className="size-5" />} onClick={() => setPrefsOpen(true)}>Build my plan</Button>} />
      </div>
    );
  }

  const rs = planRecipes(plan, recipes);
  const score = wasteScore(plan, recipes, inventory);
  const have = haveRatio(rs);
  const cost = groceryCost(grocery.filter((g) => !g.custom));
  const urgent = urgentItems();
  const usedIds = new Set(rs.flatMap((r) => r.ingredients.map((i) => i.inventoryId)));
  const avg = rs.length ? Math.round(rs.reduce((a, r) => a + r.nutrition.calories, 0) / Math.max(1, plan.days)) : 0;
  const avgProtein = rs.length ? Math.round(rs.reduce((a, r) => a + r.nutrition.protein, 0) / Math.max(1, plan.days)) : 0;
  const allergyCount = rs.filter((r) => r.allergyFlags.length).length;
  const end = addDays(plan.startDate, plan.days - 1);

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (e.over && e.active.id !== e.over.id) swapSlots(String(e.active.id), String(e.over.id));
  };
  const dragRecipe = dragging ? recipes[plan.slots[dragging] ?? ""] : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted font-medium inline-flex items-center gap-1.5"><CalendarRange className="size-4" />{shortDate(plan.startDate)}{plan.days > 1 && ` – ${shortDate(end)}`}{plan.sample && " · Sample plan"}</p>
          <h1 className="text-[32px] md:text-[40px] font-extrabold leading-tight">{plan.days === 1 ? "Today's plan" : `Your ${plan.days}-day plan`}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Settings2 className="size-4" />} onClick={() => setPrefsOpen(true)} disabled={gen.running}>Preferences</Button>
          <Button icon={<Sparkles className="size-4" />} onClick={() => setPrefsOpen(true)} disabled={gen.running}>New plan</Button>
        </div>
      </header>

      {gen.running && (
        <div className="card p-5 grid gap-3 border-brand/40" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative size-10 grid place-items-center rounded-2xl bg-brand-soft"><Sparkles className="size-5 text-brand animate-pulse" /></span>
              <div className="min-w-0">
                <p className="font-semibold">Cooking up your plan… <span className="text-muted num">{gen.done} of {gen.total}</span></p>
                <p className="text-[13.5px] text-muted truncate">{gen.status || "Reading your kitchen…"}</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" icon={<Square className="size-3.5 fill-current" />} onClick={stopGeneration}>Stop</Button>
          </div>
          <div className="h-2 rounded-full bg-sunken overflow-hidden">
            <div className={cx("h-full bg-brand rounded-full transition-all duration-500", gen.done === 0 && "w-1/12 animate-pulse")} style={gen.done ? { width: `${(gen.done / gen.total) * 100}%` } : undefined} />
          </div>
          <p className="text-[13px] text-muted">Meals appear below as they're planned. The first ones usually arrive within 30 seconds.</p>
        </div>
      )}
      {gen.error && <Banner tone="danger" action={<Button size="sm" variant="secondary" onClick={() => setGeneration({ error: undefined })}>Dismiss</Button>}>{gen.error}</Banner>}
      {allergyCount > 0 && <Banner tone="danger"><b>{plural(allergyCount, "meal")} may contain an allergen.</b> They're marked in red. Open one and tap “Make it safe” to replace it.</Banner>}

      {/* Summary */}
      {rs.length > 0 && (
        <section className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
          <div className="card p-5 md:p-6 flex gap-5 items-center">
            <Ring value={score.percent} label={`Food waste score ${Math.round(score.percent)} percent`} size={92} />
            <div className="grid gap-1 min-w-0">
              <p className="label">Food waste score</p>
              <p className="text-[17px] font-semibold leading-snug">{Math.round(score.percent)}% of your fresh ingredients get used{plan.days > 1 ? " in this plan" : " today"}.</p>
              {score.unused.length > 0
                ? <p className="text-[14px] text-muted">Not used yet: {score.unused.slice(0, 4).map((i) => i.name).join(", ")}{score.unused.length > 4 && ` +${score.unused.length - 4} more`}</p>
                : <p className="text-[14px] text-fresh font-semibold">Every fresh item has a job.</p>}
              {plan.summary && <p className="text-[14px] text-ink/80 mt-1">{plan.summary}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Already have" value={`${Math.round(have.percent)}%`} sub="of ingredients" />
            <Stat label="Extra groceries" value={cost ? money(cost) : "$0"} sub={`${grocery.filter((g) => !g.custom && !g.checked).length} items`} action={<a href="#grocery" className="text-brand font-semibold inline-flex items-center gap-1"><ShoppingBasket className="size-3.5" />List</a>} />
            <Stat label="Per day" value={`${avg.toLocaleString()} kcal`} sub="average" />
            <Stat label="Protein" value={`${avgProtein} g`} sub="per day, average" />
          </div>
        </section>
      )}

      {plan.warnings.length > 0 && (
        <Banner tone="warn"><span className="inline-flex items-start gap-2"><AlertTriangle className="size-5 shrink-0 mt-0.5" /><span>{plan.warnings.join(" ")}</span></span></Banner>
      )}

      {urgent.length > 0 && rs.length > 0 && (
        <section className="flex flex-wrap items-center gap-2" aria-label="Expiring items covered">
          <span className="label mr-1">Use soon</span>
          {urgent.slice(0, 8).map((i) => (
            <span key={i.id} className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", usedIds.has(i.id) ? "bg-fresh-soft text-fresh" : "bg-tomato-soft text-tomato")}>
              <span aria-hidden>{emojiFor(i.name)}</span>{i.name}{usedIds.has(i.id) ? <CheckCircle2 className="size-3.5" /> : <span className="font-medium">· not used</span>}
            </span>
          ))}
        </section>
      )}

      <p className="text-[13.5px] text-muted inline-flex items-center gap-1.5"><GripVertical className="size-4" />Drag meals to rearrange them. On a phone, press and hold first.</p>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className={cx("grid gap-4", plan.days > 1 && "md:grid-flow-col md:auto-cols-[minmax(270px,1fr)] md:overflow-x-auto md:pb-3 md:snap-x")}>
          {Array.from({ length: plan.days }, (_, d) => {
            const date = addDays(plan.startDate, d);
            const totals = dayTotals(plan, recipes, d);
            const isToday = date === todayISO();
            return (
              <section key={d} className={cx("rounded-3xl p-3 md:p-3.5 grid gap-2.5 content-start snap-start", isToday ? "bg-brand-soft" : "bg-sunken")} aria-label={`${weekday(date)} meals`}>
                <header className="flex items-baseline justify-between gap-2 px-1.5 pt-1">
                  <h2 className="text-[19px] font-bold">{weekday(date)}{isToday && <span className="ml-2 align-middle text-[11px] font-sans font-bold uppercase tracking-wider bg-brand text-brand-ink rounded-full px-2 py-0.5">Today</span>}</h2>
                  <span className="text-[12.5px] text-muted num">{totals.calories ? `${totals.calories.toLocaleString()} kcal · ${totals.protein}g protein` : `Day ${d + 1}`}</span>
                </header>
                {plan.mealTypes.map((m) => {
                  const key = slotKey(d, m);
                  const r = recipes[plan.slots[key] ?? ""];
                  return (
                    <Slot key={key} id={key}>
                      {r ? (
                        <DraggableMeal id={key} recipe={r} meal={m} hidden={dragging === key} onOpen={() => openRecipe(r.id)} />
                      ) : gen.running ? (
                        <div className="h-[84px] rounded-2xl skeleton" aria-label={`Planning ${MEAL_TYPES[m].label}`} />
                      ) : (
                        <button type="button" onClick={() => setPrefsOpen(true)} className="w-full h-[84px] rounded-2xl border-2 border-dashed border-line text-muted text-[14px] font-medium inline-flex items-center justify-center gap-1.5 hover:border-brand hover:text-brand">
                          <Plus className="size-4" />{MEAL_TYPES[m].emoji} {MEAL_TYPES[m].label} — empty
                        </button>
                      )}
                    </Slot>
                  );
                })}
              </section>
            );
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragRecipe && dragging ? <MealCard recipe={dragRecipe} mealLabel={MEAL_TYPES[dragging.split(":")[1] as MealType].label} onOpen={() => {}} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {rs.some((r) => r.leftovers?.makes || r.leftovers?.from) && (
        <section className="card p-5 grid gap-2">
          <h2 className="text-[18px] font-bold inline-flex items-center gap-2"><Leaf className="size-5 text-brand" />How leftovers flow</h2>
          <ul className="grid gap-1.5 text-[14.5px]">
            {rs.filter((r) => r.leftovers?.makes).map((r) => <li key={r.id}><b>{r.name}</b> makes {r.leftovers!.makes}.</li>)}
            {rs.filter((r) => r.leftovers?.from).map((r) => <li key={r.id}><b>{r.name}</b> uses leftovers from {r.leftovers!.from}.</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub, action }: { label: string; value: string; sub: string; action?: ReactNode }) {
  return (
    <div className="card p-4 grid gap-1 content-start">
      <div className="flex justify-between items-center text-[13px]"><span className="label">{label}</span>{action}</div>
      <p className="font-display font-bold text-[24px] leading-none num">{value}</p>
      <p className="text-[13px] text-muted">{sub}</p>
    </div>
  );
}

function Slot({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cx("rounded-2xl transition", isOver && "ring-2 ring-brand ring-offset-2 ring-offset-transparent")}>{children}</div>;
}

function DraggableMeal({ id, recipe, meal, hidden, onOpen }: { id: string; recipe: Recipe; meal: MealType; hidden: boolean; onOpen(): void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} aria-roledescription="draggable meal" className={cx("touch-manipulation", hidden && "opacity-30")}>
      <MealCard recipe={recipe} mealLabel={`${MEAL_TYPES[meal].emoji} ${MEAL_TYPES[meal].label}`} onOpen={onOpen} />
    </div>
  );
}
