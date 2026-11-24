import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import type { Store } from "./core/store.tsx";
import type { AppEnv } from "./core/types.tsx";
import type { Deps } from "./core/deps.tsx";
import { HttpError } from "./core/errors.tsx";
import { Guards } from "./core/guards.tsx";
import { UserService } from "./modules/users.tsx";
import { Notifier, notificationRoutes } from "./modules/notifications.tsx";
import { authRoutes } from "./modules/auth.routes.tsx";
import { userRoutes } from "./modules/users.routes.tsx";
import { CatalogService, catalogRoutes } from "./modules/catalog.tsx";
import { businessRoutes } from "./modules/business.tsx";
import { QueueService, queueRoutes } from "./modules/queue.tsx";
import { SalesService, salesRoutes } from "./modules/sales.tsx";
import { OrderService, orderRoutes } from "./modules/orders.tsx";
import { AssistantService, ChatHistory, KeywordIntentClassifier, assistantRoutes } from "./modules/assistant.tsx";
import { seedOnce } from "./seed.tsx";

const BASE = "/make-server-c71cd2a9/api/v1";

/** Merakit seluruh layanan; penyimpanan disuntikkan agar mudah diuji. */
export function buildApp(store: Store): Hono<AppEnv> {
  const users = new UserService(store);
  const deps: Deps = { store, users, guards: new Guards(users), notifier: new Notifier(store) };

  const catalog = new CatalogService(store);
  const queue = new QueueService(store);
  const sales = new SalesService(store, catalog, queue);
  const orders = new OrderService(store, catalog, sales, deps);
  const history = new ChatHistory(store);
  const assistant = new AssistantService(store, catalog, queue, history, new KeywordIntentClassifier());

  const api = new Hono<AppEnv>();
  api.use("*", async function (_c, next) {
    await seedOnce(store, users);
    await next();
  });
  api.get("/health", function (c) {
    return c.json({ status: "ok" });
  });
  api.route("/", authRoutes(deps));
  api.route("/", userRoutes(deps));
  api.route("/", notificationRoutes(deps));
  api.route("/", catalogRoutes(deps, catalog));
  api.route("/", businessRoutes(deps));
  api.route("/", queueRoutes(deps, queue));
  api.route("/", salesRoutes(deps, sales));
  api.route("/", orderRoutes(deps, orders));
  api.route("/", assistantRoutes(deps, assistant, history));

  const app = new Hono<AppEnv>();
  app.use(
    "/*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization", "X-Session", "apikey"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 600,
    }),
  );
  app.get("/make-server-c71cd2a9/health", function (c) {
    return c.json({ status: "ok" });
  });
  app.route(BASE, api);

  app.notFound(function (c) {
    return c.json({ message: "Alamat API tidak ditemukan." }, 404);
  });
  app.onError(function (error, c) {
    if (error instanceof HttpError) {
      return c.json({ message: error.message }, error.status as 400);
    }
    if (error instanceof SyntaxError) {
      return c.json({ message: "Format data tidak valid." }, 400);
    }
    console.log("Kesalahan server:", error);
    return c.json({ message: "Terjadi kesalahan pada server. Silakan coba lagi." }, 500);
  });

  return app;
}
