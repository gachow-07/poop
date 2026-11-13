import { useEffect, useId, useMemo, useState } from "react";
import { z } from "zod";
import type { Category, Ingredient, StorageLocation } from "../types";
import { CATEGORIES, CATEGORY_ORDER, LOCATIONS } from "../data/categories";
import { UNITS, lookupCatalog, searchCatalog, type CatalogItem } from "../data/catalog";
import { addDays, todayISO } from "../lib/dates";
import { cx, formatQty, parseQty } from "../lib/utils";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field, Segmented } from "./ui/controls";

const schema = z.object({
  name: z.string().trim().min(1, "Give the ingredient a name.").max(60, "Keep the name under 60 characters."),
  quantity: z.string().refine((v) => { const n = parseQty(v); return n != null && n > 0 && n <= 9999; }, "Enter an amount like 2, 0.5 or 1/2."),
  unit: z.string().trim().min(1, "Pick a unit.").max(20),
  category: z.enum(CATEGORY_ORDER as [Category, ...Category[]]),
  location: z.enum(["fridge", "freezer", "pantry"]),
  expiresOn: z.string().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date.").optional(),
  opened: z.boolean(),
  notes: z.string().max(140, "Keep notes under 140 characters.").optional(),
});
type FormValues = z.infer<typeof schema>;
type Errors = Partial<Record<keyof FormValues, string>>;

const blank = (): FormValues => ({ name: "", quantity: "1", unit: "pieces", category: "vegetables", location: "fridge", expiresOn: "", opened: false, notes: "" });

const fromItem = (i: Ingredient): FormValues => ({
  name: i.name, quantity: formatQty(i.quantity).replace("½", ".5").replace(/^\./, "0."), unit: i.unit, category: i.category,
  location: i.location, expiresOn: i.expiresOn ?? "", opened: !!i.opened, notes: i.notes ?? "",
});

