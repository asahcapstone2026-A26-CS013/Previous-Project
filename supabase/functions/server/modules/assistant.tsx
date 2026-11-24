import { Hono } from "npm:hono";
import type { Store } from "../core/store.tsx";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import type { CatalogService, Voyage } from "./catalog.tsx";
import type { QueueService } from "./queue.tsx";
import { loadBusiness } from "./business.tsx";
import { badRequest, HttpError } from "../core/errors.tsx";
import { newId } from "../core/security.tsx";
import { flag, image, oneOf, text, validate } from "../core/validation.tsx";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const REQUEST_TIMEOUT_MS = 40000;

export type Intent = "produk_harga" | "jadwal_lokasi" | "antrean_pemesanan" | "keluhan" | "luar_konteks";

export interface AssistantSettings {
  name: string;
  avatar: string;
  greeting: string;
  instruction: string;
  apiKey: string;
  model: string;
  thinking: boolean;
  enabled: boolean;
}

export const DEFAULT_ASSISTANT: AssistantSettings = {
  name: "Asisten Lestari",
  avatar: "",
  greeting: "Halo, saya asisten KM. Karya Lestari. Tanyakan stok, harga, jadwal kapal, antrean, atau cara memesan ikan.",
  instruction: "Gunakan bahasa Indonesia yang ramah, singkat, dan jelas.",
  apiKey: "",
  model: "deepseek-flash",
  thinking: false,
  enabled: true,
};

export async function loadAssistant(store: Store): Promise<AssistantSettings> {
  return { ...DEFAULT_ASSISTANT, ...((await store.get("settings:assistant")) || {}) };
}

interface ChatRecord {
  id: string;
  userId: string;
  username: string;
  role: "user" | "assistant";
  content: string;
  intent: Intent | "";
  at: string;
}

/** Strategi klasifikasi intent berbasis kata kunci; mudah diganti dengan model lain. */
export interface IntentClassifier {
  classify(message: string): Intent;
}

export class KeywordIntentClassifier implements IntentClassifier {
  private rules: { intent: Intent; words: string[] }[] = [
    { intent: "keluhan", words: ["keluh", "kecewa", "komplain", "complain", "lambat", "tidak puas", "rusak", "busuk", "tidak segar", "salah", "protes", "marah"] },
    { intent: "antrean_pemesanan", words: ["antre", "antri", "nomor", "pesan", "order", "pre-order", "preorder", "cod", "transfer", "bayar", "beli", "booking"] },
    { intent: "jadwal_lokasi", words: ["jadwal", "kapal", "tiba", "datang", "lokasi", "alamat", "dermaga", "peta", "maps", "rute", "kapan", "buka"] },
    { intent: "produk_harga", words: ["harga", "stok", "stock", "ikan", "kg", "berapa", "jenis", "tersedia", "katalog", "murah", "segar"] },
  ];

  classify(message: string): Intent {
    const lower = message.toLowerCase();
    for (const rule of this.rules) {
      if (rule.words.some(function (word) { return lower.indexOf(word) >= 0; })) return rule.intent;
    }
    return "luar_konteks";
  }
}

export class ChatHistory {
  constructor(private store: Store) {}

  async add(record: Omit<ChatRecord, "id" | "at">): Promise<ChatRecord> {
    const at = new Date().toISOString();
    const full: ChatRecord = { id: newId(), at, ...record };
    await this.store.set("chat:" + record.userId + ":" + at + ":" + full.id, full);
    return full;
  }

  async forUser(userId: string): Promise<ChatRecord[]> {
    const all: ChatRecord[] = await this.store.list("chat:" + userId + ":");
    return all.sort(function (a, b) {
      return a.at.localeCompare(b.at);
    });
  }

  async all(): Promise<ChatRecord[]> {
    return await this.store.list("chat:");
  }

  async clear(userId: string): Promise<void> {
    for (const record of await this.forUser(userId)) {
      await this.store.del("chat:" + userId + ":" + record.at + ":" + record.id);
    }
  }
}

export class AssistantService {
  constructor(
    private store: Store,
    private catalog: CatalogService,
    private queue: QueueService,
    private history: ChatHistory,
    private classifier: IntentClassifier,
  ) {}

