// Voice in (dictation) and voice out (read steps aloud). Uses the Claude artifact runtime when present,
// otherwise the browser's Web Speech APIs. Both are optional: the UI hides the controls when unsupported.

export interface Listener {
  start(handlers: { onPartial(text: string): void; onFinal(text: string): void; onEnd(error?: string): void }): void;
  stop(): void;
}

let dictation: ClaudeDictation | null = null;
let tts: ClaudeTts | null = null;
let ready: Promise<void> | null = null;

/** Resolve runtime capabilities early: dictation must start synchronously inside a click. */
export function prepareSpeech(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      if (import.meta.env.VITE_AI_MODE !== "artifact" || !window.claude) return;
      [dictation, tts] = await Promise.all([
        window.claude.use("dictation").catch(() => null),
        window.claude.use("tts").catch(() => null),
      ]);
    })();
  }
  return ready;
}

type SR = { start(): void; stop(): void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const BrowserSR = (): (new () => SR) | undefined =>
  (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

export function getListener(): Listener | null {
  if (dictation) {
    const d = dictation;
    let offs: (() => void)[] = [];
    return {
      start(h) {
        offs.forEach((o) => o()); offs = [];
        offs.push(d.onPartial((e) => h.onPartial(e.text)));
        offs.push(d.onFinal((e) => h.onFinal(e.text)));
        offs.push(d.onState((e) => { if (e.state === "idle") { h.onEnd(e.reason && !["stopped", "viewer_stopped"].includes(e.reason) ? e.reason : undefined); offs.forEach((o) => o()); offs = []; } }));
        d.start().catch((e: { code?: string }) => h.onEnd(e?.code ?? "upstream_error"));
      },
      stop() { void d.stop(); },
    };
  }
  if (import.meta.env.VITE_AI_MODE === "artifact") return null;
  const Ctor = BrowserSR();
  if (!Ctor) return null;
  let rec: SR | null = null;
  return {
    start(h) {
      rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language || "en-US";
      rec.onresult = (e) => {
        let partial = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) h.onFinal(" " + r[0].transcript); else partial += r[0].transcript;
        }
        h.onPartial(partial);
      };
      rec.onerror = (e) => h.onEnd(e.error);
      rec.onend = () => h.onEnd();
      rec.start();
    },
    stop() { rec?.stop(); },
  };
}

export function canSpeak(): boolean {
  return !!tts || (import.meta.env.VITE_AI_MODE !== "artifact" && "speechSynthesis" in window);
}

export async function speak(text: string): Promise<void> {
  if (tts) return tts.speak(text.slice(0, 2000));
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}

export function stopSpeaking() {
  if (tts) tts.stop();
  else if ("speechSynthesis" in window) speechSynthesis.cancel();
}
