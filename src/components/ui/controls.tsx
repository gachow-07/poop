import type { ReactNode } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { cx } from "../../lib/utils";

/** Toggleable pill. */
export function Chip({ selected, onClick, children, tone = "brand", icon, className }: {
  selected?: boolean; onClick?(): void; children: ReactNode; tone?: "brand" | "danger"; icon?: ReactNode; className?: string;
}) {
  const on = tone === "danger" ? "bg-tomato text-white border-tomato" : "bg-brand text-brand-ink border-brand";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-[14px] font-medium transition active:scale-[.97]",
        selected ? on : "bg-surface border-line text-ink hover:border-ink/30",
        className,
      )}
    >
      {selected ? <Check className="size-3.5" strokeWidth={3} /> : icon}
      {children}
    </button>
  );
}

/** Single choice from a few options, shown as a pill row. */
export function Segmented<T extends string | number>({ value, onChange, options, label, size = "md" }: {
  value: T; onChange(v: T): void; options: { value: T; label: string }[]; label: string; size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-sunken">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-xl font-semibold transition",
            size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]",
            value === o.value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, id }: {
  checked: boolean; onChange(v: boolean): void; label: string; description?: string; id: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block font-semibold text-[15px]">{label}</span>
        {description && <span className="block text-[13.5px] text-muted mt-0.5">{description}</span>}
      </span>
      <span className="relative shrink-0 mt-0.5">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block w-12 h-7 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25" />
        <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Stepper({ value, onChange, min = 1, max = 12, label, format = String }: {
  value: number; onChange(v: number): void; min?: number; max?: number; label: string; format?(v: number): string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-2xl bg-sunken p-1">
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}
        className="size-10 grid place-items-center rounded-xl bg-surface shadow-card disabled:opacity-40 active:scale-95"><Minus className="size-4" /></button>
      <output className="min-w-[88px] text-center font-semibold num" aria-live="polite">{format(value)}</output>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}
        className="size-10 grid place-items-center rounded-xl bg-surface shadow-card disabled:opacity-40 active:scale-95"><Plus className="size-4" /></button>
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={cx("grid gap-1.5 min-w-0", className)}>
      <label htmlFor={htmlFor} className="text-[14px] font-semibold">{label}</label>
      {children}
      {error ? <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-tomato font-medium">{error}</p>
        : hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-bold">{title}</h3>
          {description && <p className="text-[14px] text-muted mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