  private async buildContext(): Promise<string> {
    const business = await loadBusiness(this.store);
    const fishes = (await this.catalog.listFish()).filter(function (fish) {
      return fish.active;
    });
    const voyages: Voyage[] = (await this.store.list("voyage:")).filter(function (voyage: Voyage) {
      return voyage.status !== "selesai";
    });
    const session = await this.queue.activeSession();

    const lines: string[] = [];
    lines.push("Usaha: " + business.name + ". Alamat dermaga: " + business.address + ". Telepon: " + business.phone + ".");
    lines.push("Daftar ikan (harga acuan per kg dan stok tersisa saat ini):");
    for (const fish of fishes) {
      lines.push("- " + fish.name + ": Rp " + fish.price.toLocaleString("id-ID") + "/kg, stok " + fish.stock + " kg");
    }
    if (fishes.length === 0) lines.push("- Belum ada data ikan.");
    lines.push("Jadwal kapal:");
    for (const voyage of voyages) {
      lines.push("- " + voyage.name + ", status " + voyage.status + ", perkiraan tiba " + voyage.arrivalAt + ", estimasi tangkapan " + voyage.estimatedTons + " ton");
    }
    if (voyages.length === 0) lines.push("- Belum ada jadwal kapal.");
    lines.push("Antrean: " + (session && session.status === "buka" ? "sesi sedang dibuka" : "sesi sedang ditutup") + ".");
    lines.push("Cara antre: login, buka menu Antrean, tekan Ambil Nomor saat sesi dibuka. Nomor urut berdasarkan waktu server (first come first served).");
    lines.push("Cara pre-order: buka menu Katalog, pilih jenis ikan dan berat, pilih metode ambil di dermaga atau antar, pilih bayar COD atau transfer. Pesanan melebihi stok ditolak. Admin akan mengonfirmasi atau menolak.");
    return lines.join("\n");
  }

  private async buildMessages(settings: AssistantSettings, userId: string, message: string, intent: Intent) {
    const context = await this.buildContext();
    const system = [
      "Kamu adalah " + settings.name + ", asisten pelanggan resmi usaha ikan segar KM. Karya Lestari di Sibolga.",
      settings.instruction,
      "Jawab hanya berdasarkan DATA USAHA di bawah. Jangan mengarang harga, stok, jadwal, atau informasi lain. Jika informasi tidak ada, katakan tidak tahu dan arahkan pelanggan menghubungi admin lewat nomor telepon usaha.",
      "Jika pertanyaan tidak berkaitan dengan usaha ikan segar ini (misalnya politik, coding, matematika, hiburan), tolak dengan sopan dalam satu atau dua kalimat dan tawarkan bantuan seputar ikan, antrean, jadwal, atau pemesanan.",
      "Jika pelanggan menyampaikan keluhan, minta maaf dengan tulus, ringkas masalahnya, dan sampaikan bahwa keluhan diteruskan ke admin.",
      "Intent terdeteksi: " + intent + ".",
      "Contoh gaya: Pelanggan: 'ikan apa saja hari ini?' Asisten: 'Hari ini tersedia ... (sebut dari data). Mau pesan lewat menu Katalog?'",
      "DATA USAHA:\n" + context,
    ].join("\n\n");

    const past = (await this.history.forUser(userId)).slice(-8);
    const messages: { role: string; content: string }[] = [{ role: "system", content: system }];
    for (const item of past) {
      messages.push({ role: item.role, content: item.content });
    }
    messages.push({ role: "user", content: message });
    return messages;
  }

  private async callModel(settings: AssistantSettings, messages: { role: string; content: string }[]): Promise<string> {
    if (!settings.apiKey) throw new HttpError(503, "Asisten belum dikonfigurasi. Admin perlu mengisi API key.");

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const body: Record<string, unknown> = {
        model: settings.model,
        messages,
        stream: false,
        thinking: { type: settings.thinking ? "enabled" : "disabled" },
      };
      if (settings.thinking) body.reasoning_effort = "high";

      const response = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + settings.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 401) throw new HttpError(502, "API key asisten tidak valid. Hubungi admin.");
      if (response.status === 402 || response.status === 429) throw new HttpError(502, "Kuota layanan AI sedang habis atau penuh. Coba lagi nanti.");
      if (!response.ok) throw new HttpError(502, "Layanan AI sedang bermasalah. Coba lagi nanti.");

