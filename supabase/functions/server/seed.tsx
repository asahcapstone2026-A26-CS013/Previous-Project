import type { Store } from "./core/store.tsx";
import type { UserService } from "./modules/users.tsx";
import { DEFAULT_BUSINESS } from "./modules/business.tsx";
import { DEFAULT_ASSISTANT } from "./modules/assistant.tsx";
import { PERMISSIONS } from "./core/types.tsx";
import { newId } from "./core/security.tsx";

const FISH = [
  { name: "Tongkol", price: 28000, stock: 1200 },
  { name: "Cakalang", price: 32000, stock: 900 },
  { name: "Layang", price: 24000, stock: 1500 },
  { name: "Kembung", price: 26000, stock: 800 },
  { name: "Selar", price: 22000, stock: 650 },
  { name: "Tenggiri", price: 65000, stock: 300 },
  { name: "Bawal", price: 58000, stock: 220 },
];

/** Mengisi akun awal dan data contoh satu kali saja. */
export async function seedOnce(store: Store, users: UserService): Promise<void> {
  const claimed = await store.claim("meta:seeded", { at: new Date().toISOString() });
  if (!claimed) return;

  await users.create({ username: "superadmin", password: "Superadmin123", role: "superadmin" });
  await users.create({ username: "admin", password: "Admin12345", role: "admin", permissions: PERMISSIONS as unknown as string[] });
  await users.create({ username: "pelanggan", password: "Pelanggan123", role: "user", phone: "081200000000" });

  await store.set("settings:business", DEFAULT_BUSINESS);
  await store.set("settings:assistant", DEFAULT_ASSISTANT);

  const now = new Date().toISOString();
  for (const item of FISH) {
    const id = newId();
    await store.set("fish:" + id, { id, name: item.name, price: item.price, stock: item.stock, estimatedKg: item.stock, image: "", active: true, createdAt: now, updatedAt: now });
    await store.set("fprice:" + id + ":" + now, { fishId: id, price: item.price, by: "sistem", at: now });
  }

  const arrival = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  arrival.setUTCHours(1, 0, 0, 0);
  const voyageId = newId();
  await store.set("voyage:" + voyageId, {
    id: voyageId,
    name: "Pelayaran Perdana",
    status: "berlayar",
    arrivalAt: arrival.toISOString().slice(0, 16),
    estimatedTons: 12,
    note: "",
    createdAt: now,
  });
}
