import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes, UserRecord } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import { badRequest, conflict, notFound } from "../core/errors.tsx";
import { newId } from "../core/security.tsx";
import { text, validate } from "../core/validation.tsx";

type TicketStatus = "menunggu" | "dipanggil" | "dilewati" | "selesai" | "dibatalkan";

export interface QueueSession {
  id: string;
  status: "buka" | "tutup";
  openedAt: string;
  closedAt: string;
  openedBy: string;
}

export interface Ticket {
  id: string;
  sessionId: string;
  number: number;
  userId: string | null;
  name: string;
  phone: string;
  walkIn: boolean;
  status: TicketStatus;
  createdAt: string;
  calledAt: string;
  finishedAt: string;
}

const DEFAULT_SERVICE_MINUTES = 4;

function ticketKey(sessionId: string, number: number): string {
  return "qticket:" + sessionId + ":" + String(number).padStart(6, "0");
}

export class QueueService {
  constructor(private store: Store) {}

  async activeSession(): Promise<QueueSession | undefined> {
    const pointer = await this.store.get("queue:active");
    if (!pointer) return undefined;
    return await this.store.get("qsession:" + pointer.id);
  }

  async openSession(by: string): Promise<QueueSession> {
    const claimed = await this.store.claim("queue:active", { id: "" });
    if (!claimed) {
      const existing = await this.activeSession();
      if (existing && existing.status === "buka") throw conflict("Sesi antrean sudah dibuka.");
    }
    const session: QueueSession = { id: newId(), status: "buka", openedAt: new Date().toISOString(), closedAt: "", openedBy: by };
    await this.store.set("qsession:" + session.id, session);
    await this.store.set("queue:active", { id: session.id });
    return session;
  }

  async closeSession(): Promise<QueueSession> {
    const session = await this.activeSession();
    if (!session || session.status !== "buka") throw badRequest("Tidak ada sesi antrean yang sedang dibuka.");
    session.status = "tutup";
    session.closedAt = new Date().toISOString();
    await this.store.set("qsession:" + session.id, session);
    return session;
  }

  async resetSession(): Promise<void> {
    const session = await this.activeSession();
    if (!session) return;
    for (const ticket of await this.tickets(session.id)) {
      await this.store.del(ticketKey(session.id, ticket.number));
      if (ticket.userId) await this.store.del("qowner:" + session.id + ":" + ticket.userId);
    }
    await this.store.del("qsession:" + session.id);
    await this.store.del("queue:active");
  }

  async tickets(sessionId: string): Promise<Ticket[]> {
    const all: Ticket[] = await this.store.list("qticket:" + sessionId + ":");
    return all.sort(function (a, b) {
      return a.number - b.number;
    });
  }

  /** Nomor diklaim lewat insert atomik, sehingga tidak pernah ganda walau diminta bersamaan. */
  async issue(session: QueueSession, owner: { userId: string | null; name: string; phone: string; walkIn: boolean }): Promise<Ticket> {
    if (session.status !== "buka") throw badRequest("Sesi antrean belum dibuka atau sudah ditutup.");

    if (owner.userId) {
      const ownerClaim = await this.store.claim("qowner:" + session.id + ":" + owner.userId, { at: Date.now() });
      if (!ownerClaim) throw conflict("Anda sudah memiliki nomor antrean aktif.");
    }

    try {
      let number = (await this.tickets(session.id)).length + 1;
      for (let attempt = 0; attempt < 200; attempt++, number++) {
        const ticket: Ticket = {
          id: newId(),
          sessionId: session.id,
          number,
          userId: owner.userId,
          name: owner.name,
          phone: owner.phone,
          walkIn: owner.walkIn,
          status: "menunggu",
          createdAt: new Date().toISOString(),
          calledAt: "",
          finishedAt: "",
        };
        if (await this.store.claim(ticketKey(session.id, number), ticket)) return ticket;
      }
      throw conflict("Gagal mendapatkan nomor, silakan coba lagi.");
    } catch (error) {
      if (owner.userId) await this.store.del("qowner:" + session.id + ":" + owner.userId);
      throw error;
    }
  }

  async findTicket(id: string): Promise<Ticket> {
    const session = await this.activeSession();
    if (session) {
      const found = (await this.tickets(session.id)).find(function (ticket) {
        return ticket.id === id;
      });
      if (found) return found;
    }
    throw notFound("Tiket tidak ditemukan pada sesi aktif.");
  }

  async saveTicket(ticket: Ticket): Promise<void> {
    await this.store.set(ticketKey(ticket.sessionId, ticket.number), ticket);
  }

  async releaseOwner(ticket: Ticket): Promise<void> {
    if (ticket.userId) await this.store.del("qowner:" + ticket.sessionId + ":" + ticket.userId);
  }

  async averageServiceMinutes(sessionId: string): Promise<number> {
    const done = (await this.tickets(sessionId)).filter(function (ticket) {
      return ticket.status === "selesai" && ticket.calledAt && ticket.finishedAt;
    });
    if (done.length === 0) return DEFAULT_SERVICE_MINUTES;
    const recent = done.slice(-20);
    let total = 0;
    for (const ticket of recent) {
      total += (new Date(ticket.finishedAt).getTime() - new Date(ticket.calledAt).getTime()) / 60000;
    }
    return Math.max(1, Math.round((total / recent.length) * 10) / 10);
  }

  describe(ticket: Ticket, all: Ticket[], average: number) {
    const ahead = all.filter(function (other) {
      return other.number < ticket.number && (other.status === "menunggu" || other.status === "dipanggil");
    }).length;
    const waiting = ticket.status === "menunggu";
    return {
      ...ticket,
      position: waiting ? ahead + 1 : 0,
      estimateMinutes: waiting ? Math.round(ahead * average) : 0,
    };
  }
}

