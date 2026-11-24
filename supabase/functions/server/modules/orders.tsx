import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import type { CatalogService } from "./catalog.tsx";
import type { SalesService } from "./sales.tsx";
import { badRequest, forbidden, notFound } from "../core/errors.tsx";
import { newId } from "../core/security.tsx";
import { hasPermission } from "../core/guards.tsx";
import { image, number, oneOf, text, validate } from "../core/validation.tsx";

export type OrderStatus = "menunggu" | "dikonfirmasi" | "ditolak" | "dibatalkan" | "selesai";

export interface OrderItem {
  fishId: string;
  name: string;
  kg: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  code: string;
  userId: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  payment: "cod" | "transfer";
  bank: string;
  delivery: "dermaga" | "antar";
  address: string;
  note: string;
  status: OrderStatus;
  paid: boolean;
  hasProof: boolean;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

const orderSchema = {
  payment: oneOf("Metode pembayaran", ["cod", "transfer"]),
  bank: text("Bank tujuan", { max: 30, required: false }),
  delivery: oneOf("Metode pengambilan", ["dermaga", "antar"]),
  address: text("Alamat pengantaran", { max: 250, required: false }),
  note: text("Catatan", { max: 200, required: false }),
};

function parseItem(raw: any): { fishId: string; kg: number } {
  const input = validate(raw, {
    fishId: text("Jenis ikan", { max: 40 }),
    kg: number("Berat (kg)", { min: 0.5, max: 10000 }),
  });
  return { fishId: input.fishId, kg: input.kg };
}


export class OrderService {
  constructor(private store: Store, private catalog: CatalogService, private sales: SalesService, private deps: Deps) {}

  async find(id: string): Promise<Order> {
    const order = await this.store.get("order:" + id);
    if (!order) throw notFound("Pesanan tidak ditemukan.");
    return order;
  }

  async save(order: Order): Promise<void> {
    order.updatedAt = new Date().toISOString();
    await this.store.set("order:" + order.id, order);
  }

