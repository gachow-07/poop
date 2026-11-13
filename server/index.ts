// FridgeChef API server: keeps the Anthropic API key on the server and streams model text to the browser.
//   npm run server        (needs ANTHROPIC_API_KEY, or an `ant auth login` profile)
// In development Vite proxies /api to this server; in production it also serves the built app from ./dist.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.FRIDGECHEF_MODEL ?? "claude-opus-5-5";
const DIST = join(process.cwd(), "dist");
const client = new Anthropic();

type ImageMedia = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
interface Body { prompt?: unknown; images?: { data: string; mediaType: string }[]; tier?: "quick" | "default" }

const MEDIA = new Set<ImageMedia>(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function readJSON(req: http.IncomingMessage, limit = 25 * 1024 * 1024): Promise<Body> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJSON(res: http.ServerResponse, status: number, body: object) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handleAI(req: http.IncomingMessage, res: http.ServerResponse) {
  let body: Body;
  try { body = await readJSON(req); } catch (e) {
    return sendJSON(res, (e as { status?: number }).status ?? 400, { error: "Invalid request body", code: "upstream_error" });
  }
  if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 200_000) {
    return sendJSON(res, 400, { error: "prompt is required", code: "upstream_error" });
  }
  const images = (body.images ?? []).filter((i) => MEDIA.has(i.mediaType as ImageMedia)).slice(0, 4);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...images.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.mediaType as ImageMedia, data: i.data } })),
    { type: "text", text: body.prompt },
  ];

  const abort = new AbortController();
  res.on("close", () => { if (!res.writableEnded) abort.abort(); });

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" });
  try {
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 64000,
        // Short structured tasks (parsing a list) need little thinking; plans and recipes get the default.
        output_config: { effort: body.tier === "quick" ? "low" : "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: [{ role: "user", content }],
      },
      { signal: abort.signal },
    );
    stream.on("text", (delta) => res.write(delta));
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") res.write("\n[[FRIDGECHEF_ERROR:refused]]");
    res.end();
  } catch (err) {
    if (abort.signal.aborted) return;
    const code = err instanceof Anthropic.RateLimitError ? "rate_limited"
      : err instanceof Anthropic.AuthenticationError ? "unavailable"
      : err instanceof Anthropic.APIConnectionError ? "network"
      : !(err instanceof Anthropic.APIError) && /api.?key|auth|credential/i.test(String((err as Error)?.message)) ? "unavailable"
      : "upstream_error";
    console.error("[fridgechef] model error:", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    res.write(`\n[[FRIDGECHEF_ERROR:${code}]]`);
    res.end();
  }
}

const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  for (const candidate of [join(DIST, path), join(DIST, "index.html")]) {
    if (!candidate.startsWith(DIST)) continue;
    try {
      const data = await readFile(candidate);
      res.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
      return res.end(data);
    } catch { /* try next */ }
  }
  res.writeHead(404).end("Not found. Run `npm run build` first, or use `npm run dev`.");
}

http
  .createServer((req, res) => {
    if (req.url === "/api/health") return sendJSON(res, 200, { ok: true, model: MODEL });
    if (req.url === "/api/ai" && req.method === "POST") return void handleAI(req, res);
    if (req.method === "GET") return void serveStatic(req, res);
    res.writeHead(405).end();
  })
  .listen(PORT, () => console.log(`FridgeChef server on http://localhost:${PORT} (model ${MODEL})`));
