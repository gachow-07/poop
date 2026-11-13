import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "../../lib/utils";
import { IconButton } from "./Button";

interface ModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  /** Visually hide the title (it stays as the accessible name). */
  hideTitle?: boolean;
  size?: "md" | "lg" | "full";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Accessible modal built on <dialog>: focus is trapped, Esc closes, background is inert.
 * Slides up as a bottom sheet on phones, centres as a card on larger screens.
 */
export function Modal({ open, onClose, title, hideTitle, size = "md", children, footer, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const width = size === "full" ? "md:w-full md:max-w-none md:h-full md:max-h-none md:rounded-none" : size === "lg" ? "md:w-[min(92vw,880px)]" : "md:w-[min(92vw,600px)]";
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cx(
        "p-0 bg-surface text-ink shadow-lift border-0 overflow-hidden",
        size === "full"
          ? "m-0 w-full h-full max-w-none max-h-none rounded-none"
          : "mb-0 mt-auto w-full max-w-full max-h-[94dvh] rounded-t-[28px] md:m-auto md:rounded-4xl",
        width,
      )}
    >
      {open && (
        <div className={cx("flex flex-col animate-pop", size === "full" ? "h-full" : "max-h-[94dvh]", className)}>
          {!hideTitle && (
            <header className="flex items-center justify-between gap-3 gutter pt-5 pb-3 md:px-7">
              <h2 className="text-[22px] font-bold">{title}</h2>
              <IconButton label="Close" onClick={onClose}><X className="size-5" /></IconButton>
            </header>
          )}
          <div className={cx("flex-1 min-h-0 overflow-y-auto overscroll-contain", size === "full" && "flex flex-col", !hideTitle && "gutter md:px-7 pb-6")}>{children}</div>
          {footer && (
            <footer className="gutter md:px-7 pt-3 border-t border-line bg-surface" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}>
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
