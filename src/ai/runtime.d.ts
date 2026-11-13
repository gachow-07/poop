// Minimal typings for the Claude artifact runtime (window.claude), used only when
// FridgeChef runs as a Claude artifact. Absent everywhere else.
interface ClaudeSampleError { code: string; message?: string; text?: string }

interface ClaudeSample {
  (input: string, options?: {
    onText?: (u: { text: string; delta: string }) => void;
    signal?: AbortSignal;
    images?: Blob | Blob[];
    modelTier?: "quick" | "default" | "complex";
    cache?: boolean;
  }): Promise<{ text: string; truncated: boolean }>;
  limits(): Promise<{ images?: { maxCount: number; mediaTypes: string[] } }>;
}

interface ClaudeDictation {
  start(): Promise<void>;
  stop(): Promise<void>;
  onPartial(h: (e: { text: string }) => void): () => void;
  onFinal(h: (e: { text: string }) => void): () => void;
  onState(h: (e: { state: string; reason?: string }) => void): () => void;
}

interface ClaudeTts {
  speak(text: string): Promise<void>;
  stop(): void;
}

interface Window {
  claude?: {
    use(name: "sample"): Promise<ClaudeSample | null>;
    use(name: "dictation"): Promise<ClaudeDictation | null>;
    use(name: "tts"): Promise<ClaudeTts | null>;
  };
}
