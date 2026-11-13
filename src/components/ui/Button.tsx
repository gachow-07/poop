import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  full?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink shadow-[0_6px_16px_-6px_rgb(var(--brand)/0.6)] hover:brightness-110 active:brightness-95",
  secondary: "bg-surface text-ink border border-line hover:border-ink/25 hover:bg-sunken/60",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-tomato-soft text-tomato hover:brightness-95",
  soft: "bg-brand-soft text-brand-deep hover:brightness-95",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[14px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[15px] gap-2 rounded-2xl",
  lg: "h-14 px-7 text-[17px] gap-2.5 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, loading, full, className, children, disabled, type = "button", ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center font-semibold transition duration-150 select-none whitespace-nowrap",
        "disabled:opacity-50 disabled:pointer-events-none active:scale-[.98]",
        VARIANTS[variant], SIZES[size], full && "w-full", className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-[1.1em] animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("inline-grid place-items-center size-10 rounded-full text-muted hover:text-ink hover:bg-sunken transition active:scale-95 disabled:opacity-40", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
