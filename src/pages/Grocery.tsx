import { useMemo, useState } from "react";
import { Copy, Plus, ShoppingBasket } from "lucide-react";
import type { Aisle } from "../types";
import { AISLES, AISLE_ORDER } from "../data/categories";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { groceryCost, haveRatio, planRecipes } from "../lib/metrics";
import { aisleFor } from "../ai/guards";
import { money, plural } from "../lib/utils";
import { GroceryItemRow } from "../components/cards";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/feedback";

export function Grocery() {
  const grocery = useKitchen((s) => s.grocery);
  const plan = useKitchen((s) => s.plan);
  const recipes = useKitchen((s) => s.recipes);
  const { toggleGrocery, updateGrocery, removeGrocery, addGrocery, clearCheckedGrocery } = useKitchen.getState();
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [aisle, setAisle] = useState<Aisle | "auto">("auto");
  const [error, setError] = useState("");

  const have = haveRatio(planRecipes(plan, recipes));
  const left = grocery.filter((g) => !g.checked);
  const cost = groceryCost(grocery);
  const groups = useMemo(() => AISLE_ORDER.map((a) => [a, grocery.filter((g) => g.aisle === a).sort((x, y) => Number(x.checked) - Number(y.checked))] as const).filter(([, items]) => items.length), [grocery]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setError("Type what you need to buy."); return; }
    if (n.length > 60) { setError("Keep it under 60 characters."); return; }
    addGrocery(n, qty.trim(), aisle === "auto" ? aisleFor(n) : aisle);
    setName(""); setQty(""); setError("");
  };

  const copy = async () => {
    const text = groups.map(([a, items]) => `${AISLES[a].label}\n${items.filter((i) => !i.checked).map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join("\n")}`).filter((s) => s.includes("-")).join("\n\n");
    try { await navigator.clipboard.writeText(text); toast({ text: "Grocery list copied.", tone: "success" }); }
    catch { toast({ text: "Couldn't copy here. Try selecting the list instead.", tone: "error" }); }
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up max-w-3xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-extrabold leading-tight">Grocery list</h1>
          <p className="text-muted">{left.length ? `${plural(left.length, "item")} to buy${cost ? ` · about ${money(cost)}` : ""}` : "You're all set"}</p>
        </div>
        {left.length > 0 && <Button variant="secondary" icon={<Copy className="size-4" />} onClick={copy}>Copy list</Button>}
      </header>

      {plan && have.total > 0 && (
        <section className="card p-5 grid gap-3">
          <p className="text-[17px] font-semibold">You already have <span className="text-brand font-display text-[22px] font-extrabold">{Math.round(have.percent)}%</span> of what you need.</p>
          <div className="h-3 rounded-full bg-sunken overflow-hidden"><div className="h-full bg-brand rounded-full transition-all" style={{ width: `${have.percent}%` }} /></div>
          <p className="text-[13.5px] text-muted">{have.have} of {have.total} ingredients in your plan are already in your kitchen{cost > 0 && `. Estimated additional grocery cost: ${money(cost)}`}.</p>
        </section>
      )}

      <form onSubmit={add} className="card p-4 grid gap-2" noValidate>
        <label htmlFor="g-name" className="font-semibold text-[14px]">Add an item</label>
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_150px_auto] gap-2">
          <input id="g-name" className="input" placeholder="e.g. Coffee" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "g-error" : undefined} />
          <Button type="submit" icon={<Plus className="size-4" />} className="sm:order-last h-[50px]">Add</Button>
          <input aria-label="Quantity" className="input" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
          <select aria-label="Aisle" className="input" value={aisle} onChange={(e) => setAisle(e.target.value as Aisle | "auto")}>
            <option value="auto">Auto aisle</option>
            {AISLE_ORDER.map((a) => <option key={a} value={a}>{AISLES[a].label}</option>)}
          </select>
        </div>
        {error && <p id="g-error" role="alert" className="text-tomato text-[13px] font-medium">{error}</p>}
      </form>

      {grocery.length === 0 ? (
        <EmptyState emoji="🛒" title="Nothing to buy" text={plan ? "Your plan uses only what you have. Nice!" : "Missing ingredients from your meal plan show up here automatically."} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {groups.map(([a, items]) => (
            <section key={a} className="card px-4 py-2" aria-label={AISLES[a].label}>
              <h2 className="text-[16px] font-bold flex items-center gap-2 pt-3"><span aria-hidden>{AISLES[a].emoji}</span>{AISLES[a].label}<span className="text-muted font-sans font-medium text-[13px]">{items.filter((i) => !i.checked).length}</span></h2>
              <ul>
                {items.map((g) => (
                  <GroceryItemRow key={g.id} item={g} recipeNames={g.recipeIds.map((id) => recipes[id]?.name).filter(Boolean) as string[]}
                    onToggle={() => toggleGrocery(g.id)} onQuantity={(qv) => updateGrocery(g.id, { quantity: qv })} onRemove={() => removeGrocery(g.id)} />
                ))}
              </ul>
            </section>
          ))}
          {grocery.some((g) => g.checked) && (
            <div className="flex justify-end"><Button variant="ghost" icon={<ShoppingBasket className="size-4" />} onClick={clearCheckedGrocery}>Clear checked items</Button></div>
          )}
        </div>
      )}
    </div>
  );
}
