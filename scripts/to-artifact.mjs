// Turns the single-file Vite build into the page shape a Claude artifact expects:
// no <!doctype>/<html>/<head>/<body> of its own (the artifact host adds them), <title> first.
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("dist-artifact/index.html", "utf8");
const head = src.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const body = src.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? "";
const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? "<title>FridgeChef</title>";
const rest = head
  .replace(/<title>[\s\S]*?<\/title>/i, "")
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "");
// Keep <title>, metas and font links first (the title must sit in the first 8KB), then styles and scripts.
const lines = rest.split(/(?=<script|<style)/i);
const small = lines.filter((l) => !/^<script|^<style/i.test(l.trim())).join("");
const big = lines.filter((l) => /^<script|^<style/i.test(l.trim())).join("\n");
writeFileSync("dist-artifact/fridgechef.html", `${title}\n${small.trim()}\n${body.trim()}\n${big}\n`);
console.log("wrote dist-artifact/fridgechef.html");
