import { useEffect } from "react";
import { useRoute } from "./lib/router";
import { useKitchen } from "./store/useKitchen";
import { prepareSpeech } from "./lib/speech";
import { getProvider } from "./ai/provider";
import { BottomNav, TopNav } from "./components/Nav";
import { Toasts } from "./components/ui/feedback";
import { IngredientForm } from "./components/IngredientForm";
import { BulkAdd } from "./components/BulkAdd";
import { RecipeModal } from "./components/RecipeModal";
import { CookingMode } from "./components/CookingMode";
import { PreferencesForm } from "./components/PreferencesForm";
import { SurpriseModal } from "./components/SurpriseModal";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Kitchen } from "./pages/Kitchen";
import { Plan } from "./pages/Plan";
import { Recipes } from "./pages/Recipes";
import { Grocery } from "./pages/Grocery";

export default function App() {
  const onboarded = useKitchen((s) => s.onboarded);
  const route = useRoute(onboarded ? "home" : "welcome");

  useEffect(() => {
    // Warm up optional capabilities early so the first tap on a mic or "Plan" button is instant.
    void getProvider();
    void prepareSpeech();
  }, []);

  if (route === "welcome") return <><Landing /><Toasts /></>;

  return (
    <div className="min-h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:rounded-xl">Skip to content</a>
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 bg-bg" style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <TopNav route={route} />
      <main id="main" className="gutter mx-auto max-w-6xl pt-6 md:pt-10 pb-[calc(110px+env(safe-area-inset-bottom,0px))] md:pb-16">
        {route === "home" && <Dashboard />}
        {route === "kitchen" && <Kitchen />}
        {route === "plan" && <Plan />}
        {route === "recipes" && <Recipes />}
        {route === "grocery" && <Grocery />}
      </main>
      <BottomNav route={route} />
      <IngredientForm />
      <BulkAdd />
      <PreferencesForm />
      <RecipeModal />
      <CookingMode />
      <SurpriseModal />
      <Toasts />
    </div>
  );
}