const walkInSchema = {
  name: text("Nama pelanggan", { min: 2, max: 60 }),
  phone: text("Nomor telepon", { max: 20, required: false }),
};

export function queueRoutes(deps: Deps, queue: QueueService): Routes {
  const app = new Hono<AppEnv>();
  const { guards, notifier } = deps;
  const manage = guards.permission("antrean");

  async function snapshot(user: UserRecord) {
    const session = await queue.activeSession();
    if (!session) return { session: null, mine: null, waiting: 0, nowServing: 0, averageMinutes: DEFAULT_SERVICE_MINUTES };

    const all = await queue.tickets(session.id);
    const average = await queue.averageServiceMinutes(session.id);
    const called = all.filter(function (ticket) {
      return ticket.status === "dipanggil";
    });
    const lastCalled = called.length ? called[called.length - 1].number : 0;
    const mineList = all.filter(function (ticket) {
      return ticket.userId === user.id;
    });
    const mine = mineList.length ? mineList[mineList.length - 1] : null;
    const waiting = all.filter(function (ticket) {
      return ticket.status === "menunggu";
    }).length;

    return {
      session,
      mine: mine ? queue.describe(mine, all, average) : null,
      waiting,
      nowServing: lastCalled,
      averageMinutes: average,
    };
  }

  app.get("/queue/state", guards.authenticated(), async function (c) {
    return c.json({ data: await snapshot(c.get("user")) });
  });

  app.post("/queue/tickets", guards.authenticated(), async function (c) {
    const user = c.get("user");
    const session = await queue.activeSession();
    if (!session) throw badRequest("Sesi antrean belum dibuka.");
    const ticket = await queue.issue(session, { userId: user.id, name: user.username, phone: user.phone, walkIn: false });
    return c.json({ data: ticket }, 201);
  });

  app.post("/queue/tickets/mine/cancel", guards.authenticated(), async function (c) {
    const state = await snapshot(c.get("user"));
    const mine = state.mine;
    if (!mine || mine.status !== "menunggu") throw badRequest("Tidak ada nomor antrean yang dapat dibatalkan.");
    const ticket = await queue.findTicket(mine.id);
    ticket.status = "dibatalkan";
    ticket.finishedAt = new Date().toISOString();
    await queue.saveTicket(ticket);
    await queue.releaseOwner(ticket);
    return c.json({ data: ticket });
  });

  app.post("/queue/sessions/open", guards.authenticated(), manage, async function (c) {
    const session = await queue.openSession(c.get("user").username);
    await notifier.send({ userId: null, kind: "antrean", title: "Antrean dibuka", message: "Sesi antrean telah dibuka. Ambil nomor Anda sekarang." });
    return c.json({ data: session }, 201);
  });

  app.post("/queue/sessions/close", guards.authenticated(), manage, async function (c) {
    return c.json({ data: await queue.closeSession() });
  });

  app.delete("/queue/sessions/active", guards.authenticated(), manage, async function (c) {
    await queue.resetSession();
    return c.json({ ok: true });
  });

  app.get("/queue/tickets", guards.authenticated(), manage, async function (c) {
    const session = await queue.activeSession();
    if (!session) return c.json({ data: { session: null, tickets: [], averageMinutes: DEFAULT_SERVICE_MINUTES } });
    const all = await queue.tickets(session.id);
    const average = await queue.averageServiceMinutes(session.id);
    const tickets = all.map(function (ticket) {
      return queue.describe(ticket, all, average);
    });
    return c.json({ data: { session, tickets, averageMinutes: average } });
  });

  app.post("/queue/walkin", guards.authenticated(), manage, async function (c) {
    const input = validate(await c.req.json(), walkInSchema);
    const session = await queue.activeSession();
    if (!session) throw badRequest("Sesi antrean belum dibuka.");
    const ticket = await queue.issue(session, { userId: null, name: input.name, phone: input.phone || "", walkIn: true });
    return c.json({ data: ticket }, 201);
  });

  app.post("/queue/tickets/:id/:action", guards.authenticated(), manage, async function (c) {
    const action = c.req.param("action");
    const ticket = await queue.findTicket(c.req.param("id"));
    const now = new Date().toISOString();

    if (action === "call") {
      if (ticket.status !== "menunggu" && ticket.status !== "dilewati") throw badRequest("Tiket ini tidak dapat dipanggil.");
      ticket.status = "dipanggil";
      ticket.calledAt = now;
      if (ticket.userId) {
        await notifier.send({ userId: ticket.userId, kind: "antrean", title: "Nomor Anda dipanggil", message: "Nomor antrean " + ticket.number + " dipanggil. Silakan menuju petugas di dermaga." });
      }
    } else if (action === "skip") {
      if (ticket.status !== "menunggu" && ticket.status !== "dipanggil") throw badRequest("Tiket ini tidak dapat dilewati.");
      ticket.status = "dilewati";
    } else if (action === "done") {
      if (ticket.status !== "dipanggil") throw badRequest("Panggil pelanggan terlebih dahulu sebelum menyelesaikan.");
      ticket.status = "selesai";
      ticket.finishedAt = now;
      await queue.releaseOwner(ticket);
    } else if (action === "cancel") {
      if (ticket.status === "selesai" || ticket.status === "dibatalkan") throw badRequest("Tiket sudah selesai.");
      ticket.status = "dibatalkan";
      ticket.finishedAt = now;
      await queue.releaseOwner(ticket);
    } else {
      throw badRequest("Aksi tidak dikenal.");
    }

    await queue.saveTicket(ticket);
    return c.json({ data: ticket });
  });

  return app;
}
