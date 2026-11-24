import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import { newId } from "../core/security.tsx";
import { notFound } from "../core/errors.tsx";
import { text, validate } from "../core/validation.tsx";

export interface NotificationRecord {
  id: string;
  /** null berarti pengumuman untuk semua akun. */
  userId: string | null;
  kind: "pengumuman" | "pesanan" | "antrean";
  title: string;
  message: string;
  createdAt: string;
}

export class Notifier {
  constructor(private store: Store) {}

  async send(input: { userId: string | null; kind: NotificationRecord["kind"]; title: string; message: string }): Promise<NotificationRecord> {
    const createdAt = new Date().toISOString();
    const record: NotificationRecord = { id: newId(), createdAt, ...input };
    await this.store.set("notif:" + createdAt + ":" + record.id, record);
    return record;
  }

  async listFor(userId: string): Promise<NotificationRecord[]> {
    const all: NotificationRecord[] = await this.store.list("notif:");
    return all
      .filter(function (item) {
        return item.userId === null || item.userId === userId;
      })
      .sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  async announcements(): Promise<NotificationRecord[]> {
    const all: NotificationRecord[] = await this.store.list("notif:");
    return all
      .filter(function (item) {
        return item.userId === null;
      })
      .sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  async find(id: string): Promise<NotificationRecord | undefined> {
    const all: NotificationRecord[] = await this.store.list("notif:");
    return all.find(function (item) {
      return item.id === id;
    });
  }

  async remove(record: NotificationRecord): Promise<void> {
    await this.store.del("notif:" + record.createdAt + ":" + record.id);
  }

  async update(record: NotificationRecord): Promise<void> {
    await this.store.set("notif:" + record.createdAt + ":" + record.id, record);
  }
}

const announcementSchema = {
  title: text("Judul", { min: 3, max: 100 }),
  message: text("Isi pengumuman", { min: 3, max: 1000 }),
};

export function notificationRoutes(deps: Deps): Routes {
  const app = new Hono<AppEnv>();
  const { store, guards, notifier } = deps;

  app.get("/notifications", guards.authenticated(), async function (c) {
    const user = c.get("user");
    const seen = (await store.get("nseen:" + user.id)) || "";
    const items = await notifier.listFor(user.id);
    const data = items.slice(0, 100).map(function (item) {
      return { ...item, read: item.createdAt <= seen };
    });
    const unread = data.filter(function (item) {
      return !item.read;
    }).length;
    return c.json({ data, unread });
  });

  app.post("/notifications/read", guards.authenticated(), async function (c) {
    await store.set("nseen:" + c.get("user").id, new Date().toISOString());
    return c.json({ ok: true });
  });

  app.get("/announcements", guards.authenticated(), guards.permission("pengumuman"), async function (c) {
    return c.json({ data: await notifier.announcements() });
  });

  app.post("/announcements", guards.authenticated(), guards.permission("pengumuman"), async function (c) {
    const input = validate(await c.req.json(), announcementSchema);
    const record = await notifier.send({ userId: null, kind: "pengumuman", title: input.title, message: input.message });
    return c.json({ data: record }, 201);
  });

  app.patch("/announcements/:id", guards.authenticated(), guards.permission("pengumuman"), async function (c) {
    const record = await notifier.find(c.req.param("id"));
    if (!record || record.userId !== null) throw notFound("Pengumuman tidak ditemukan.");
    const input = validate(await c.req.json(), announcementSchema, true);
    Object.assign(record, input);
    await notifier.update(record);
    return c.json({ data: record });
  });

  app.delete("/announcements/:id", guards.authenticated(), guards.permission("pengumuman"), async function (c) {
    const record = await notifier.find(c.req.param("id"));
    if (!record || record.userId !== null) throw notFound("Pengumuman tidak ditemukan.");
    await notifier.remove(record);
    return c.json({ ok: true });
  });

  return app;
}

