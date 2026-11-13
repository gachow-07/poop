import { memo } from "react";
import { cx } from "../lib/utils";
import { emojiFor } from "../data/catalog";

// Illustrated "plate" artwork for dishes. Artifacts can't load outside photos, so every dish
// gets a consistent, generated image: a tinted backdrop, a plate, the dish and a few garnishes.
const PALETTES = [
  ["#FFE3BF", "#FFB46B", "#F28C38"], // saffron
  ["#DDF1D3", "#9ED38B", "#4E9E5E"], // herb
  ["#FFDCD3", "#FF9E8A", "#E2563F"], // tomato
  ["#FBE6C8", "#E9B77E", "#B97A3E"], // toast
  ["#F3E2F7", "#D3A4E3", "#9A5BB0"], // berry
  ["#D6EEF2", "#8FCFD9", "#3A8E9C"], // sea
  ["#FFF0B8", "#F4CF4E", "#C99A17"], // lemon
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SIZES = {
  xs: { box: "size-12 rounded-2xl", plate: 0.78, dish: "text-[22px]", garnish: "" },
  sm: { box: "size-16 rounded-2xl", plate: 0.78, dish: "text-[28px]", garnish: "" },
  md: { box: "w-full aspect-[4/3] rounded-3xl", plate: 0.62, dish: "text-[clamp(40px,9vw,64px)]", garnish: "text-[22px]" },
  lg: { box: "w-full aspect-[16/10] rounded-3xl", plate: 0.56, dish: "text-[clamp(56px,12vw,96px)]", garnish: "text-[30px]" },
};

export const FoodArt = memo(function FoodArt({ name, emoji, garnishes = [], size = "md", className }: {
  name: string; emoji: string; garnishes?: string[]; size?: keyof typeof SIZES; className?: string;
}) {
  const h = hash(name);
  const [light, mid, deep] = PALETTES[h % PALETTES.length];
  const s = SIZES[size];
  const g = [...new Set(garnishes.map(emojiFor))].filter((e) => e !== emoji && e !== "🍽️").slice(0, 3);
  const spots = [["8%", "10%", -12], ["78%", "12%", 14], ["70%", "70%", -8]] as const;
  return (
    <div
      role="img"
      aria-label={`Illustration of ${name}`}
      className={cx("relative overflow-hidden isolate shrink-0", s.box, className)}
      style={{
        background: `radial-gradient(120% 90% at 20% 15%, ${light} 0%, ${mid} 55%, ${deep} 130%)`,
      }}
    >
      <div className="absolute inset-0 opacity-[.18]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1.2px, transparent 1.3px)", backgroundSize: "14px 14px" }} />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center"
        style={{
          width: `${s.plate * 100}%`, aspectRatio: "1",
          maxHeight: `${s.plate * 100 * 1.25}%`,
          background: "radial-gradient(circle at 50% 45%, #ffffff 0%, #fbfbf9 58%, #ecebe6 59%, #ffffff 66%, #f1f0ea 100%)",
          boxShadow: `0 12px 24px -10px ${deep}aa, inset 0 -3px 6px rgba(0,0,0,.06)`,
        }}
      >
        <span className={cx(s.dish, "leading-none drop-shadow-[0_6px_6px_rgba(0,0,0,.18)] select-none")} aria-hidden>{emoji}</span>
      </div>
      {s.garnish && g.map((e, i) => (
        <span key={i} aria-hidden className={cx(s.garnish, "absolute leading-none select-none drop-shadow-[0_3px_3px_rgba(0,0,0,.15)]")}
          style={{ left: spots[i][0], top: spots[i][1], transform: `rotate(${spots[i][2]}deg)` }}>{e}</span>
      ))}
    </div>
  );
});
