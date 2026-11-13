import { ArrowRight, Leaf, PiggyBank, Timer, ClipboardList, SlidersHorizontal, CalendarCheck } from "lucide-react";
import { navigate } from "../lib/router";
import { useKitchen } from "../store/useKitchen";
import { FoodArt } from "../components/FoodArt";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/Nav";

const DISHES = [
  { name: "Lemon Garlic Roast Chicken", emoji: "🍗", g: ["Lemons", "Garlic", "Carrots"] },
  { name: "Greek Yogurt Berry Bowl", emoji: "🍓", g: ["Blueberries", "Bananas", "Rolled oats"] },
  { name: "Chicken Fried Rice", emoji: "🍚", g: ["Eggs", "Frozen peas", "Green onions"] },
  { name: "Garden Veggie Omelet", emoji: "🍳", g: ["Tomatoes", "Bell pepper", "Spinach"] },
];

const STEPS = [
  { icon: ClipboardList, title: "Add your ingredients", text: "Type, speak or snap a photo of your fridge, freezer and pantry." },
  { icon: SlidersHorizontal, title: "Choose your preferences", text: "Days, meals, diet, allergies, time and budget. Takes 30 seconds." },
  { icon: CalendarCheck, title: "Get your personalized plan", text: "Meals that use what expires first, with a short grocery list for the rest." },
];

export function Landing() {
  const setOnboarded = useKitchen((s) => s.setOnboarded);
  const start = () => { setOnboarded(true); navigate("kitchen"); };
  const explore = () => { setOnboarded(true); navigate("home"); };

  return (
    <div className="min-h-full">
      <header className="gutter mx-auto max-w-6xl h-16 flex items-center justify-between">
        <Logo />
        <button type="button" onClick={explore} className="font-semibold text-[15px] text-muted hover:text-ink">See a sample kitchen</button>
      </header>

      <section className="gutter mx-auto max-w-6xl grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center pt-8 pb-16 md:pt-14 md:pb-24">
        <div className="grid grid-cols-1 gap-6 animate-fade-up">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft text-brand-deep px-3.5 py-1.5 text-[13.5px] font-semibold">
            <Leaf className="size-4" /> Cook what you have. Waste less.
          </span>
          <h1 className="text-[clamp(40px,6.4vw,72px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            Tell us what's in your fridge. <span className="text-brand">We'll tell you what to cook.</span>
          </h1>
          <p className="text-[18px] md:text-[19px] text-muted max-w-[46ch]">
            FridgeChef turns the food you already own into a practical meal plan, using whatever's about to expire first, so less ends up in the bin and more stays in your wallet.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={start} icon={<ArrowRight className="size-5 order-last" />}>Start Cooking</Button>
            <Button size="lg" variant="secondary" onClick={explore}>Explore the demo</Button>
          </div>
          <p className="text-[14px] text-muted">From open fridge to first meal idea in under two minutes.</p>
        </div>

        <div className="relative mx-auto w-full max-w-[540px]" aria-hidden>
          <div className="grid grid-cols-2 gap-4">
            {DISHES.map((d, i) => (
              <div key={d.name} className={i % 2 ? "mt-10 animate-float" : "animate-float"} style={{ animationDelay: `${i * 0.7}s` }}>
                <div className="card p-2.5">
                  <FoodArt name={d.name} emoji={d.emoji} garnishes={d.g} className="!rounded-[20px]" />
                  <p className="px-1.5 pt-2.5 pb-1 font-semibold text-[14px] truncate">{d.name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute -left-3 sm:-left-8 top-[42%] card px-4 py-3 shadow-lift flex items-center gap-3 animate-fade-up" style={{ animationDelay: ".3s" }}>
            <span className="text-2xl">🥬</span>
            <span><span className="block text-[12px] font-semibold text-tomato uppercase tracking-wide">Use soon</span><span className="font-semibold text-[14px]">Spinach · 2 days left</span></span>
          </div>
          <div className="absolute -right-2 sm:-right-6 bottom-6 card px-4 py-3 shadow-lift animate-fade-up" style={{ animationDelay: ".5s" }}>
            <span className="block font-display font-extrabold text-[26px] text-brand leading-none">94%</span>
            <span className="text-[12.5px] text-muted font-medium">of your food used this week</span>
          </div>
        </div>
      </section>

      <section className="bg-surface border-y border-line/70">
        <div className="gutter mx-auto max-w-6xl py-16 md:py-20 grid gap-10">
          <div className="grid gap-2 max-w-[40ch]">
            <p className="label">How it works</p>
            <h2 className="text-[32px] md:text-[40px] font-extrabold leading-tight">Three steps to dinner</h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-5">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-3xl bg-bg p-6 grid gap-3 content-start">
                <div className="flex items-center gap-3">
                  <span className="size-11 rounded-2xl bg-brand text-brand-ink grid place-items-center"><Icon className="size-5" /></span>
                  <span className="font-display font-extrabold text-[40px] text-line leading-none">{i + 1}</span>
                </div>
                <h3 className="text-[20px] font-bold">{title}</h3>
                <p className="text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="gutter mx-auto max-w-6xl py-16 md:py-20 grid md:grid-cols-3 gap-5">
        {[
          { icon: Leaf, t: "Less food waste", d: "Spinach that's wilting tomorrow gets cooked tonight. Every plan shows how much of your food it uses." },
          { icon: PiggyBank, t: "Save money", d: "Plans lean on what you own and keep the grocery list short, with an estimated total before you shop." },
          { icon: Timer, t: "Decide faster", d: "No more staring into the fridge. Pick a meal, follow it step by step, and leftovers carry into tomorrow." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="grid gap-2 content-start">
            <Icon className="size-7 text-brand" />
            <h3 className="text-[20px] font-bold">{t}</h3>
            <p className="text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="gutter mx-auto max-w-6xl pb-20">
        <div className="rounded-4xl bg-brand text-brand-ink px-6 py-12 md:px-14 md:py-16 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-[30px] md:text-[38px] font-extrabold leading-tight">What's in your fridge right now?</h2>
            <p className="opacity-85 mt-2 text-[17px]">Add it in a minute and get tonight's dinner idea.</p>
          </div>
          <button type="button" onClick={start} className="h-14 px-7 rounded-2xl bg-white text-[#14301f] font-bold text-[17px] inline-flex items-center gap-2 hover:scale-[1.02] transition">
            Start Cooking <ArrowRight className="size-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
