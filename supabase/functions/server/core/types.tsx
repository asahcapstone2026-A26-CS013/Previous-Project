import type { Hono } from "npm:hono";

export const PERMISSIONS = [
  "ikan",
  "harga",
  "pelayaran",
  "antrean",
  "pesanan",
  "transaksi",
  "laporan",
  "pengumuman",
  "pengguna",
  "asisten",
  "usaha",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "superadmin" | "admin" | "user";

export interface UserRecord {
  id: string;
  username: string;
  role: Role;
  permissions: string[];
  avatar: string;
  phone: string;
  salt: string;
  hash: string;
  disabled: boolean;
  createdAt: string;
}

export type PublicUser = Omit<UserRecord, "salt" | "hash">;

export type AppEnv = { Variables: { user: UserRecord } };
export type Routes = Hono<AppEnv>;
