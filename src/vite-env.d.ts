/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_AI_MODE: "artifact" | "server";
  readonly VITE_AI_ENDPOINT?: string;
}
