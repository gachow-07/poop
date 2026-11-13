import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { useUI } from "../../store/useUI";
import { cx } from "../../lib/utils";
import { FRESHNESS_META, freshness } from "../../lib/freshness";
import { relativeExpiry } from "../../lib/dates";
import type { Ingredient } from "../../types";

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="fixed z-[60] inset-x-0 flex flex-col items-center gap-2 pointer-events-none gutter bottom-[calc(88px+env(safe-area-inset-bottom,0px))] md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto animate-fade-up flex items-center gap-3 max-w-md w-full md:w-auto rounded-2xl bg-ink text-bg px-4 py-3 shadow-lift">
          {t.tone === "error" ? <AlertCircle className="size-5 shrink-0 text-tomato" /> : t.tone === "success" ? <CheckCircle2 className="size-5 shrink-0 text-fresh" /> : null}
          <span className="text-[14.5px] font-medium flex-1">{t.text}</span>
          {t.action && (
            <button type="button" className="font-bold text-[14px] underline underline-offset-2" onClick={() => { t.action!.run(); dismiss(t.id); }}>{t.action.label}</button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card p-8 md:p-12 text-center grid justify-items-center gap-3 animate-fade-up">
      <div className="text-5xl" aria-hidden>{emoji}</div>
      <h3 className="text-[20px] font-bold">{title}</h3>
      <p className="text-muted max-w-[42ch]">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function FreshnessBadge({ item, compact }: { item: Ingredient; compact?: boolean }) {
  const f = freshness(item);
  const m = FRESHNESS_META[f.status];
  return (
    <span className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap", m.bg, m.text)}>
      <span className={cx("size-2 rounded-full", m.dot)} aria-hidden />
      {compact || !item.expiresOn ? m.label : relativeExpiry(item.expiresOn).replace(/^expires /, "")}
    </span>
  );
}

export function Banner({ tone = "info", children, action }: { tone?: "info" | "warn" | "danger"; children: ReactNode; action?: ReactNode }) {
  const styles = { info: "bg-brand-soft text-ink", warn: "bg-saffron-soft text-ink", danger: "bg-tomato-soft text-ink" }[tone];
  return (
    <div className={cx("rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[14.5px]", styles)}>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Ring({ value, size = 76, label }: { value: number; size?: number; label: string }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--brand))" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value / 100)))} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-bold text-[19px] num">{Math.round(value)}%</span>
    </div>
  );
}
