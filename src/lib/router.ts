import { useEffect, useState } from "react";

export type Route = "welcome" | "home" | "kitchen" | "plan" | "recipes" | "grocery";
const ROUTES: Route[] = ["welcome", "home", "kitchen", "plan", "recipes", "grocery"];

const read = (): Route | null => {
  const h = location.hash.replace(/^#/, "") as Route;
  return ROUTES.includes(h) ? h : null;
};

export function navigate(route: Route) {
  if (location.hash !== `#${route}`) location.hash = route;
  window.scrollTo({ top: 0 });
}

/** Hash routing (plain #names) so every view can be bookmarked, including inside an artifact. */
export function useRoute(fallback: Route): Route {
  const [route, setRoute] = useState<Route>(() => read() ?? fallback);
  useEffect(() => {
    const on = () => setRoute(read() ?? fallback);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [fallback]);
  return route;
}
