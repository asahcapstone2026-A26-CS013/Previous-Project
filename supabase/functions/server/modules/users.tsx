import type { Store } from "../core/store.tsx";
import type { PublicUser, UserRecord, Role } from "../core/types.tsx";
import { PERMISSIONS } from "../core/types.tsx";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../core/errors.tsx";
import { hashPassword, newId, newToken, verifyPassword } from "../core/security.tsx";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function toPublic(user: UserRecord): PublicUser {
  const { salt: _salt, hash: _hash, ...rest } = user;
  return rest;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function checkUsername(username: string): void {
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username)) {
    throw badRequest("Username 3-24 karakter, hanya huruf, angka, titik, dan garis bawah.");
  }
}

export function checkPassword(password: string): void {
  if (password.length < 6) throw badRequest("Katasandi minimal 6 karakter.");
  if (password.length > 72) throw badRequest("Katasandi maksimal 72 karakter.");
}

export class UserService {
  constructor(private store: Store) {}

  async findById(id: string): Promise<UserRecord | undefined> {
    return await this.store.get("user:" + id);
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const index = await this.store.get("uname:" + normalizeUsername(username));
    if (!index) return undefined;
    return await this.findById(index.id);
  }

  async create(input: { username: string; password: string; role: Role; permissions?: string[]; phone?: string; avatar?: string }): Promise<UserRecord> {
    checkUsername(input.username);
    checkPassword(input.password);

    const id = newId();
    const claimed = await this.store.claim("uname:" + normalizeUsername(input.username), { id });
    if (!claimed) throw conflict("Username sudah dipakai.");

    const secret = await hashPassword(input.password);
    const user: UserRecord = {
      id,
      username: input.username.trim(),
      role: input.role,
      permissions: input.role === "admin" ? this.cleanPermissions(input.permissions) : [],
      avatar: input.avatar || "",
      phone: input.phone || "",
      salt: secret.salt,
      hash: secret.hash,
      disabled: false,
      createdAt: new Date().toISOString(),
    };
    await this.store.set("user:" + id, user);
    return user;
  }

  cleanPermissions(values?: string[]): string[] {
    const list = values || [];
    return PERMISSIONS.filter(function (permission) {
      return list.indexOf(permission) >= 0;
    });
  }

  async rename(user: UserRecord, username: string): Promise<void> {
    if (normalizeUsername(user.username) === normalizeUsername(username)) {
      user.username = username.trim();
      return;
    }
    checkUsername(username);
    const claimed = await this.store.claim("uname:" + normalizeUsername(username), { id: user.id });
    if (!claimed) throw conflict("Username sudah dipakai.");
    await this.store.del("uname:" + normalizeUsername(user.username));
    user.username = username.trim();
  }

  async setPassword(user: UserRecord, password: string): Promise<void> {
    checkPassword(password);
    const secret = await hashPassword(password);
    user.salt = secret.salt;
    user.hash = secret.hash;
  }

  async save(user: UserRecord): Promise<void> {
    await this.store.set("user:" + user.id, user);
  }

  async remove(user: UserRecord): Promise<void> {
    await this.store.del("uname:" + normalizeUsername(user.username));
    await this.store.del("user:" + user.id);
    await this.revokeSessions(user.id);
  }

  async list(role?: Role): Promise<UserRecord[]> {
    const all: UserRecord[] = await this.store.list("user:");
    return all
      .filter(function (user) {
        return role ? user.role === role : true;
      })
      .sort(function (a, b) {
        return a.createdAt.localeCompare(b.createdAt);
      });
  }

  async login(username: string, password: string): Promise<{ token: string; user: UserRecord }> {
    const user = await this.findByUsername(username);
    const valid = user ? await verifyPassword(password, user.salt, user.hash) : false;
    if (!user || !valid) throw unauthorized("Username atau katasandi salah.");
    if (user.disabled) throw forbidden("Akun ini dinonaktifkan. Hubungi admin.");

    const token = newToken();
    await this.store.set("sess:" + token, { userId: user.id, userKey: user.id, exp: Date.now() + SESSION_TTL_MS });
    await this.store.set("usess:" + user.id + ":" + token, { token });
    return { token, user };
  }

  async logout(token: string): Promise<void> {
    const session = await this.store.get("sess:" + token);
    await this.store.del("sess:" + token);
    if (session) await this.store.del("usess:" + session.userId + ":" + token);
  }

  async revokeSessions(userId: string, keepToken?: string): Promise<void> {
    const entries: { token: string }[] = await this.store.list("usess:" + userId + ":");
    for (const entry of entries) {
      if (entry.token === keepToken) continue;
      await this.store.del("sess:" + entry.token);
      await this.store.del("usess:" + userId + ":" + entry.token);
    }
  }

  async resolveSession(token: string): Promise<UserRecord> {
    const session = await this.store.get("sess:" + token);
    if (!session || session.exp < Date.now()) throw unauthorized("Sesi berakhir. Silakan masuk kembali.");
    const user = await this.findById(session.userId);
    if (!user || user.disabled) throw unauthorized("Akun tidak aktif.");
    return user;
  }

  async mustFind(id: string): Promise<UserRecord> {
    const user = await this.findById(id);
    if (!user) throw notFound("Pengguna tidak ditemukan.");
    return user;
  }
}
