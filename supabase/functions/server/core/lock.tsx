import type { Store } from "./store.tsx";
import { conflict } from "./errors.tsx";

const LOCK_TTL_MS = 10000;
const RETRY_DELAY_MS = 60;
const MAX_ATTEMPTS = 60;

function wait(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function acquire(store: Store, key: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const granted = await store.claim(key, { at: Date.now() });
    if (granted) return;

    const current = await store.get(key);
    if (current && Date.now() - current.at > LOCK_TTL_MS) {
      await store.del(key);
    }
    await wait(RETRY_DELAY_MS);
  }
  throw conflict("Sistem sedang sibuk, silakan coba lagi.");
}

/** Mengunci beberapa sumber daya (diurutkan agar tidak deadlock) selama aksi berjalan. */
export async function withLocks<T>(store: Store, names: string[], action: () => Promise<T>): Promise<T> {
  const keys = Array.from(new Set(names)).sort().map(function (name) {
    return "lock:" + name;
  });
  const held: string[] = [];
  try {
    for (const key of keys) {
      await acquire(store, key);
      held.push(key);
    }
    return await action();
  } finally {
    for (const key of held) {
      await store.del(key);
    }
  }
}