  async list(userId?: string): Promise<Order[]> {
    const all: Order[] = await this.store.list("order:");
    return all
      .filter(function (order) {
        return userId ? order.userId === userId : true;
      })
      .sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  private async restoreStock(order: Order): Promise<void> {
    const deltas: Record<string, number> = {};
    for (const item of order.items) {
      deltas[item.fishId] = (deltas[item.fishId] || 0) + item.kg;
    }
    const existing: Record<string, number> = {};
    for (const id of Object.keys(deltas)) {
      if (await this.store.get("fish:" + id)) existing[id] = deltas[id];
    }
    if (Object.keys(existing).length) await this.catalog.adjustStock(existing);
  }

  async place(user: { id: string; username: string; phone: string }, body: any): Promise<Order> {
    const input = validate(body, orderSchema);
    const rawItems: any[] = Array.isArray(body && body.items) ? body.items : [];
    if (rawItems.length === 0) throw badRequest("Pilih minimal satu jenis ikan.");
    if (input.delivery === "antar" && !input.address) throw badRequest("Alamat pengantaran wajib diisi.");
    if (input.payment === "transfer" && !input.bank) throw badRequest("Pilih bank tujuan transfer.");

    const merged: Record<string, number> = {};
    for (const raw of rawItems) {
      const item = parseItem(raw);
      merged[item.fishId] = (merged[item.fishId] || 0) + item.kg;
    }

    const items: OrderItem[] = [];
    for (const fishId of Object.keys(merged)) {
      const fish = await this.catalog.findFish(fishId);
      if (!fish.active) throw badRequest(fish.name + " sedang tidak tersedia.");
      if (merged[fishId] > fish.stock) {
        throw badRequest("Pesanan " + fish.name + " " + merged[fishId] + " kg melebihi stok tersisa " + fish.stock + " kg.");
      }
      items.push({ fishId, name: fish.name, kg: merged[fishId], price: fish.price, subtotal: Math.round(fish.price * merged[fishId]) });
    }

    const deltas: Record<string, number> = {};
    for (const item of items) deltas[item.fishId] = -item.kg;
    await this.catalog.adjustStock(deltas);

    const subtotal = items.reduce(function (sum, item) {
      return sum + item.subtotal;
    }, 0);
    const now = new Date().toISOString();
    const order: Order = {
      id: newId(),
      code: "PO-" + now.slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      userId: user.id,
      customerName: user.username,
      phone: user.phone,
      items,
      subtotal,
      shippingFee: 0,
      total: subtotal,
      payment: input.payment,
      bank: input.payment === "transfer" ? input.bank : "",
      delivery: input.delivery,
      address: input.delivery === "antar" ? input.address : "",
      note: input.note || "",
      status: "menunggu",
      paid: false,
      hasProof: false,
      reason: "",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.set("order:" + order.id, order);
    return order;
  }

  async confirm(order: Order, shippingFee: number): Promise<Order> {
    if (order.status !== "menunggu") throw badRequest("Hanya pesanan yang menunggu yang dapat dikonfirmasi.");
    order.status = "dikonfirmasi";
    order.shippingFee = order.delivery === "antar" ? shippingFee : 0;
    order.total = order.subtotal + order.shippingFee;
    await this.save(order);
    await this.notify(order, "Pesanan " + order.code + " dikonfirmasi. Total pembayaran Rp " + order.total.toLocaleString("id-ID") + ".");
    return order;
  }

  async reject(order: Order, reason: string): Promise<Order> {
    if (order.status !== "menunggu" && order.status !== "dikonfirmasi") throw badRequest("Pesanan ini tidak dapat ditolak.");
    await this.restoreStock(order);
    order.status = "ditolak";
    order.reason = reason;
    await this.save(order);
    await this.notify(order, "Pesanan " + order.code + " ditolak. Alasan: " + reason);
    return order;
  }

  async cancel(order: Order): Promise<Order> {
    if (order.status !== "menunggu") throw badRequest("Pesanan yang sudah diproses tidak dapat dibatalkan.");
    await this.restoreStock(order);
    order.status = "dibatalkan";
    await this.save(order);
    return order;
  }

  async complete(order: Order, staffName: string): Promise<Order> {
    if (order.status !== "dikonfirmasi") throw badRequest("Konfirmasi pesanan terlebih dahulu.");
    order.status = "selesai";
    order.paid = true;
    await this.save(order);
    await this.sales.recordFromOrder(order, staffName);
    await this.notify(order, "Pesanan " + order.code + " selesai. Terima kasih telah berbelanja.");
    return order;
  }

  private async notify(order: Order, message: string): Promise<void> {
    await this.deps.notifier.send({ userId: order.userId, kind: "pesanan", title: "Pembaruan pesanan", message });
  }
}

export function orderRoutes(deps: Deps, orders: OrderService): Routes {
  const app = new Hono<AppEnv>();
  const { store, guards } = deps;
  const manage = guards.permission("pesanan");

  async function loadAccessible(c: any): Promise<Order> {
    const order = await orders.find(c.req.param("id"));
    const user = c.get("user");
    if (order.userId !== user.id && !hasPermission(user, "pesanan")) throw forbidden();
    return order;
  }

  app.post("/orders", guards.authenticated(), async function (c) {
    const order = await orders.place(c.get("user"), await c.req.json());
    return c.json({ data: order }, 201);
  });

  app.get("/orders", guards.authenticated(), async function (c) {
    const user = c.get("user");
    const scope = c.req.query("scope");
    const mine = scope === "mine" || !hasPermission(user, "pesanan");
    return c.json({ data: await orders.list(mine ? user.id : undefined) });
  });

  app.get("/orders/:id", guards.authenticated(), async function (c) {
    return c.json({ data: await loadAccessible(c) });
  });

  app.get("/orders/:id/proof", guards.authenticated(), async function (c) {
    const order = await loadAccessible(c);
    const proof = await store.get("proof:" + order.id);
    return c.json({ data: proof ? proof.image : "" });
  });

  app.post("/orders/:id/proof", guards.authenticated(), async function (c) {
    const order = await orders.find(c.req.param("id"));
    if (order.userId !== c.get("user").id) throw forbidden();
    if (order.payment !== "transfer") throw badRequest("Pesanan ini tidak memakai transfer.");
    if (order.status === "ditolak" || order.status === "dibatalkan") throw badRequest("Pesanan ini sudah tidak aktif.");
    const input = validate(await c.req.json(), { image: image("Bukti transfer") });
    if (!input.image) throw badRequest("Bukti transfer wajib diunggah.");
    await store.set("proof:" + order.id, { image: input.image });
    order.hasProof = true;
    await orders.save(order);
    return c.json({ data: order });
  });

  app.post("/orders/:id/cancel", guards.authenticated(), async function (c) {
    const order = await orders.find(c.req.param("id"));
    if (order.userId !== c.get("user").id) throw forbidden();
    return c.json({ data: await orders.cancel(order) });
  });

  app.post("/orders/:id/confirm", guards.authenticated(), manage, async function (c) {
    const input = validate(await c.req.json().catch(function () { return {}; }), {
      shippingFee: number("Ongkos kirim", { min: 0, max: 10000000, integer: true, required: false }),
    });
    const order = await orders.find(c.req.param("id"));
    return c.json({ data: await orders.confirm(order, input.shippingFee || 0) });
  });

  app.post("/orders/:id/reject", guards.authenticated(), manage, async function (c) {
    const input = validate(await c.req.json().catch(function () { return {}; }), { reason: text("Alasan penolakan", { min: 3, max: 200 }) });
    const order = await orders.find(c.req.param("id"));
    return c.json({ data: await orders.reject(order, input.reason) });
  });

  app.post("/orders/:id/complete", guards.authenticated(), manage, async function (c) {
    const order = await orders.find(c.req.param("id"));
    return c.json({ data: await orders.complete(order, c.get("user").username) });
  });

  app.post("/orders/:id/paid", guards.authenticated(), manage, async function (c) {
    const order = await orders.find(c.req.param("id"));
    order.paid = !order.paid;
    await orders.save(order);
    return c.json({ data: order });
  });

  return app;
}

