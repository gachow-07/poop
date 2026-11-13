import { useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { runSurprise } from "../store/actions";
import { friendlyError, AIError } from "../ai/provider";
import { useUI } from "../store/useUI";
import { useKitchen } from "../store/useKitchen";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Banner } from "./ui/feedback";

const LINES = ["Peeking in the fridge…", "Checking what expires first…", "Pairing flavours…", "Plating it up…"];

/** "Surprise me": asks for one creative dish from what's on hand, then opens it. */
export function SurpriseModal() {
  const open = useUI((s) => s.surpriseOpen);
  const setOpen = useUI((s) => s.setSurpriseOpen);
  const openRecipe = useUI((s) => s.openRecipe);
  const empty = useKitchen((s) => !s.inventory.length);
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  const go = () => {
    setError(""); setLine(0);
    abort.current = new AbortController();
    runSurprise(abort.current.signal)
      .then((r) => { setOpen(false); openRecipe(r.id); })
      .catch((e) => { if (!(e instanceof AIError && e.code === "cancelled")) setError(friendlyError(e)); });
  };

  useEffect(() => {
    if (!open) { abort.current?.abort(); return; }
    if (empty) { setError("Add a few ingredients to your kitchen first."); return; }
    go();
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 2200);
    return () => clearInterval(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Surprise me">
      <div className="grid justify-items-center text-center gap-4 py-6">
        {!error ? (
          <>
            <div className="size-24 rounded-3xl bg-saffron-soft grid place-items-center animate-float"><Dices className="size-12 text-[rgb(var(--saffron))]" /></div>
            <p className="font-display text-[22px] font-bold" aria-live="polite">{LINES[line]}</p>
            <p className="text-muted max-w-[40ch]">Inventing something new with what you already have, favouring food that needs using up.</p>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <Banner tone="danger">{error}</Banner>
            {!empty && <Button onClick={go} icon={<Dices className="size-5" />}>Try again</Button>}
          </>
        )}
      </div>
    </Modal>
  );
}
