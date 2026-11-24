import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import type { CatalogService } from "./catalog.tsx";
import type { QueueService } from "./queue.tsx";
import type { Order } from "./orders.tsx";
import { badRequest, notFound } from "../core/errors.tsx";
import { newId } from "../core/security.tsx";
import { number, text, validate } from "../core/validation.tsx";

export interface SaleItem {
  fishId: string;
  name: string;
  kg: number;
  pricePerKg: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: string;
  customerName: string;
  phone: string;
  address: string;
  source: "dermaga" | "aplikasi";
  payment: string;
  orderId: string;
  items: SaleItem[];
  total: number;
  stockManaged: boolean;
  recordedBy: string;
  createdAt: string;
}

const saleSchema = {
  customerName: text("Nama pelanggan", { min: 2, max: 60 }),
  phone: text("Telepon", { max: 20, required: false }),
  address: text("Alamat", { max: 200, required: false }),
  date: text("Tanggal", { min: 10, max: 10 }),
  payment: text("Pembayaran", { max: 20, required: false }),
  ticketId: text("Tiket", { max: 40, required: false }),
};

export class SalesService {
  constructor(private store: Store, private catalog: CatalogService, private queue: QueueService) {}

  async list(): Promise<Sale[]> {
    const all: Sale[] = await this.store.list("sale:");
    return all.sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    });
  }

  async find(id: string): Promise<Sale> {
    const sale = await this.store.get("sale:" + id);
    if (!sale) throw notFound("Catatan tidak ditemukan.");
    return sale;
  }

  async buildItems(rawItems: any): Promise<SaleItem[]> {
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw badRequest("Tambahkan minimal satu jenis ikan.");
    const items: SaleItem[] = [];
    for (const raw of rawItems) {
      const input = validate(raw, {
        fishId: text("Jenis ikan", { max: 40 }),
        kg: number("Berat (kg)", { min: 0.1, max: 10000 }),
        pricePerKg: number("Harga per kg", { min: 1, max: 10000000, integer: true }),
      });
      const fish = await this.catalog.findFish(input.fishId);
      items.push({ fishId: fish.id, name: fish.name, kg: input.kg, pricePerKg: input.pricePerKg, subtotal: Math.round(input.kg * input.pricePerKg) });
    }
    return items;
  }

  private sum(items: SaleItem[]): number {
    return items.reduce(function (total, item) {
      return total + item.subtotal;
    }, 0);
  }

  private deltas(oldItems: SaleItem[], newItems: SaleItem[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of oldItems) result[item.fishId] = (result[item.fishId] || 0) + item.kg;
    for (const item of newItems) result[item.fishId] = (result[item.fishId] || 0) - item.kg;
    for (const id of Object.keys(result)) {
      if (Math.abs(result[id]) < 0.0001) delete result[id];
    }
    return result;
  }

  async create(body: any, staffName: string): Promise<Sale> {
    const input = validate(body, saleSchema);
    const items = await this.buildItems(body.items);
    await this.catalog.adjustStock(this.deltas([], items));

    const sale: Sale = {
      id: newId(),
      date: input.date,
      customerName: input.customerName,
      phone: input.phone || "",
      address: input.address || "",
      source: "dermaga",
      payment: input.payment || "tunai",
      orderId: "",
      items,
      total: this.sum(items),
      stockManaged: true,
      recordedBy: staffName,
      createdAt: new Date().toISOString(),
    };
    await this.store.set("sale:" + sale.id, sale);

    if (input.ticketId) await this.finishTicket(input.ticketId);
    return sale;
  }

  private async finishTicket(ticketId: string): Promise<void> {
    try {
      const ticket = await this.queue.findTicket(ticketId);
      if (ticket.status === "dipanggil") {
        ticket.status = "selesai";
        ticket.finishedAt = new Date().toISOString();
        await this.queue.saveTicket(ticket);
        await this.queue.releaseOwner(ticket);
      }
    } catch (_error) {
      // Tiket mungkin sudah tidak ada; pencatatan transaksi tetap berhasil.
    }
  }

  async update(sale: Sale, body: any): Promise<Sale> {
    const input = validate(body, saleSchema, true);
    if (body.items !== undefined) {
      if (!sale.stockManaged) throw badRequest("Item transaksi dari pesanan aplikasi tidak dapat diubah.");
      const items = await this.buildItems(body.items);
      await this.catalog.adjustStock(this.deltas(sale.items, items));
      sale.items = items;
      sale.total = this.sum(items);
    }
    for (const key of ["customerName", "phone", "address", "date", "payment"]) {
      if (input[key] !== undefined) (sale as any)[key] = input[key];
    }
    await this.store.set("sale:" + sale.id, sale);
    return sale;
  }

  async remove(sale: Sale): Promise<void> {
    if (sale.stockManaged) {
      const restore = this.deltas(sale.items, []);
      const existing: Record<string, number> = {};
      for (const id of Object.keys(restore)) {
        if (await this.store.get("fish:" + id)) existing[id] = restore[id];
      }
      if (Object.keys(existing).length) await this.catalog.adjustStock(existing);
    }
    await this.store.del("sale:" + sale.id);
  }

  async recordFromOrder(order: Order, staffName: string): Promise<void> {
    const sale: Sale = {
      id: newId(),
      date: new Date().toISOString().slice(0, 10),
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      source: "aplikasi",
      payment: order.payment === "cod" ? "COD" : "Transfer",
      orderId: order.id,
      items: order.items.map(function (item) {
        return { fishId: item.fishId, name: item.name, kg: item.kg, pricePerKg: item.price, subtotal: item.subtotal };
      }),
      total: order.total,
      stockManaged: false,
      recordedBy: staffName,
      createdAt: new Date().toISOString(),
    };
    await this.store.set("sale:" + sale.id, sale);
  }
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function salesRoutes(deps: Deps, sales: SalesService): Routes {
  const app = new Hono<AppEnv>();
  const { guards } = deps;
  const manage = guards.permission("transaksi");

  app.get("/sales", guards.authenticated(), manage, async function (c) {
    const month = c.req.query("month");
    const all = await sales.list();
    return c.json({ data: month ? all.filter(function (sale) { return monthOf(sale.date) === month; }) : all });
  });

  app.post("/sales", guards.authenticated(), manage, async function (c) {
    return c.json({ data: await sales.create(await c.req.json(), c.get("user").username) }, 201);
  });

  app.patch("/sales/:id", guards.authenticated(), manage, async function (c) {
    const sale = await sales.find(c.req.param("id"));
    return c.json({ data: await sales.update(sale, await c.req.json()) });
  });

  app.delete("/sales/:id", guards.authenticated(), manage, async function (c) {
    await sales.remove(await sales.find(c.req.param("id")));
    return c.json({ ok: true });
  });

  app.get("/reports", guards.authenticated(), guards.permission("laporan"), async function (c) {
    const month = c.req.query("month") || new Date().toISOString().slice(0, 7);
    const list = (await sales.list()).filter(function (sale) {
      return monthOf(sale.date) === month;
    });

    const byFish: Record<string, { name: string; kg: number; total: number }> = {};
    const byDay: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    const bySource = { dermaga: 0, aplikasi: 0 };
    let total = 0;

    for (const sale of list) {
      total += sale.total;
      bySource[sale.source] += 1;
      byDay[sale.date] = (byDay[sale.date] || 0) + sale.total;
      const hour = new Date(sale.createdAt).getUTCHours();
      const localHour = String((hour + 7) % 24).padStart(2, "0");
      byHour[localHour] = (byHour[localHour] || 0) + 1;
      for (const item of sale.items) {
        const entry = byFish[item.fishId] || { name: item.name, kg: 0, total: 0 };
        entry.kg += item.kg;
        entry.total += item.subtotal;
        byFish[item.fishId] = entry;
      }
    }

    return c.json({
      data: {
        month,
        totalSales: total,
        totalOrders: list.length,
        averageOrder: list.length ? Math.round(total / list.length) : 0,
        bySource,
        byFish: Object.values(byFish).sort(function (a, b) { return b.total - a.total; }),
        byDay: Object.keys(byDay).sort().map(function (day) { return { day, total: byDay[day] }; }),
        byHour: Object.keys(byHour).sort().map(function (hour) { return { hour, count: byHour[hour] }; }),
      },
    });
  });

  return app;
}
