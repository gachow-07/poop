const DAY = 86_400_000;

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => toISO(new Date());

export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => toISO(new Date(fromISO(iso).getTime() + n * DAY));

/** Whole days from today until the date (negative when past). */
export const daysUntil = (iso: string) => Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / DAY);

export const weekday = (iso: string, style: "long" | "short" = "long") =>
  fromISO(iso).toLocaleDateString(undefined, { weekday: style });

export const shortDate = (iso: string) =>
  fromISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function relativeExpiry(iso: string): string {
  const d = daysUntil(iso);
  if (d < -1) return `expired ${-d} days ago`;
  if (d === -1) return "expired yesterday";
  if (d === 0) return "expires today";
  if (d === 1) return "expires tomorrow";
  if (d < 14) return `expires in ${d} days`;
  return `expires ${shortDate(iso)}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
