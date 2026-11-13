import type { Category, Ingredient } from "../types";
import { daysUntil } from "./dates";

export type Freshness = "expired" | "expiring" | "soon" | "fresh" | "undated";

const PERISHABLE: Category[] = ["meat", "seafood", "dairy", "vegetables", "fruits", "bakery"];

export const isPerishable = (i: Ingredient) => i.location === "fridge" || PERISHABLE.includes(i.category) && i.location !== "freezer";

export function freshness(i: Ingredient): { status: Freshness; days: number | null } {
  if (!i.expiresOn) return { status: "undated", days: null };
  const d = daysUntil(i.expiresOn);
  if (d < 0) return { status: "expired", days: d };
  if (d <= 1) return { status: "expiring", days: d };
  if (d <= 4) return { status: "soon", days: d };
  return { status: "fresh", days: d };
}

export const needsUsingSoon = (i: Ingredient) => {
  const s = freshness(i).status;
  return s === "expiring" || s === "soon" || s === "expired";
};

/** Higher = cook it sooner. Used to order the "Use it before it's gone" list and the AI prompt. */
export function urgency(i: Ingredient): number {
  const { days } = freshness(i);
  let score = days == null ? (isPerishable(i) ? 2 : 0) : Math.max(0, 14 - days);
  if (i.opened) score += 2;
  if (isPerishable(i)) score += 1;
  return score;
}

export const FRESHNESS_META: Record<Freshness, { label: string; dot: string; text: string; bg: string }> = {
  expired: { label: "Expired", dot: "bg-tomato", text: "text-tomato", bg: "bg-tomato-soft" },
  expiring: { label: "Expiring", dot: "bg-tomato", text: "text-tomato", bg: "bg-tomato-soft" },
  soon: { label: "Use soon", dot: "bg-saffron", text: "text-[rgb(var(--ink))]", bg: "bg-saffron-soft" },
  fresh: { label: "Fresh", dot: "bg-fresh", text: "text-fresh", bg: "bg-fresh-soft" },
  undated: { label: "No date", dot: "bg-line", text: "text-muted", bg: "bg-sunken" },
};