      const data = await response.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) throw new HttpError(502, "Layanan AI tidak memberikan jawaban. Coba lagi.");
      return String(content).trim();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error && (error as Error).name === "AbortError") throw new HttpError(504, "Layanan AI terlalu lama merespons. Coba lagi.");
      throw new HttpError(502, "Layanan AI tidak dapat dihubungi. Fitur lain tetap berjalan.");
    } finally {
      clearTimeout(timer);
    }
  }

  async chat(user: { id: string; username: string }, message: string) {
    const settings = await loadAssistant(this.store);
    if (!settings.enabled) throw new HttpError(503, "Asisten sedang dinonaktifkan.");

    const intent = this.classifier.classify(message);
    const messages = await this.buildMessages(settings, user.id, message, intent);
    const reply = await this.callModel(settings, messages);

    await this.history.add({ userId: user.id, username: user.username, role: "user", content: message, intent });
    const saved = await this.history.add({ userId: user.id, username: user.username, role: "assistant", content: reply, intent });
    return { reply: saved, intent };
  }
}

const settingsSchema = {
  name: text("Nama asisten", { min: 2, max: 40 }),
  avatar: image("Foto asisten"),
  greeting: text("Kalimat pembuka", { min: 3, max: 400 }),
  instruction: text("Gaya bahasa", { max: 500, required: false }),
  apiKey: text("API key", { min: 8, max: 200, required: false }),
  model: oneOf("Model", ["deepseek-flash", "deepseek-v4-pro"]),
  thinking: flag("Mode berpikir"),
  enabled: flag("Status"),
};

function maskKey(key: string): string {
  return key ? "••••" + key.slice(-4) : "";
}

export function assistantRoutes(deps: Deps, service: AssistantService, history: ChatHistory): Routes {
  const app = new Hono<AppEnv>();
  const { store, guards } = deps;
  const manage = guards.permission("asisten");

  app.get("/assistant/profile", guards.authenticated(), async function (c) {
    const settings = await loadAssistant(store);
    return c.json({ data: { name: settings.name, avatar: settings.avatar, greeting: settings.greeting, enabled: settings.enabled } });
  });

  app.get("/assistant/settings", guards.authenticated(), manage, async function (c) {
    const { apiKey, ...rest } = await loadAssistant(store);
    return c.json({ data: { ...rest, hasKey: Boolean(apiKey), keyHint: maskKey(apiKey) } });
  });

  app.put("/assistant/settings", guards.authenticated(), manage, async function (c) {
    const input = validate(await c.req.json(), settingsSchema, true);
    const current = await loadAssistant(store);
    if (!input.apiKey) delete input.apiKey;
    const next = { ...current, ...input };
    await store.set("settings:assistant", next);
    const { apiKey, ...rest } = next;
    return c.json({ data: { ...rest, hasKey: Boolean(apiKey), keyHint: maskKey(apiKey) } });
  });

  app.delete("/assistant/settings/key", guards.authenticated(), manage, async function (c) {
    const current = await loadAssistant(store);
    await store.set("settings:assistant", { ...current, apiKey: "" });
    return c.json({ ok: true });
  });

  app.post("/assistant/chat", guards.authenticated(), async function (c) {
    const input = validate(await c.req.json(), { message: text("Pesan", { min: 1, max: 500 }) });
    if (!/[\p{L}\p{N}]/u.test(input.message)) throw badRequest("Tulis pertanyaan dengan huruf atau angka.");
    return c.json({ data: await service.chat(c.get("user"), input.message) });
  });

  app.get("/assistant/history", guards.authenticated(), async function (c) {
    return c.json({ data: await history.forUser(c.get("user").id) });
  });

  app.delete("/assistant/history", guards.authenticated(), async function (c) {
    await history.clear(c.get("user").id);
    return c.json({ ok: true });
  });

  app.get("/assistant/conversations", guards.authenticated(), manage, async function (c) {
    const all = await history.all();
    const groups: Record<string, { userId: string; username: string; count: number; lastAt: string; intents: Record<string, number> }> = {};
    for (const record of all) {
      const group = groups[record.userId] || { userId: record.userId, username: record.username, count: 0, lastAt: "", intents: {} };
      group.count += 1;
      if (record.at > group.lastAt) group.lastAt = record.at;
      if (record.role === "user" && record.intent) group.intents[record.intent] = (group.intents[record.intent] || 0) + 1;
      groups[record.userId] = group;
    }
    const data = Object.values(groups).sort(function (a, b) { return b.lastAt.localeCompare(a.lastAt); });
    return c.json({ data });
  });

  app.get("/assistant/conversations/:userId", guards.authenticated(), manage, async function (c) {
    return c.json({ data: await history.forUser(c.req.param("userId")) });
  });

  app.delete("/assistant/conversations/:userId", guards.authenticated(), manage, async function (c) {
    await history.clear(c.req.param("userId"));
    return c.json({ ok: true });
  });

  return app;
}
