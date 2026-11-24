import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import { image, list, number, text, validate } from "../core/validation.tsx";

export interface Business {
  name: string;
  phone: string;
  address: string;
  about: string;
  logo: string;
  lat: number;
  lng: number;
  banks: { bank: string; accountNumber: string; holder: string }[];
}

export const DEFAULT_BUSINESS: Business = {
  name: "KM. Karya Lestari",
  phone: "+62 821-6208-5606",
  address: "Dermaga KM. Karya Lestari, Sibolga, Sumatera Utara",
  about: "Penangkapan dan penjualan ikan segar langsung dari dermaga Sibolga.",
  logo: "",
  lat: 1.7427,
  lng: 98.7792,
  banks: [{ bank: "BRI", accountNumber: "0000-00-000000-00-0", holder: "KM. Karya Lestari" }],
};

export async function loadBusiness(store: Store): Promise<Business> {
  return { ...DEFAULT_BUSINESS, ...((await store.get("settings:business")) || {}) };
}

function parseBank(item: any) {
  const input = validate(item, {
    bank: text("Nama bank", { min: 2, max: 30 }),
    accountNumber: text("Nomor rekening", { min: 5, max: 30 }),
    holder: text("Atas nama", { min: 2, max: 60 }),
  });
  return input;
}

const businessSchema = {
  name: text("Nama usaha", { min: 3, max: 60 }),
  phone: text("Telepon", { min: 6, max: 20 }),
  address: text("Alamat", { min: 5, max: 200 }),
  about: text("Tentang usaha", { max: 400, required: false }),
  logo: image("Logo"),
  lat: number("Garis lintang", { min: -90, max: 90 }),
  lng: number("Garis bujur", { min: -180, max: 180 }),
  banks: list("Rekening", parseBank, { max: 5 }),
};

export function businessRoutes(deps: Deps): Routes {
  const app = new Hono<AppEnv>();
  const { store, guards } = deps;

  app.get("/business", async function (c) {
    return c.json({ data: await loadBusiness(store) });
  });

  app.put("/business", guards.authenticated(), guards.permission("usaha"), async function (c) {
    const input = validate(await c.req.json(), businessSchema, true);
    const current = await loadBusiness(store);
    const next = { ...current, ...input };
    await store.set("settings:business", next);
    return c.json({ data: next });
  });

  return app;
}
