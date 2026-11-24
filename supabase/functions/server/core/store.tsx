import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "../kv_store.tsx";

const TABLE = "kv_store_c71cd2a9";

/** Kontrak penyimpanan. Semua modul hanya bergantung pada antarmuka ini. */
export interface Store {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<any[]>;
  /** Menulis hanya jika kunci belum ada. Atomik di sisi database. */
  claim(key: string, value: any): Promise<boolean>;
}

export class SupabaseStore implements Store {
  get(key: string) {
    return kv.get(key);
  }

  set(key: string, value: any) {
    return kv.set(key, value);
  }

  del(key: string) {
    return kv.del(key);
  }

  list(prefix: string) {
    return kv.getByPrefix(prefix);
  }

  async claim(key: string, value: any): Promise<boolean> {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await client.from(TABLE).insert({ key, value });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw new Error(error.message);
  }
}

export class MemoryStore implements Store {
  private data = new Map<string, any>();

  async get(key: string) {
    return this.data.get(key);
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
  }

  async del(key: string) {
    this.data.delete(key);
  }

  async list(prefix: string) {
    const result: any[] = [];
    for (const [key, value] of this.data) {
      if (key.startsWith(prefix)) result.push(value);
    }
    return result;
  }

  async claim(key: string, value: any) {
    if (this.data.has(key)) return false;
    this.data.set(key, value);
    return true;
  }
}
