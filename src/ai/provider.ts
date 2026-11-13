// The one place that knows HOW we talk to a model. Everything else calls `complete()`.
//  - "artifact": inside a Claude artifact, via the viewer's own Claude access (window.claude).
//  - "server":   a normal web deployment, via POST /api/ai (see server/index.ts).

export interface CompleteOptions {
  images?: Blob[];
  /** Receives the WHOLE text so far each time more arrives. */
  onText?: (text: string) => void;
  signal?: AbortSignal;
  tier?: "quick" | "default";
}

export interface AIProvider {
  kind: "artifact" | "server";
  canSeeImages: boolean;
  complete(prompt: string, opts?: CompleteOptions): Promise<string>;
}

export type AIErrorCode =
  | "unavailable" | "not_granted" | "cancelled" | "rate_limited" | "refused"
  | "invalid_output" | "network" | "upstream_error";

export class AIError extends Error {
  constructor(public code: AIErrorCode, message?: string, public partial?: string) {
    super(message ?? code);
  }
}

export function friendlyError(e: unknown): string {
  const code = e instanceof AIError ? e.code : "upstream_error";
  switch (code) {
    case "unavailable": return "Meal planning needs an AI connection. Open FridgeChef inside Claude, or start the FridgeChef server.";
    case "not_granted": return "FridgeChef wasn't allowed to use Claude. You can allow it from this page's permissions menu.";
    case "cancelled": return "Stopped.";
    case "rate_limited": return "You've hit a usage limit for now. Try again in a little while.";
    case "refused": return "The AI couldn't help with that request. Try changing your notes or preferences.";
    case "invalid_output": return "The AI's answer came back garbled. Please try again.";
    case "network": return "Couldn't reach the FridgeChef server. Check your connection and try again.";
    default: return "Something went wrong while cooking up ideas. Please try again.";
  }
}

const PERMANENT = new Set(["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"]);

function artifactProvider(sample: ClaudeSample, canSeeImages: boolean): AIProvider {
  return {
    kind: "artifact",
    canSeeImages,
    async complete(prompt, opts = {}) {
      try {
        const res = await sample(prompt, {
          onText: opts.onText ? ({ text }) => opts.onText!(text) : undefined,
          signal: opts.signal,
          images: opts.images?.length ? opts.images : undefined,
          modelTier: opts.tier ?? "default",
          cache: false,
        });
        return res.text;
      } catch (err) {
        const e = err as ClaudeSampleError;
        const code: AIErrorCode =
          e?.code === "cancelled" ? "cancelled"
          : PERMANENT.has(e?.code) ? "not_granted"
          : e?.code === "rate_limited" ? "rate_limited"
          : e?.code === "refused" ? "refused"
          : "upstream_error";
        throw new AIError(code, e?.message, e?.text);
      }
    },
  };
}

async function toBase64(blob: Blob): Promise<{ data: string; mediaType: string }> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: btoa(bin), mediaType: blob.type || "image/jpeg" };
}

function serverProvider(endpoint: string): AIProvider {
  return {
    kind: "server",
    canSeeImages: true,
    async complete(prompt, opts = {}) {
      const images = opts.images?.length ? await Promise.all(opts.images.map(toBase64)) : undefined;
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt, images, tier: opts.tier ?? "default" }),
          signal: opts.signal,
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") throw new AIError("cancelled");
        throw new AIError("network");
      }
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new AIError((body.code as AIErrorCode) ?? (res.status === 429 ? "rate_limited" : "upstream_error"), body.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          opts.onText?.(text);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") throw new AIError("cancelled", undefined, text);
        throw new AIError("network", undefined, text);
      }
      // The server appends an error marker if the model stream fails part-way.
      const marker = text.lastIndexOf("\n[[FRIDGECHEF_ERROR:");
      if (marker >= 0) {
        const code = text.slice(marker + 20).replace(/\]\]\s*$/, "") as AIErrorCode;
        throw new AIError(code || "upstream_error", undefined, text.slice(0, marker));
      }
      return text;
    },
  };
}

let cached: Promise<AIProvider | null> | null = null;

/** Resolves the provider for this build, or null when no AI is reachable. */
export function getProvider(): Promise<AIProvider | null> {
  if (cached) return cached;
  cached = (async () => {
    if (import.meta.env.VITE_AI_MODE === "artifact") {
      const sample = await window.claude?.use("sample").catch(() => null);
      if (!sample) return null;
      const limits = await sample.limits().catch(() => null);
      return artifactProvider(sample, !!limits?.images);
    }
    return serverProvider(import.meta.env.VITE_AI_ENDPOINT ?? "/api/ai");
  })();
  return cached;
}

export async function requireProvider(): Promise<AIProvider> {
  const p = await getProvider();
  if (!p) throw new AIError("unavailable");
  return p;
}
