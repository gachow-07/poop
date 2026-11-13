import { CalendarDays, Home, Refrigerator, ShoppingBasket, BookOpen, Dices } from "lucide-react";
import { navigate, type Route } from "../lib/router";
import { cx } from "../lib/utils";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { Button } from "./ui/Button";

const ITEMS: { route: Route; label: string; icon: typeof Home }[] = [
  { route: "home", label: "Home", icon: Home },
  { route: "kitchen", label: "Kitchen", icon: Refrigerator },
  { route: "plan", label: "Meal Plan", icon: CalendarDays },
  { route: "recipes", label: "Recipes", icon: BookOpen },
  { route: "grocery", label: "Grocery", icon: ShoppingBasket },
];

export function Logo({ onClick }: { onClick?(): void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 font-display font-extrabold text-[21px] tracking-tight">
      <span className="size-9 rounded-[12px] bg-brand text-brand-ink grid place-items-center text-[18px] shadow-[0_6px_14px_-6px_rgb(var(--brand)/0.7)]" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 13.9V20h12v-6.1" /><path d="M18 14a4 4 0 0 0 1-7.9 5 5 0 0 0-9.6-1.4A4 4 0 0 0 6 13.9" /><path d="M10 17h4" />
        </svg>
      </span>
      Fridge<span className="text-brand -ml-1.5">Chef</span>
    </button>
  );
}

export function TopNav({ route }: { route: Route }) {
  const groceryCount = useKitchen((s) => s.grocery.filter((g) => !g.checked).length);
  const setSurprise = useUI((s) => s.setSurpriseOpen);
  return (
    <header className="sticky z-40 bg-bg/85 backdrop-blur-md border-b border-line/60" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto max-w-6xl h-16 flex items-center justify-between gap-4">
        <Logo onClick={() => navigate("home")} />
        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {ITEMS.map(({ route: r, label }) => (
            <a key={r} href={`#${r}`} aria-current={route === r ? "page" : undefined}
              className={cx("relative h-10 px-4 rounded-xl inline-flex items-center font-semibold text-[15px] transition",
                route === r ? "text-ink bg-sunken" : "text-muted hover:text-ink")}>
              {label}
              {r === "grocery" && groceryCount > 0 && <span className="ml-1.5 min-w-5 h-5 px-1 rounded-full bg-brand text-brand-ink text-[11px] grid place-items-center num">{groceryCount}</span>}
            </a>
          ))}
        </nav>
        <Button size="sm" variant="soft" icon={<Dices className="size-4" />} onClick={() => setSurprise(true)}>Surprise me</Button>
      </div>
    </header>
  );
}

export function BottomNav({ route }: { route: Route }) {
  const groceryCount = useKitchen((s) => s.grocery.filter((g) => !g.checked).length);
  return (
    <nav aria-label="Main" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line gutter"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <ul className="grid grid-cols-5 max-w-lg mx-auto">
        {ITEMS.map(({ route: r, label, icon: Icon }) => {
          const active = route === r;
          return (
            <li key={r}>
              <a href={`#${r}`} aria-current={active ? "page" : undefined}
                className={cx("relative flex flex-col items-center justify-center gap-0.5 h-[64px] text-[11px] font-semibold transition", active ? "text-brand" : "text-muted")}>
                <span className={cx("grid place-items-center h-8 w-14 rounded-full transition", active && "bg-brand-soft")}>
                  <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
                {r === "grocery" && groceryCount > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-22px)] min-w-[18px] h-[18px] px-1 rounded-full bg-tomato text-white text-[10px] grid place-items-center num">{groceryCount}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