export function IngredientForm() {
  const { open, editing } = useUI((s) => s.ingredientForm);
  const close = useUI((s) => s.closeIngredientForm);
  const toast = useUI((s) => s.toast);
  const add = useKitchen((s) => s.addIngredients);
  const update = useKitchen((s) => s.updateIngredient);
  const [v, setV] = useState<FormValues>(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();

  useEffect(() => {
    if (open) { setV(editing ? fromItem(editing) : blank()); setErrors({}); setShowSuggest(false); }
  }, [open, editing]);

  const suggestions = useMemo(() => (showSuggest ? searchCatalog(v.name, 6) : []), [v.name, showSuggest]);
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => { setV((p) => ({ ...p, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const pick = (c: CatalogItem) => {
    setV((p) => ({ ...p, name: c.name, unit: c.unit, category: c.category, location: c.location, expiresOn: c.keeps ? addDays(todayISO(), c.keeps) : "" }));
    setShowSuggest(false);
  };

  const submit = (again: boolean) => {
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof FormValues] ??= issue.message;
      setErrors(errs);
      document.getElementById(`${id}-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    const d = parsed.data;
    const item = { name: d.name, quantity: parseQty(d.quantity)!, unit: d.unit, category: d.category, location: d.location as StorageLocation, expiresOn: d.expiresOn || undefined, opened: d.opened || undefined, notes: d.notes?.trim() || undefined };
    if (editing) { update(editing.id, item); toast({ text: `Updated ${d.name}.`, tone: "success" }); close(); return; }
    add([item]);
    toast({ text: `Added ${d.name} to your ${LOCATIONS[item.location].label.toLowerCase()}.`, tone: "success" });
    if (again) { setV(blank()); setErrors({}); document.getElementById(`${id}-name`)?.focus(); } else close();
  };

  const quickDates = [["Today", 0], ["3 days", 3], ["1 week", 7], ["2 weeks", 14], ["1 month", 30]] as const;
  const err = (k: keyof FormValues) => errors[k] ? { "aria-invalid": true, "aria-describedby": `${id}-${k}-error` } : {};

  return (
    <Modal open={open} onClose={close} title={editing ? `Edit ${editing.name}` : "Add an ingredient"}
      footer={
        <div className="flex gap-2 justify-end">
          {!editing && <Button variant="secondary" onClick={() => submit(true)}>Save & add another</Button>}
          <Button onClick={() => submit(false)}>{editing ? "Save changes" : "Add to kitchen"}</Button>
        </div>
      }>
      <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); submit(false); }} noValidate>
        <Field label="Ingredient" htmlFor={`${id}-name`} error={errors.name}>
          <div className="relative">
            <input id={`${id}-name`} className="input" autoComplete="off" placeholder="Start typing, e.g. chicken" value={v.name}
              role="combobox" aria-expanded={suggestions.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" {...err("name")}
              onChange={(e) => { set("name", e.target.value); setShowSuggest(true); setActive(0); }}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onKeyDown={(e) => {
                if (!suggestions.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); pick(suggestions[active]); }
                if (e.key === "Escape") setShowSuggest(false);
              }} />
            {suggestions.length > 0 && (
              <ul id={`${id}-list`} role="listbox" className="absolute z-10 mt-2 w-full card p-1.5 shadow-lift">
                {suggestions.map((s, i) => (
                  <li key={s.name} role="option" aria-selected={i === active}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                      className={cx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left", i === active ? "bg-sunken" : "hover:bg-sunken")}>
                      <span className="text-[20px]" aria-hidden>{s.emoji}</span>
                      <span className="flex-1 font-medium">{s.name}</span>
                      <span className="text-[12.5px] text-muted">{LOCATIONS[s.location].label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" htmlFor={`${id}-quantity`} error={errors.quantity}>
            <input id={`${id}-quantity`} className="input" inputMode="decimal" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} {...err("quantity")} />
          </Field>
          <Field label="Unit" htmlFor={`${id}-unit`} error={errors.unit}>
            <select id={`${id}-unit`} className="input" value={v.unit} onChange={(e) => set("unit", e.target.value)}>
              {[...new Set([v.unit, ...UNITS])].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Stored in" htmlFor={`${id}-location`}>
          <div id={`${id}-location`}>
            <Segmented label="Stored in" value={v.location} onChange={(l) => set("location", l)}
              options={(Object.keys(LOCATIONS) as StorageLocation[]).map((l) => ({ value: l, label: `${LOCATIONS[l].emoji} ${LOCATIONS[l].label}` }))} />
          </div>
        </Field>

        <Field label="Category" htmlFor={`${id}-category`}>
          <select id={`${id}-category`} className="input" value={v.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORIES[c].emoji} {CATEGORIES[c].label}</option>)}
          </select>
        </Field>

        <Field label="Expiration date" htmlFor={`${id}-expiresOn`} error={errors.expiresOn} hint="Optional. FridgeChef cooks the soonest-expiring food first.">
          <input id={`${id}-expiresOn`} type="date" className="input" value={v.expiresOn} min={addDays(todayISO(), -30)} onChange={(e) => set("expiresOn", e.target.value)} {...err("expiresOn")} />
          <div className="flex flex-wrap gap-1.5">
            {quickDates.map(([label, d]) => (
              <button key={label} type="button" onClick={() => set("expiresOn", addDays(todayISO(), d))}
                className="h-8 px-3 rounded-full bg-sunken text-[13px] font-medium hover:bg-line">{label}</button>
            ))}
            {v.expiresOn && <button type="button" onClick={() => set("expiresOn", "")} className="h-8 px-3 rounded-full text-[13px] font-medium text-muted hover:text-ink">Clear</button>}
          </div>
        </Field>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="size-5 accent-[rgb(var(--brand))]" checked={v.opened} onChange={(e) => set("opened", e.target.checked)} />
          <span><span className="font-semibold">Already opened</span> <span className="text-muted text-[14px]">· gets used sooner</span></span>
        </label>

        <Field label="Notes" htmlFor={`${id}-notes`} error={errors.notes}>
          <input id={`${id}-notes`} className="input" placeholder="Optional, e.g. half used, for Sunday" value={v.notes} onChange={(e) => set("notes", e.target.value)} {...err("notes")} />
        </Field>
        {!editing && v.name && !lookupCatalog(v.name) && v.name.length > 2 && <p className="text-[13px] text-muted -mt-2">Not in our list, but that's fine. Pick a category and storage spot.</p>}
      </form>
    </Modal>
  );
}
