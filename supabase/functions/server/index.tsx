import { buildApp } from "./app.tsx";
import { SupabaseStore } from "./core/store.tsx";

Deno.serve(buildApp(new SupabaseStore()).fetch);
