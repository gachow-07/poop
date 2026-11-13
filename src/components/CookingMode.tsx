import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List, Pause, Play, RotateCcw, Timer, Volume2, X, PartyPopper } from "lucide-react";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { finishCooking } from "../store/actions";
import { canSpeak, prepareSpeech, speak, stopSpeaking } from "../lib/speech";
import { cx } from "../lib/utils";
import { Modal } from "./ui/Modal";
import { Button, IconButton } from "./ui/Button";

/** Full-screen, one-step-at-a-time cooking view with timers, read-aloud and a kitchen update at the end. */
export function CookingMode() {
  const id = useUI((s) => s.cookingId);
  const recipe = useKitchen((s) => (id ? s.recipes[id] : undefined));
  const close = () => { stopSpeaking(); useUI.getState().startCooking(null); };
  return (
    <Modal open={!!recipe?.details} onClose={close} title={`Cooking ${recipe?.name ?? ""}`} hideTitle size="full">
      {recipe?.details && <Cooking key={recipe.id} recipeId={recipe.id} onClose={close} />}
    </Modal>
  );
}

function useWakeLock() {
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { void lock?.release().catch(() => {}); };
  }, []);
}

function Cooking({ recipeId, onClose }: { recipeId: string; onClose(): void }) {
  const recipe = useKitchen((s) => s.recipes[recipeId])!;
  const inventory = useKitchen((s) => s.inventory);
  const toast = useUI((s) => s.toast);
  const steps = recipe.details!.steps;
  const [i, setI] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [done, setDone] = useState(false);
  const [speech, setSpeech] = useState(false);
  const [timer, setTimer] = useState<{ total: number; left: number; running: boolean } | null>(null);
  const used = recipe.ingredients.filter((g) => g.have && g.inventoryId && g.inventoryId !== "staple").map((g) => inventory.find((x) => x.id === g.inventoryId)).filter((x): x is NonNullable<typeof x> => !!x);
  const [toRemove, setToRemove] = useState<Set<string>>(() => new Set());
  const tick = useRef<number>();
  useWakeLock();

  useEffect(() => { prepareSpeech().then(() => setSpeech(canSpeak())); }, []);
  useEffect(() => { setTimer(steps[i]?.minutes ? { total: steps[i].minutes! * 60, left: steps[i].minutes! * 60, running: false } : null); }, [i, steps]);
  useEffect(() => {
    if (!timer?.running) return;
    tick.current = window.setInterval(() => setTimer((t) => {
      if (!t) return t;
      if (t.left <= 1) { toast({ text: "Timer done!", tone: "success" }); return { ...t, left: 0, running: false }; }
      return { ...t, left: t.left - 1 };
    }), 1000);
    return () => window.clearInterval(tick.current);
  }, [timer?.running, toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, steps.length]);

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progress = done ? 100 : ((i + 1) / steps.length) * 100;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <header className="gutter py-3 flex items-center gap-3 border-b border-line">
        <IconButton label="Exit cooking mode" onClick={onClose}><X className="size-5" /></IconButton>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold truncate">{recipe.name}</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-sunken overflow-hidden"><div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        </div>
        <Button size="sm" variant={showIngredients ? "soft" : "secondary"} icon={<List className="size-4" />} onClick={() => setShowIngredients((s) => !s)}>Ingredients</Button>
      </header>

      <div className="flex-1 overflow-y-auto gutter">
        <div className="mx-auto max-w-3xl py-8 md:py-14 grid gap-8">
          {showIngredients && (
            <ul className="card p-5 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 animate-fade-up">
              {recipe.ingredients.map((g) => <li key={g.name} className="text-[16px]"><b>{g.amount}</b> {g.name}{!g.have && <span className="text-muted"> (buy)</span>}</li>)}
            </ul>
          )}
          {!done ? (
            <div key={i} className="grid gap-6 animate-fade-up" aria-live="polite">
              <p className="label">Step {i + 1} of {steps.length}</p>
              <p className="font-display text-[clamp(26px,4.6vw,44px)] leading-[1.2] font-semibold">{steps[i].text}</p>
              <div className="flex flex-wrap gap-3">
                {timer && (
                  <div className="inline-flex items-center gap-3 rounded-2xl bg-surface border border-line p-2 pl-4">
                    <Timer className="size-5 text-brand" />
                    <span className="font-display font-bold text-[24px] num w-20">{mmss(timer.left)}</span>
                    <IconButton label={timer.running ? "Pause timer" : "Start timer"} className="bg-brand !text-brand-ink hover:!bg-brand" onClick={() => setTimer((t) => t && { ...t, running: !t.running, left: t.left || t.total })}>
                      {timer.running ? <Pause className="size-5" /> : <Play className="size-5" />}
                    </IconButton>
                    <IconButton label="Reset timer" onClick={() => setTimer((t) => t && { ...t, left: t.total, running: false })}><RotateCcw className="size-4" /></IconButton>
                  </div>
                )}
                {speech && <Button variant="secondary" icon={<Volume2 className="size-5" />} onClick={() => void speak(steps[i].text).catch(() => {})}>Read aloud</Button>}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 animate-fade-up">
              <PartyPopper className="size-12 text-[rgb(var(--saffron))]" />
              <h2 className="text-[clamp(28px,5vw,44px)] font-extrabold">Enjoy your {recipe.name}!</h2>
              {used.length > 0 ? (
                <div className="card p-5 grid gap-3">
                  <h3 className="text-[18px] font-bold">Update your kitchen</h3>
                  <p className="text-muted text-[14.5px]">Tick anything you used up, and FridgeChef removes it from your kitchen.</p>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {used.map((item) => (
                      <li key={item.id}>
                        <label className={cx("flex items-center gap-3 rounded-2xl border p-3 cursor-pointer", toRemove.has(item.id) ? "border-brand bg-brand-soft" : "border-line")}>
                          <input type="checkbox" className="size-5 accent-[rgb(var(--brand))]" checked={toRemove.has(item.id)}
                            onChange={() => setToRemove((s) => { const n = new Set(s); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} />
                          <span className="font-medium">{item.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <footer className="gutter py-3 border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl flex gap-3">
          {!done ? (
            <>
              <Button size="lg" variant="secondary" icon={<ChevronLeft className="size-5" />} disabled={i === 0} onClick={() => setI(i - 1)}>Back</Button>
              {i < steps.length - 1
                ? <Button size="lg" full onClick={() => setI(i + 1)}>Next step <ChevronRight className="size-5" /></Button>
                : <Button size="lg" full onClick={() => setDone(true)}>I'm done</Button>}
            </>
          ) : (
            <Button size="lg" full onClick={() => {
              finishCooking(recipe.id, [...toRemove]);
              toast({ text: toRemove.size ? `Nice! Removed ${toRemove.size} used item${toRemove.size === 1 ? "" : "s"} from your kitchen.` : "Nice cooking!", tone: "success" });
              onClose();
            }}>{toRemove.size ? `Remove ${toRemove.size} & finish` : "Finish"}</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
