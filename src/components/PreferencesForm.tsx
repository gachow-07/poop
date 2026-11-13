import { useEffect, useState } from "react";
import { z } from "zod";
import { ShieldAlert, Sparkles, Plus } from "lucide-react";
import type { Diet, MealType, Preferences, Skill } from "../types";
import { COMMON_ALLERGIES, CUISINES, DIETS, MEAL_ORDER, MEAL_TYPES } from "../data/categories";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { runGeneratePlan } from "../store/actions";
import { navigate } from "../lib/router";
import { plural } from "../lib/utils";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Chip, Field, Section, Segmented, Stepper, Switch } from "./ui/controls";
import { Banner } from "./ui/feedback";

const schema = z.object({
  meals: z.array(z.string()).min(1, "Pick at least one meal."),
  servings: z.number().int().min(1).max(12),
  caloriesPerMeal: z.number().int().min(150, "Calories should be between 150 and 2,000.").max(2000, "Calories should be between 150 and 2,000.").optional(),
  proteinPerMeal: z.number().int().min(5, "Protein should be between 5 g and 150 g.").max(150, "Protein should be between 5 g and 150 g.").optional(),
  otherDiet: z.string().max(80, "Keep this under 80 characters."),
});

export function PreferencesForm() {
  const open = useUI((s) => s.prefsOpen);
  const setOpen = useUI((s) => s.setPrefsOpen);
  const saved = useKitchen((s) => s.prefs);
  const inventoryCount = useKitchen((s) => s.inventory.length);
  const [p, setP] = useState<Preferences>(saved);
  const [customAllergy, setCustomAllergy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (open) { setP(saved); setErrors({}); } }, [open, saved]);
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => { setP((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = () => {
    const r = schema.safeParse(p);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setOpen(false);
    navigate("plan");
    void runGeneratePlan({ ...p, meals: MEAL_ORDER.filter((m) => p.meals.includes(m)) });
  };

  const addCustomAllergy = () => {
    const a = customAllergy.trim();
    if (a && !p.allergies.some((x) => x.toLowerCase() === a.toLowerCase())) set("allergies", [...p.allergies, a]);
    setCustomAllergy("");
  };
  const numOrUndef = (s: string) => (s.trim() === "" ? undefined : Math.round(Number(s)));
  const total = p.days * p.meals.length;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Plan your meals" size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-muted hidden sm:block">{plural(total, "meal")} from {plural(inventoryCount, "ingredient")}</p>
          <Button size="lg" icon={<Sparkles className="size-5" />} onClick={submit} disabled={!inventoryCount} className="flex-1 sm:flex-none">Generate my plan</Button>
        </div>
      }>
      <div className="grid gap-8">
        {!inventoryCount && <Banner tone="warn">Your kitchen is empty. Add a few ingredients first so FridgeChef has something to cook with.</Banner>}

        <Section title="How many days?">
          <Segmented label="Days" value={p.days} onChange={(v) => set("days", v)} options={([1, 3, 5, 7, 14] as const).map((d) => ({ value: d, label: d === 1 ? "1 day" : `${d} days` }))} />
        </Section>

        <Section title="Which meals?">
          <div className="flex flex-wrap gap-2">
            {MEAL_ORDER.map((m: MealType) => (
              <Chip key={m} selected={p.meals.includes(m)} onClick={() => set("meals", toggle(p.meals, m))} icon={<span aria-hidden>{MEAL_TYPES[m].emoji}</span>}>{MEAL_TYPES[m].label}</Chip>
            ))}
          </div>
          {errors.meals && <p role="alert" className="text-tomato text-[13px] font-medium">{errors.meals}</p>}
        </Section>

        <Section title="Allergies" description="FridgeChef will never use these. This always wins over everything else.">
          <div className="flex flex-wrap gap-2">
            {[...new Set([...COMMON_ALLERGIES, ...p.allergies])].map((a) => (
              <Chip key={a} tone="danger" selected={p.allergies.includes(a)} onClick={() => set("allergies", toggle(p.allergies, a))}>{a}</Chip>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addCustomAllergy(); }}>
            <label htmlFor="custom-allergy" className="sr-only">Add another allergy</label>
            <input id="custom-allergy" className="input" placeholder="Another allergy, e.g. mustard" value={customAllergy} onChange={(e) => setCustomAllergy(e.target.value)} />
            <Button type="submit" variant="secondary" icon={<Plus className="size-4" />}>Add</Button>
          </form>
          {p.allergies.length > 0 && <p className="text-[13.5px] text-tomato font-medium inline-flex items-center gap-1.5"><ShieldAlert className="size-4" />Never include: {p.allergies.join(", ")}</p>}
        </Section>

        <Section title="Diet">
          <div className="flex flex-wrap gap-2">
            <Chip selected={!p.diets.length} onClick={() => set("diets", [])}>No restrictions</Chip>
            {DIETS.map((d) => <Chip key={d.id} selected={p.diets.includes(d.id)} onClick={() => set("diets", toggle<Diet>(p.diets, d.id))}>{d.label}</Chip>)}
          </div>
          <Field label="Other" htmlFor="other-diet" error={errors.otherDiet}>
            <input id="other-diet" className="input" placeholder="e.g. low sodium, halal, no pork" value={p.otherDiet} onChange={(e) => set("otherDiet", e.target.value)} />
          </Field>
        </Section>

        <Section title="Cooking">
          <div className="grid gap-5">
            <div className="grid gap-2"><span className="text-[14px] font-semibold">Maximum cooking time</span>
              <Segmented label="Maximum cooking time" value={p.maxMinutes} onChange={(v) => set("maxMinutes", v)}
                options={[{ value: 15, label: "Under 15 min" }, { value: 30, label: "15–30" }, { value: 45, label: "30–45" }, { value: 60, label: "45–60" }, { value: 0, label: "No limit" }]} />
            </div>
            <div className="grid gap-2"><span className="text-[14px] font-semibold">Skill level</span>
              <Segmented label="Skill level" value={p.skill} onChange={(v: Skill) => set("skill", v)}
                options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]} />
            </div>
            <div className="grid gap-2"><span className="text-[14px] font-semibold">Servings per meal</span>
              <Stepper label="servings" value={p.servings} onChange={(v) => set("servings", v)} format={(v) => plural(v, "serving")} />
            </div>
          </div>
        </Section>

        <Section title="Favourite cuisines" description="Optional. Leave empty for a mix.">
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((c) => <Chip key={c} selected={p.cuisines.includes(c)} onClick={() => set("cuisines", toggle(p.cuisines, c))}>{c}</Chip>)}
          </div>
        </Section>

        <Section title="Nutrition targets" description="Optional, per serving.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories per meal" htmlFor="cal" error={errors.caloriesPerMeal}>
              <input id="cal" className="input" inputMode="numeric" placeholder="e.g. 550" value={p.caloriesPerMeal ?? ""} onChange={(e) => set("caloriesPerMeal", numOrUndef(e.target.value))} />
            </Field>
            <Field label="Protein target (g)" htmlFor="protein" error={errors.proteinPerMeal}>
              <input id="protein" className="input" inputMode="numeric" placeholder="e.g. 30" value={p.proteinPerMeal ?? ""} onChange={(e) => set("proteinPerMeal", numOrUndef(e.target.value))} />
            </Field>
          </div>
        </Section>

        <section className="grid divide-y divide-line">
          <Switch id="budget" checked={p.budgetMode} onChange={(v) => set("budgetMode", v)} label="Budget-conscious" description="Fewer, cheaper purchases. Lean on the pantry." />
          <Switch id="leftovers" checked={p.leftoverMode} onChange={(v) => set("leftoverMode", v)} label="Leftover-friendly" description="Cook once, eat twice: tonight's extras become tomorrow's lunch." />
          <Switch id="staples" checked={p.assumeStaples} onChange={(v) => set("assumeStaples", v)} label="I have the basics" description="Salt, pepper, cooking oil and water don't need to be listed." />
        </section>
      </div>
    </Modal>
  );
}
