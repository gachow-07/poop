import { useMemo, useState } from "react";
import { Dices, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import type { Difficulty } from "../types";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { cx, norm, plural } from "../lib/utils";
import { totalMinutes } from "../lib/metrics";
import { RecipeCard } from "../components/cards";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/controls";
import { EmptyState } from "../components/ui/feedback";

interface Filters {
  maxTime: number | null; maxCal: number | null; minProtein: number | null;
  cuisine: string; difficulty: Difficulty | ""; ingredient: string; tags: string[]; favorites: boolean;
}
const NONE: Filters = { maxTime: null, maxCal: null, minProtein: null, cuisine: "", difficulty: "", ingredient: "", tags: [], favorites: false };

/** Every recipe FridgeChef has generated for you, searchable and filterable. */
export function Recipes() {
  const recipes = useKitchen((s) => s.recipes);
  const favorites = useKitchen((s) => s.favorites);
  const toggleFavorite = useKitchen((s) => s.toggleFavorite);
  const { openRecipe, setSurpriseOpen } = useUI.getState();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filters>(NONE);
  const [showFilters, setShowFilters] = useState(false);

  const all = useMemo(() => Object.values(recipes).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [recipes]);
  const cuisines = useMemo(() => [...new Set(all.map((r) => r.cuisine))].sort(), [all]);
  const tags = useMemo(() => [...new Set(all.flatMap((r) => r.tags))].sort(), [all]);

  const results = useMemo(() => {
    const n = norm(q), ing = norm(f.ingredient);
    return all.filter((r) =>
      (!n || norm(`${r.name} ${r.description} ${r.cuisine} ${r.tags.join(" ")} ${r.ingredients.map((i) => i.name).join(" ")}`).includes(n)) &&
      (f.maxTime == null || totalMinutes(r) <= f.maxTime) &&
      (f.maxCal == null || r.nutrition.calories <= f.maxCal) &&
      (f.minProtein == null || r.nutrition.protein >= f.minProtein) &&
      (!f.cuisine || r.cuisine === f.cuisine) &&
      (!f.difficulty || r.difficulty === f.difficulty) &&
      (!ing || r.ingredients.some((i) => norm(i.name).includes(ing))) &&
      f.tags.every((t) => r.tags.includes(t)) &&
      (!f.favorites || favorites.includes(r.id)));
  }, [all, q, f, favorites]);

  const active = Object.entries(f).filter(([k, v]) => k !== "favorites" && (Array.isArray(v) ? v.length : v !== null && v !== "")).length;
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const pick = <K extends "maxTime" | "maxCal" | "minProtein">(k: K, v: number) => set(k, f[k] === v ? null : v);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-extrabold leading-tight">Recipes</h1>
          <p className="text-muted">{plural(all.length, "recipe")} made for your kitchen · {favorites.length} saved</p>
        </div>
        <Button variant="soft" icon={<Dices className="size-4" />} onClick={() => setSurpriseOpen(true)}>Surprise me</Button>
      </header>

      <div className="grid gap-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search recipes</span>
            <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-10" placeholder="Search recipes, ingredients or cuisines" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Button variant={showFilters || active ? "soft" : "secondary"} icon={<SlidersHorizontal className="size-4" />} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            Filters{active ? ` · ${active}` : ""}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip selected={f.favorites} onClick={() => set("favorites", !f.favorites)} icon={<Heart className="size-3.5" />}>Favorites</Chip>
          <Chip selected={f.maxTime === 30} onClick={() => pick("maxTime", 30)}>Under 30 min</Chip>
          <Chip selected={f.minProtein === 30} onClick={() => pick("minProtein", 30)}>30g+ protein</Chip>
          {active > 0 && <button type="button" onClick={() => setF({ ...NONE, favorites: f.favorites })} className="h-10 px-3 text-[14px] font-semibold text-muted hover:text-ink inline-flex items-center gap-1"><X className="size-4" />Clear filters</button>}
        </div>

        {showFilters && (
          <div className="card p-5 grid gap-5 animate-fade-up">
            <FilterRow label="Time">{[15, 30, 45].map((m) => <Chip key={m} selected={f.maxTime === m} onClick={() => pick("maxTime", m)}>≤ {m} min</Chip>)}</FilterRow>
            <FilterRow label="Calories">{[400, 600, 800].map((c) => <Chip key={c} selected={f.maxCal === c} onClick={() => pick("maxCal", c)}>≤ {c} kcal</Chip>)}</FilterRow>
            <FilterRow label="Protein">{[20, 30, 40].map((p) => <Chip key={p} selected={f.minProtein === p} onClick={() => pick("minProtein", p)}>{p}g+</Chip>)}</FilterRow>
            <FilterRow label="Difficulty">{(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => <Chip key={d} selected={f.difficulty === d} onClick={() => set("difficulty", f.difficulty === d ? "" : d)}>{d}</Chip>)}</FilterRow>
            {cuisines.length > 0 && <FilterRow label="Cuisine">{cuisines.map((c) => <Chip key={c} selected={f.cuisine === c} onClick={() => set("cuisine", f.cuisine === c ? "" : c)}>{c}</Chip>)}</FilterRow>}
            {tags.length > 0 && <FilterRow label="Diet & style">{tags.map((t) => <Chip key={t} selected={f.tags.includes(t)} onClick={() => set("tags", f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t])}>{t}</Chip>)}</FilterRow>}
            <div className="grid gap-1.5 max-w-sm">
              <label htmlFor="ing-filter" className="label">Uses ingredient</label>
              <input id="ing-filter" className="input" placeholder="e.g. spinach" value={f.ingredient} onChange={(e) => set("ingredient", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {all.length === 0 ? (
        <EmptyState emoji="📖" title="No recipes yet" text="Recipes from your meal plans, rescues and surprises collect here so you can find them again."
          action={<Button onClick={() => useUI.getState().setPrefsOpen(true)}>Plan some meals</Button>} />
      ) : results.length === 0 ? (
        <EmptyState emoji="🔎" title="No matches" text="Try fewer filters or a different search." action={<Button variant="secondary" onClick={() => { setF(NONE); setQ(""); }}>Reset</Button>} />
      ) : (
        <div className={cx("grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
          {results.map((r) => <RecipeCard key={r.id} recipe={r} favorite={favorites.includes(r.id)} onFavorite={() => toggleFavorite(r.id)} onOpen={() => openRecipe(r.id)} />)}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
