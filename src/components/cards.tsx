import { useState, type ReactNode } from "react";
import { Check, Clock, Flame, Heart, Minus, Pencil, Plus, Repeat2, ShieldAlert, Trash2, Leaf, X } from "lucide-react";
import type { GroceryItem, Ingredient, Recipe } from "../types";
import { CATEGORIES, LOCATIONS, MEAL_TYPES } from "../data/categories";
import { emojiFor } from "../data/catalog";
import { cx, formatQty, money } from "../lib/utils";
import { totalMinutes } from "../lib/metrics";
import { FoodArt } from "./FoodArt";
import { FreshnessBadge } from "./ui/feedback";
import { IconButton } from "./ui/Button";

// ---------------------------------------------------------------- ingredient

export function IngredientCard({ item, showLocation, onEdit, onUsed, onDelete, onQty }: {
  item: Ingredient; showLocation?: boolean;
  onEdit(): void; onUsed(): void; onDelete(): void; onQty(delta: number): void;
}) {
  return (
    <article className="card p-3.5 flex gap-3 items-start animate-fade-up">
      <div className="size-12 shrink-0 rounded-2xl bg-sunken grid place-items-center text-[24px]" aria-hidden>
        {emojiFor(item.name) === "🍽️" ? CATEGORIES[item.category].emoji : emojiFor(item.name)}
      </div>
      <div className="min-w-0 flex-1 grid grid-cols-1 gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-sans font-semibold text-[15.5px] leading-tight truncate">{item.name}</h4>
            <p className="text-[13px] text-muted truncate">
              {showLocation && <>{LOCATIONS[item.location].label} · </>}
              {item.opened && <>Opened · </>}
              {item.notes || CATEGORIES[item.category].label}
            </p>
          </div>
          <FreshnessBadge item={item} />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-xl bg-sunken">
            <IconButton label={`Less ${item.name}`} className="size-9" onClick={() => onQty(-1)}><Minus className="size-4" /></IconButton>
            <span className="min-w-[72px] text-center text-[14px] font-semibold num">{formatQty(item.quantity)} {item.unit}</span>
            <IconButton label={`More ${item.name}`} className="size-9" onClick={() => onQty(1)}><Plus className="size-4" /></IconButton>
          </div>
          <div className="flex items-center">
            <button type="button" onClick={onUsed} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-[13.5px] font-semibold text-brand-deep bg-brand-soft hover:brightness-95">
              <Check className="size-4" /> Used
            </button>
            <IconButton label={`Edit ${item.name}`} onClick={onEdit}><Pencil className="size-4" /></IconButton>
            <IconButton label={`Delete ${item.name}`} onClick={onDelete} className="hover:text-tomato"><Trash2 className="size-4" /></IconButton>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- recipe

export function RecipeMeta({ recipe, className }: { recipe: Recipe; className?: string }) {
  return (
    <p className={cx("flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted", className)}>
      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{totalMinutes(recipe)} min</span>
      <span className="inline-flex items-center gap-1"><Flame className="size-3.5" />{recipe.nutrition.calories} kcal</span>
      <span className="font-semibold text-ink/80">{recipe.nutrition.protein}g protein</span>
    </p>
  );
}

export function RecipeCard({ recipe, favorite, onOpen, onFavorite, footer }: {
  recipe: Recipe; favorite?: boolean; onOpen(): void; onFavorite?(): void; footer?: ReactNode;
}) {
  const need = recipe.ingredients.filter((i) => !i.have).length;
  return (
    <article className="card overflow-hidden group animate-fade-up flex flex-col">
      <div className="relative">
        <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Open ${recipe.name}`}>
          <FoodArt name={recipe.name} emoji={recipe.emoji} garnishes={recipe.ingredients.map((i) => i.name)} className="rounded-none transition duration-300 group-hover:scale-[1.03]" />
        </button>
        {onFavorite && (
          <button type="button" onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? "Remove from favorites" : "Save to favorites"}
            className="absolute top-3 right-3 size-10 grid place-items-center rounded-full bg-white/90 text-[#1d2b22] shadow-card backdrop-blur hover:scale-105 transition">
            <Heart className={cx("size-[18px]", favorite && "fill-tomato text-tomato")} />
          </button>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 text-[#1d2b22] px-2.5 py-1 text-[12px] font-semibold backdrop-blur">
          {MEAL_TYPES[recipe.mealType].emoji} {MEAL_TYPES[recipe.mealType].label}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="text-left p-4 grid gap-2 flex-1 content-start">
        <h3 className="text-[18px] font-bold leading-snug">{recipe.name}</h3>
        <RecipeMeta recipe={recipe} />
        <div className="flex flex-wrap gap-1.5">
          {recipe.allergyFlags.length > 0 && <Tag tone="danger"><ShieldAlert className="size-3.5" />Contains {recipe.allergyFlags.join(", ")}</Tag>}
          {recipe.usesExpiring.length > 0 && <Tag tone="warn"><Leaf className="size-3.5" />Rescues food</Tag>}
          <Tag tone={need ? "neutral" : "good"}>{need ? `${need} to buy` : "Have everything"}</Tag>
          {recipe.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
      </button>
      {footer && <div className="px-4 pb-4">{footer}</div>}
    </article>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const t = { neutral: "bg-sunken text-muted", good: "bg-fresh-soft text-fresh", warn: "bg-saffron-soft text-ink", danger: "bg-tomato-soft text-tomato" }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", t)}>{children}</span>;
}

// ---------------------------------------------------------------- meal slot

export function MealCard({ recipe, mealLabel, onOpen, dragging }: { recipe: Recipe; mealLabel: string; onOpen(): void; dragging?: boolean }) {
  const leftoverFrom = recipe.leftovers?.from;
  const makes = recipe.leftovers?.makes;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "w-full text-left rounded-2xl bg-surface border border-line/70 p-2.5 flex gap-3 items-center transition",
        "hover:shadow-card hover:border-line focus-visible:shadow-card",
        dragging && "shadow-lift rotate-[1.5deg] scale-[1.02]",
        recipe.allergyFlags.length && "border-tomato/60 bg-tomato-soft/40",
      )}
    >
      <FoodArt name={recipe.name} emoji={recipe.emoji} size="sm" />
      <span className="min-w-0 flex-1 grid gap-0.5">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{mealLabel}</span>
        <span className="font-semibold leading-snug text-[15px] line-clamp-2">{recipe.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="size-3" />{totalMinutes(recipe)} min</span>
          {recipe.allergyFlags.length > 0 && <span className="text-tomato font-semibold inline-flex items-center gap-1"><ShieldAlert className="size-3" />Allergen</span>}
          {leftoverFrom && <span className="text-brand-deep font-semibold inline-flex items-center gap-1"><Repeat2 className="size-3" />Leftovers</span>}
          {!leftoverFrom && makes && <span className="text-brand-deep font-semibold inline-flex items-center gap-1"><Repeat2 className="size-3" />Makes extra</span>}
          {recipe.usesExpiring.length > 0 && <span className="text-[rgb(var(--saffron))] font-semibold inline-flex items-center gap-1"><Leaf className="size-3" />Rescue</span>}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- grocery

export function GroceryItemRow({ item, recipeNames, onToggle, onQuantity, onRemove }: {
  item: GroceryItem; recipeNames: string[]; onToggle(): void; onQuantity(q: string): void; onRemove(): void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.quantity);
  const save = () => { setEditing(false); if (draft.trim() !== item.quantity) onQuantity(draft.trim()); };
  return (
    <li className="flex items-center gap-3 py-3 border-b border-line/70 last:border-0">
      <button type="button" role="checkbox" aria-checked={item.checked} aria-label={`${item.checked ? "Uncheck" : "Check off"} ${item.name}`} onClick={onToggle}
        className={cx("size-7 shrink-0 rounded-full border-2 grid place-items-center transition", item.checked ? "bg-brand border-brand text-brand-ink" : "border-line hover:border-brand")}>
        {item.checked && <Check className="size-4" strokeWidth={3} />}
      </button>
      <span className="text-[22px]" aria-hidden>{emojiFor(item.name) === "🍽️" ? "🛒" : emojiFor(item.name)}</span>
      <div className="min-w-0 flex-1">
        <p className={cx("font-semibold text-[15.5px] leading-tight", item.checked && "line-through text-muted")}>{item.name}</p>
        <p className="text-[13px] text-muted truncate">{item.custom ? "Added by you" : `For ${recipeNames.join(", ")}`}</p>
      </div>
      {editing ? (
        <input autoFocus aria-label={`Quantity of ${item.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(item.quantity); setEditing(false); } }}
          className="input !py-1.5 !px-2.5 w-28 text-[14px]" />
      ) : (
        <button type="button" onClick={() => { setDraft(item.quantity); setEditing(true); }} title="Edit quantity"
          className="text-[14px] font-medium text-ink/80 rounded-lg px-2 py-1 hover:bg-sunken max-w-[9rem] truncate">{item.quantity || "Add qty"}</button>
      )}
      {item.estCost != null && <span className="hidden sm:inline text-[13.5px] text-muted num w-14 text-right">{money(item.estCost)}</span>}
      <IconButton label={`Remove ${item.name}`} onClick={onRemove}><X className="size-4" /></IconButton>
    </li>
  );
}

// ---------------------------------------------------------------- dashboard

export function Widget({ label, value, sub, icon, tone = "default", onClick }: {
  label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode; tone?: "default" | "warn" | "good"; onClick?(): void;
}) {
  const iconTone = { default: "bg-brand-soft text-brand-deep", warn: "bg-tomato-soft text-tomato", good: "bg-fresh-soft text-fresh" }[tone];
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick}
      className={cx("card p-4 md:p-5 text-left grid gap-3 content-between min-h-[132px]", onClick && "hover:shadow-lift transition")}>
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <span className={cx("size-9 rounded-xl grid place-items-center", iconTone)} aria-hidden>{icon}</span>
      </div>
      <div>
        <div className="font-display text-[28px] md:text-[32px] font-bold leading-none num">{value}</div>
        {sub && <div className="text-[13.5px] text-muted mt-1.5">{sub}</div>}
      </div>
    </Comp>
  );
}
