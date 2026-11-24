import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import { withLocks } from "../core/lock.tsx";
import { badRequest, notFound } from "../core/errors.tsx";
import { newId } from "../core/security.tsx";
import { flag, image, number, oneOf, text, validate } from "../core/validation.tsx";
import { hasPermission } from "../core/guards.tsx";
import { forbidden } from "../core/errors.tsx";

export interface Fish {
  id: string;
  name: string;
  price: number;
  stock: number;
  estimatedKg: number;
  image: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceEntry {
  fishId: string;
  price: number;
  by: string;
  at: string;
}

export interface Voyage {
  id: string;
  name: string;
  status: "berlayar" | "tiba" | "selesai";
  arrivalAt: string;
  estimatedTons: number;
  note: string;
  createdAt: string;
}

export class CatalogService {
  constructor(private store: Store) {}

  async listFish(): Promise<Fish[]> {
    const all: Fish[] = await this.store.list("fish:");
    return all.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  async findFish(id: string): Promise<Fish> {
    const fish = await this.store.get("fish:" + id);
    if (!fish) throw notFound("Jenis ikan tidak ditemukan.");
    return fish;
  }

  async recordPrice(fish: Fish, by: string): Promise<void> {
    const entry: PriceEntry = { fishId: fish.id, price: fish.price, by, at: new Date().toISOString() };
    await this.store.set("fprice:" + fish.id + ":" + entry.at, entry);
  }

  async priceHistory(fishId: string): Promise<PriceEntry[]> {
    const all: PriceEntry[] = await this.store.list("fprice:" + fishId + ":");
    return all.sort(function (a, b) {
      return b.at.localeCompare(a.at);
    });
  }

  /**
   * Mengubah stok beberapa ikan sekaligus secara aman.
   * Nilai negatif berarti mengurangi stok; gagal bila stok tidak cukup.
   */
  async adjustStock(deltas: Record<string, number>): Promise<void> {
    const ids = Object.keys(deltas);
    await withLocks(this.store, ids.map(function (id) {
      return "fish:" + id;
    }), async () => {
      const fishes: Fish[] = [];
      for (const id of ids) {
        const fish = await this.findFish(id);
        const next = Math.round((fish.stock + deltas[id]) * 100) / 100;
        if (next < 0) {
          throw badRequest("Stok " + fish.name + " tersisa " + fish.stock + " kg, tidak cukup untuk permintaan ini.");
        }
        fish.stock = next;
        fish.updatedAt = new Date().toISOString();
        fishes.push(fish);
      }
      for (const fish of fishes) {
        await this.store.set("fish:" + fish.id, fish);
      }
    });
  }
}

const fishSchema = {
  name: text("Nama ikan", { min: 2, max: 60 }),
  price: number("Harga per kg", { min: 1, max: 10000000, integer: true }),
  stock: number("Stok aktual (kg)", { min: 0, max: 100000 }),
  estimatedKg: number("Estimasi stok (kg)", { min: 0, max: 100000, required: false }),
  image: image("Foto ikan"),
  active: flag("Status"),
};

const voyageSchema = {
  name: text("Nama pelayaran", { min: 3, max: 80 }),
  status: oneOf("Status", ["berlayar", "tiba", "selesai"]),
  arrivalAt: text("Waktu tiba", { min: 8, max: 40 }),
  estimatedTons: number("Estimasi tangkapan (ton)", { min: 0, max: 1000 }),
  note: text("Catatan", { max: 300, required: false }),
};

export function catalogRoutes(deps: Deps, catalog: CatalogService): Routes {
  const app = new Hono<AppEnv>();
  const { store, guards } = deps;

  app.get("/fish", guards.authenticated(), async function (c) {
    const staff = c.get("user").role !== "user";
    const all = await catalog.listFish();
    return c.json({ data: staff ? all : all.filter(function (fish) { return fish.active; }) });
  });

  app.post("/fish", guards.authenticated(), guards.permission("ikan"), async function (c) {
    const input = validate(await c.req.json(), fishSchema);
    const now = new Date().toISOString();
    const fish: Fish = {
      id: newId(),
      name: input.name,
      price: input.price,
      stock: input.stock,
      estimatedKg: input.estimatedKg || 0,
      image: input.image || "",
      active: input.active === undefined ? true : input.active,
      createdAt: now,
      updatedAt: now,
    };
    await store.set("fish:" + fish.id, fish);
    await catalog.recordPrice(fish, c.get("user").username);
    return c.json({ data: fish }, 201);
  });

  app.patch("/fish/:id", guards.authenticated(), async function (c) {
    const actor = c.get("user");
    const fish = await catalog.findFish(c.req.param("id"));
    const input = validate(await c.req.json(), fishSchema, true);
    const priceChanged = input.price !== undefined && input.price !== fish.price;

    if (priceChanged && !hasPermission(actor, "harga")) throw forbidden("Hanya admin dengan izin harga yang dapat mengubah harga acuan.");
    if (Object.keys(input).some(function (key) { return key !== "price"; }) && !hasPermission(actor, "ikan")) throw forbidden();

    await withLocks(store, ["fish:" + fish.id], async function () {
      const fresh = await catalog.findFish(fish.id);
      Object.assign(fresh, input, { updatedAt: new Date().toISOString() });
      await store.set("fish:" + fresh.id, fresh);
      if (priceChanged) await catalog.recordPrice(fresh, actor.username);
      Object.assign(fish, fresh);
    });
    return c.json({ data: fish });
  });

  app.delete("/fish/:id", guards.authenticated(), guards.permission("ikan"), async function (c) {
    const fish = await catalog.findFish(c.req.param("id"));
    await store.del("fish:" + fish.id);
    return c.json({ ok: true });
  });

  app.get("/fish/:id/prices", guards.authenticated(), guards.permission("harga"), async function (c) {
    return c.json({ data: await catalog.priceHistory(c.req.param("id")) });
  });

  app.get("/voyages", guards.authenticated(), async function (c) {
    const all: Voyage[] = await store.list("voyage:");
    all.sort(function (a, b) {
      return b.arrivalAt.localeCompare(a.arrivalAt);
    });
    return c.json({ data: all });
  });

  app.post("/voyages", guards.authenticated(), guards.permission("pelayaran"), async function (c) {
    const input = validate(await c.req.json(), voyageSchema);
    const voyage: Voyage = { id: newId(), createdAt: new Date().toISOString(), note: "", ...input } as Voyage;
    await store.set("voyage:" + voyage.id, voyage);
    return c.json({ data: voyage }, 201);
  });

  app.patch("/voyages/:id", guards.authenticated(), guards.permission("pelayaran"), async function (c) {
    const voyage: Voyage | undefined = await store.get("voyage:" + c.req.param("id"));
    if (!voyage) throw notFound("Pelayaran tidak ditemukan.");
    Object.assign(voyage, validate(await c.req.json(), voyageSchema, true));
    await store.set("voyage:" + voyage.id, voyage);
    return c.json({ data: voyage });
  });

  app.delete("/voyages/:id", guards.authenticated(), guards.permission("pelayaran"), async function (c) {
    const voyage = await store.get("voyage:" + c.req.param("id"));
    if (!voyage) throw notFound("Pelayaran tidak ditemukan.");
    await store.del("voyage:" + c.req.param("id"));
    return c.json({ ok: true });
  });

  return app;
}
