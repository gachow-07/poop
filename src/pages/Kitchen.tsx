import { useMemo, useState } from "react";
import { Camera, Mic, Plus, Search, ListPlus, Receipt } from "lucide-react";
import type { Category, StorageLocation } from "../types";
import { CATEGORIES, CATEGORY_ORDER, LOCATIONS } from "../data/categories";
import { QUICK_ADD, lookupCatalog } from "../data/catalog";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { addDays, todayISO } from "../lib/dates";
import { freshness, urgency } from "../lib/freshness";
import { cx, norm, plural } from "../lib/utils";
import { IngredientCard } from "../components/cards";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/controls";
import { EmptyState } from "../components/ui/feedback";

type Sort = "expiry" | "name" | "recent";

export function Kitchen() {
  const inventory = useKitchen((s) => s.inventory);
  const { addIngredients, removeIngredient, adjustQuantity, markUsed } = useKitchen.getState();
  const { openIngredientForm, openBulkAdd, toast } = useUI.getState();
  const [loc, setLoc] = useState<StorageLocation | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("expiry");

  const counts = useMemo(() => ({
    all: inventory.length,
    fridge: inventory.filter((i) => i.location === "fridge").length,
    freezer: inventory.filter((i) => i.location === "freezer").length,
    pantry: inventory.filter((i) => i.location === "pantry").length,
  }), [inventory]);

  const status = useMemo(() => {
    const s = { fresh: 0, soon: 0, expiring: 0 };
    for (const i of inventory) {
      const f = freshness(i).status;
      if (f === "soon") s.soon++; else if (f === "expiring" || f === "expired") s.expiring++; else s.fresh++;
    }
    return s;
  }, [inventory]);

  const visible = useMemo(() => {
    const n = norm(q);
    const list = inventory.filter((i) => (loc === "all" || i.location === loc) && (!n || norm(i.name).includes(n) || norm(CATEGORIES[i.category].label).includes(n)));
    const sorted = [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? b.addedAt.localeCompare(a.addedAt) : urgency(b) - urgency(a) || a.name.localeCompare(b.name));
    const groups = new Map<Category, typeof list>();
    for (const c of CATEGORY_ORDER) groups.set(c, []);
    for (const i of sorted) groups.get(i.category)!.push(i);
    return [...groups.entries()].filter(([, items]) => items.length);
  }, [inventory, loc, q, sort]);

  const have = new Set(inventory.map((i) => norm(i.name)));
  const quick = QUICK_ADD.filter((n) => !have.has(norm(n))).slice(0, 10);

  const quickAdd = (name: string) => {
    const c = lookupCatalog(name);
    if (!c) return;
    addIngredients([{ name: c.name, quantity: 1, unit: c.unit, category: c.category, location: c.location, expiresOn: c.keeps ? addDays(todayISO(), c.keeps) : undefined }]);
    toast({ text: `Added ${c.name}. Tap it to set the amount.`, tone: "success" });
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-extrabold leading-tight">My Kitchen</h1>
          <p className="text-muted">{plural(inventory.length, "ingredient")} ·{" "}
            <span className="text-fresh font-semibold">🟢 {status.fresh} fresh</span> ·{" "}
            <span className="font-semibold">🟡 {status.soon} use soon</span> ·{" "}
            <span className="text-tomato font-semibold">🔴 {status.expiring} expiring</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<ListPlus className="size-4" />} onClick={() => openBulkAdd("type")}>Add several</Button>
          <Button icon={<Plus className="size-4" />} onClick={() => openIngredientForm()}>Add ingredient</Button>
        </div>
      </header>

      {/* Capture shortcuts */}
      <section className="grid grid-cols-3 gap-2.5" aria-label="Quick capture">
        {[
          { icon: Mic, label: "Say it", sub: "“I have eggs, rice…”", tab: "voice" as const },
          { icon: Camera, label: "Snap fridge", sub: "Photo → ingredients", tab: "photo" as const },
          { icon: Receipt, label: "Scan receipt", sub: "Add what you bought", tab: "receipt" as const },
        ].map(({ icon: Icon, label, sub, tab }) => (
          <button key={tab} type="button" onClick={() => openBulkAdd(tab)} className="card p-3.5 md:p-4 text-left grid gap-2 hover:shadow-lift transition">
            <span className="size-10 rounded-2xl bg-brand-soft text-brand-deep grid place-items-center"><Icon className="size-5" /></span>
            <span><span className="block font-semibold text-[15px]">{label}</span><span className="block text-[12.5px] text-muted leading-snug hidden sm:block">{sub}</span></span>
          </button>
        ))}
      </section>

      {quick.length > 0 && (
        <section className="grid grid-cols-1 gap-2" aria-label="Quick add">
          <p className="label">Quick add</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
            {quick.map((n) => (
              <button key={n} type="button" onClick={() => quickAdd(n)}
                className="snap-start shrink-0 h-10 pl-2.5 pr-3.5 rounded-full border border-line bg-surface text-[14px] font-medium inline-flex items-center gap-1.5 hover:border-brand hover:bg-brand-soft transition">
                <span aria-hidden>{lookupCatalog(n)?.emoji}</span>{n}<Plus className="size-3.5 text-muted" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Storage tabs + search */}
      <section className="grid gap-3">
        <div role="tablist" aria-label="Storage" className="grid grid-cols-4 gap-2">
          {(["all", "fridge", "freezer", "pantry"] as const).map((l) => (
            <button key={l} type="button" role="tab" aria-selected={loc === l} onClick={() => setLoc(l)}
              className={cx("rounded-2xl p-3 text-left transition border", loc === l ? "bg-ink text-bg border-ink" : "bg-surface border-line hover:border-ink/30")}>
              <span className="block text-[20px]" aria-hidden>{l === "all" ? "🏠" : LOCATIONS[l].emoji}</span>
              <span className="block font-semibold text-[14px] md:text-[15px]">{l === "all" ? "All" : LOCATIONS[l].label}</span>
              <span className={cx("block text-[12.5px] num", loc === l ? "opacity-75" : "text-muted")}>{counts[l]} items</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="relative flex-1 min-w-[200px]">
            <span className="sr-only">Search your kitchen</span>
            <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-10" placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Segmented<Sort> size="sm" label="Sort" value={sort} onChange={setSort} options={[{ value: "expiry", label: "Use first" }, { value: "name", label: "A–Z" }, { value: "recent", label: "Newest" }]} />
        </div>
      </section>

      {inventory.length === 0 ? (
        <EmptyState emoji="🧺" title="Your kitchen is empty" text="Add what's in your fridge, freezer and pantry. Type a list, say it out loud, or snap a photo."
          action={<Button onClick={() => openBulkAdd("type")} icon={<ListPlus className="size-4" />}>Add ingredients</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState emoji="🔎" title="Nothing matches" text={q ? `No ingredients match “${q}”.` : `Nothing in your ${LOCATIONS[loc as StorageLocation].label.toLowerCase()} yet.`}
          action={<Button variant="secondary" onClick={() => { setQ(""); setLoc("all"); }}>Show everything</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-7">
          {visible.map(([cat, items]) => (
            <section key={cat} className="grid grid-cols-1 gap-3" aria-label={CATEGORIES[cat].label}>
              <h2 className="text-[18px] font-bold flex items-center gap-2"><span aria-hidden>{CATEGORIES[cat].emoji}</span>{CATEGORIES[cat].label}<span className="text-muted font-sans font-medium text-[14px]">{items.length}</span></h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((i) => (
                  <IngredientCard key={i.id} item={i} showLocation={loc === "all"}
                    onEdit={() => openIngredientForm(i)}
                    onUsed={() => { markUsed(i.id); toast({ text: `Marked ${i.name} as used.`, tone: "success", action: { label: "Undo", run: () => useKitchen.getState().restoreIngredient(i, true) } }); }}
                    onDelete={() => { removeIngredient(i.id); toast({ text: `Removed ${i.name}.`, action: { label: "Undo", run: () => useKitchen.getState().restoreIngredient(i, false) } }); }}
                    onQty={(d) => adjustQuantity(i.id, d)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
