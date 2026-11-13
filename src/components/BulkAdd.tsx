import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Mic, MicOff, Receipt, Trash2, Sparkles } from "lucide-react";
import type { StorageLocation } from "../types";
import { LOCATIONS } from "../data/categories";
import { parseIngredientsFromImage, parseIngredientsLocally, parseIngredientsWithAI, type ParsedItem } from "../ai/mealPlanner";
import { friendlyError, getProvider } from "../ai/provider";
import { todayISO, daysUntil, addDays } from "../lib/dates";
import { cx, plural } from "../lib/utils";
import { getListener, prepareSpeech, type Listener } from "../lib/speech";
import { useKitchen } from "../store/useKitchen";
import { useUI } from "../store/useUI";
import { Modal } from "./ui/Modal";
import { Button, IconButton } from "./ui/Button";
import { Banner } from "./ui/feedback";

type Tab = "type" | "voice" | "photo" | "receipt";
const TABS: { id: Tab; label: string; icon: typeof Keyboard }[] = [
  { id: "type", label: "Type", icon: Keyboard },
  { id: "voice", label: "Speak", icon: Mic },
  { id: "photo", label: "Fridge photo", icon: Camera },
  { id: "receipt", label: "Receipt", icon: Receipt },
];

export function BulkAdd() {
  const { open, tab: initialTab } = useUI((s) => s.bulkAdd);
  const close = useUI((s) => s.closeBulkAdd);
  const toast = useUI((s) => s.toast);
  const add = useKitchen((s) => s.addIngredients);
  const [tab, setTab] = useState<Tab>("type");
  const [text, setText] = useState("");
  const [partial, setPartial] = useState("");
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [canImages, setCanImages] = useState(false);
  const [listener, setListener] = useState<Listener | null>(null);
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab ?? "type"); setText(""); setPartial(""); setItems(null); setError(""); setBusy(false);
    getProvider().then((p) => setCanImages(!!p?.canSeeImages));
    prepareSpeech().then(() => setListener(getListener()));
  }, [open, initialTab]);

  useEffect(() => () => { abort.current?.abort(); listener?.stop(); }, [listener]);

  const parseText = async (input: string) => {
    if (!input.trim()) { setError("Type or say a few ingredients first."); return; }
    setBusy(true); setError("");
    abort.current = new AbortController();
    try {
      const provider = await getProvider();
      // Typed lists parse instantly on-device; the AI cleans up messier input when it's available.
      const local = parseIngredientsLocally(input, todayISO());
      const looksMessy = tab === "voice" || input.length > 160 || local.some((i) => i.name.split(" ").length > 4);
      const result = provider && looksMessy ? await parseIngredientsWithAI(input, todayISO(), abort.current.signal).catch(() => local) : local;
      if (!result.length) setError("Couldn't find any ingredients in that. Try something like “6 eggs, 1 lb ground beef, spinach”.");
      else setItems(result);
    } finally { setBusy(false); }
  };

  const parseImage = async (f: File, kind: "fridge" | "receipt") => {
    setBusy(true); setError("");
    abort.current = new AbortController();
    try {
      const result = await parseIngredientsFromImage(f, kind, todayISO(), abort.current.signal);
      if (!result.length) setError(kind === "receipt" ? "Couldn't read any food items on that receipt. Try a sharper, flatter photo." : "Couldn't spot food in that photo. Try one with better light, or type items instead.");
      else setItems(result);
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };

  const toggleListening = () => {
    if (!listener) return;
    if (listening) { listener.stop(); return; }
    setError(""); setListening(true);
    listener.start({
      onPartial: setPartial,
      onFinal: (t) => { setText((prev) => (prev ? prev + t : t.trimStart())); setPartial(""); },
      onEnd: (err) => { setListening(false); setPartial(""); if (err && err !== "aborted" && err !== "no-speech") setError(err === "not_granted" || err === "not-allowed" ? "Microphone access was blocked. You can type your ingredients instead." : "Voice input stopped. You can try again or type instead."); },
    });
  };

  const confirm = () => {
    if (!items?.length) return;
    add(items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, category: i.category, location: i.location, expiresOn: i.expiresOn })));
    toast({ text: `Added ${plural(items.length, "ingredient")} to your kitchen.`, tone: "success" });
    close();
  };

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => setItems((list) => list!.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <Modal open={open} onClose={() => { abort.current?.abort(); listener?.stop(); close(); }} title={items ? "Check your ingredients" : "Add several ingredients"} size="lg"
      footer={items ? (
        <div className="flex gap-2 justify-between">
          <Button variant="ghost" onClick={() => setItems(null)}>Back</Button>
          <Button onClick={confirm} disabled={!items.length}>Add {plural(items.length, "item")}</Button>
        </div>
      ) : undefined}>
      {!items ? (
        <div className="grid gap-5">
          <div role="tablist" aria-label="How to add" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(""); }}
                className={cx("h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[13.5px] font-semibold transition",
                  tab === id ? "border-brand bg-brand-soft text-brand-deep" : "border-line hover:border-ink/30")}>
                <Icon className="size-5" />{label}
              </button>
            ))}
          </div>

          {(tab === "type" || tab === "voice") && (
            <div className="grid gap-3">
              {tab === "voice" && (
                listener ? (
                  <div className="grid justify-items-center gap-3 py-2">
                    <button type="button" onClick={toggleListening} aria-pressed={listening}
                      className={cx("size-24 rounded-full grid place-items-center transition shadow-lift", listening ? "bg-tomato text-white animate-pulse" : "bg-brand text-brand-ink hover:scale-105")}>
                      {listening ? <MicOff className="size-9" /> : <Mic className="size-9" />}
                      <span className="sr-only">{listening ? "Stop listening" : "Start listening"}</span>
                    </button>
                    <p className="text-muted text-center">{listening ? "Listening… say everything you have." : "Tap and say: “I have chicken, eggs, rice, broccoli, cheese and tortillas.”"}</p>
                  </div>
                ) : <Banner tone="warn">Voice input isn't supported in this browser. Type your list below instead.</Banner>
              )}
              <label htmlFor="bulk-text" className="font-semibold text-[14px]">{tab === "voice" ? "What we heard" : "Everything you have"}</label>
              <textarea id="bulk-text" className="input min-h-[140px] resize-y" value={text + (partial ? ` ${partial}` : "")}
                onChange={(e) => setText(e.target.value)} placeholder={"6 eggs, 2 chicken breasts, 1 lb ground beef\n3 tomatoes, 1/2 bag spinach, 1 cup rice\nonion, tortillas, shredded cheese, milk, bread"} />
              <Button size="lg" onClick={() => parseText(text)} loading={busy} icon={<Sparkles className="size-5" />}>Find ingredients</Button>
            </div>
          )}

          {(tab === "photo" || tab === "receipt") && (
            canImages ? (
              <div className="grid gap-4 justify-items-center text-center py-4">
                <div className="text-6xl" aria-hidden>{tab === "photo" ? "📸" : "🧾"}</div>
                <p className="text-muted max-w-[44ch]">{tab === "photo" ? "Open your fridge and snap a photo. FridgeChef spots what's inside and lists it for you to check." : "Take a photo of your grocery receipt and FridgeChef adds the food you bought."}</p>
                <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Choose a photo"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void parseImage(f, tab === "photo" ? "fridge" : "receipt"); }} />
                <Button size="lg" loading={busy} icon={<Camera className="size-5" />} onClick={() => file.current?.click()}>{busy ? "Looking closely…" : tab === "photo" ? "Take or choose a photo" : "Scan a receipt"}</Button>
              </div>
            ) : <Banner tone="warn">Photo scanning needs an AI connection that can see images. You can type or speak your list instead.</Banner>
          )}
          {error && <Banner tone="danger">{error}</Banner>}
          <p className="text-[13px] text-muted">Barcode scanning isn't available yet. For packaged food, type the name or snap the receipt.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-muted text-[14.5px] mb-1">Fix anything that's wrong, then add them all at once.</p>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1.6fr)_70px_90px_120px_110px_auto] gap-2 items-center p-2.5 rounded-2xl bg-sunken">
              <input aria-label="Name" className="input !py-2 col-span-1" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
              <IconButton label={`Remove ${it.name}`} className="sm:order-last" onClick={() => setItems((l) => l!.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></IconButton>
              <div className="col-span-2 sm:col-span-1 sm:contents grid grid-cols-4 gap-2">
                <input aria-label="Quantity" className="input !py-2 !px-2.5" inputMode="decimal" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })} />
                <input aria-label="Unit" className="input !py-2 !px-2.5" value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                <select aria-label="Stored in" className="input !py-2 !px-2.5" value={it.location} onChange={(e) => updateItem(idx, { location: e.target.value as StorageLocation })}>
                  {(Object.keys(LOCATIONS) as StorageLocation[]).map((l) => <option key={l} value={l}>{LOCATIONS[l].label}</option>)}
                </select>
                <select aria-label="Keeps for" className="input !py-2 !px-2.5" value={it.expiresOn ? String(daysUntil(it.expiresOn)) : ""}
                  onChange={(e) => updateItem(idx, { expiresOn: e.target.value ? addDays(todayISO(), Number(e.target.value)) : undefined })}>
                  <option value="">No date</option>
                  {[1, 2, 3, 5, 7, 10, 14, 21, 30].map((d) => <option key={d} value={d}>{d === 1 ? "1 day" : `${d} days`}</option>)}
                  {it.expiresOn && ![1, 2, 3, 5, 7, 10, 14, 21, 30].includes(daysUntil(it.expiresOn)) && <option value={daysUntil(it.expiresOn)}>{daysUntil(it.expiresOn)} days</option>}
                </select>
              </div>
            </div>
          ))}
          {!items.length && <p className="text-muted text-center py-6">Nothing left to add.</p>}
        </div>
      )}
    </Modal>
  );
}
