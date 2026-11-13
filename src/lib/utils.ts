import type { Ingredient } from "../types";

export const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 10);

export const cx = (...c: (string | number | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Crude singular form, good enough for matching "tomatoes" to "tomato". */
export const singular = (w: string) =>
  w.endsWith("ies") ? w.slice(0, -3) + "y" : w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("ses") ? w.slice(0, -2) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;

const words = (s: string) => norm(s).split(" ").filter(Boolean).map(singular);

/** True when every meaningful word of the shorter name appears in the longer one. */
export function namesMatch(a: string, b: string): boolean {
  const wa = words(a), wb = words(b);
  if (!wa.length || !wb.length) return false;
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return short.every((w) => long.includes(w));
}

export function findInventoryMatch(name: string, inventory: Ingredient[]): Ingredient | undefined {
  return inventory.find((i) => norm(i.name) === norm(name)) ?? inventory.find((i) => namesMatch(i.name, name));
}

export const listJoin = (a: string[]) =>
  a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export function formatQty(q: number) {
  if (Number.isInteger(q)) return String(q);
  const fractions: [number, string][] = [[0.25, "¼"], [0.333, "⅓"], [0.5, "½"], [0.667, "⅔"], [0.75, "¾"]];
  const whole = Math.floor(q), frac = q - whole;
  const f = fractions.find(([v]) => Math.abs(v - frac) < 0.04);
  return f ? `${whole || ""}${f[1]}` : q.toFixed(1);
}

/** Parses "1/2", "1 1/2", "0.5", "2" into a number. */
export function parseQty(s: string): number | null {
  const t = s.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[1] / +frac[2];
  const n = Number(t);
  return Number.isFinite(n) && t !== "" ? n : null;
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
