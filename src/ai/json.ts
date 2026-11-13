/** Reads one JSON value from model text: the whole text, a fenced block, or the outermost {...} / [...]. */
export function extractJSON(text: string): unknown {
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* fall through */ } }
  const starts = [t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) return undefined;
  const start = Math.min(...starts);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (end <= start) return undefined;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return undefined; }
}

/**
 * Incremental JSON Lines reader. Feed it the whole text so far; it returns objects
 * from lines it hasn't seen yet. Call `flush` at the end for the final line.
 */
export function createLineReader() {
  let consumed = 0;
  const parseLine = (line: string) => {
    const s = line.trim().replace(/^```(json)?/, "").replace(/```$/, "").trim();
    if (!s.startsWith("{")) return undefined;
    try { return JSON.parse(s) as unknown; } catch { return undefined; }
  };
  return {
    feed(text: string): unknown[] {
      const lines = text.split("\n");
      const complete = lines.slice(consumed, lines.length - 1);
      consumed = Math.max(consumed, lines.length - 1);
      return complete.map(parseLine).filter((x) => x !== undefined);
    },
    flush(text: string): unknown[] {
      const lines = text.split("\n");
      const rest = lines.slice(consumed);
      consumed = lines.length;
      return rest.map(parseLine).filter((x) => x !== undefined);
    },
  };
}
