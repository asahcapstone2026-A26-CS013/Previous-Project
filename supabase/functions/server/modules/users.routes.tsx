import { Hono } from "npm:hono";
import type { AppEnv, Role, Routes, UserRecord } from "../core/types.tsx";
import { PERMISSIONS } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import { flag, image, oneOf, strings, text, validate } from "../core/validation.tsx";
import { badRequest, forbidden } from "../core/errors.tsx";
import { hasPermission } from "../core/guards.tsx";
import { toPublic } from "./users.tsx";

const permissionList = PERMISSIONS as unknown as string[];

const createSchema = {
  username: text("Username", { min: 3, max: 24 }),
  password: text("Katasandi", { min: 6, max: 72 }),
  role: oneOf("Peran", ["user", "admin"]),
  phone: text("Nomor telepon", { max: 20, required: false }),
  permissions: strings("Hak akses", permissionList),
};

const updateSchema = {
  username: text("Username", { min: 3, max: 24 }),
  password: text("Katasandi", { min: 6, max: 72 }),
  phone: text("Nomor telepon", { max: 20, required: false }),
  avatar: image("Foto"),
  disabled: flag("Status"),
  permissions: strings("Hak akses", permissionList),
};

/** Admin hanya boleh mengelola user biasa; superadmin mengelola admin. */
function assertCanManage(actor: UserRecord, targetRole: Role): void {
  if (targetRole === "superadmin") throw forbidden("Akun superadmin hanya dapat diubah dari profil sendiri.");
  if (targetRole === "admin" && actor.role !== "superadmin") throw forbidden("Hanya superadmin yang dapat mengelola admin.");
  if (targetRole === "user" && !hasPermission(actor, "pengguna")) throw forbidden();
}

export function userRoutes(deps: Deps): Routes {
  const app = new Hono<AppEnv>();
  const { users, guards } = deps;

  app.get("/users", guards.authenticated(), async function (c) {
    const role = (c.req.query("role") || "user") as Role;
    if (role !== "user" && role !== "admin") throw badRequest("Peran tidak valid.");
    assertCanManage(c.get("user"), role);
    const list = await users.list(role);
    return c.json({ data: list.map(toPublic) });
  });

  app.post("/users", guards.authenticated(), async function (c) {
    const input = validate(await c.req.json(), createSchema);
    assertCanManage(c.get("user"), input.role as Role);
    const created = await users.create({
      username: input.username,
      password: input.password,
      role: input.role as Role,
      phone: input.phone,
      permissions: input.permissions || (input.role === "admin" ? permissionList : []),
    });
    return c.json({ data: toPublic(created) }, 201);
  });

  app.patch("/users/:id", guards.authenticated(), async function (c) {
    const actor = c.get("user");
    const target = await users.mustFind(c.req.param("id"));
    assertCanManage(actor, target.role);
    const input = validate(await c.req.json(), updateSchema, true);

    if (input.username !== undefined) await users.rename(target, input.username);
    if (input.password !== undefined) {
      await users.setPassword(target, input.password);
      await users.revokeSessions(target.id);
    }
    if (input.phone !== undefined) target.phone = input.phone;
    if (input.avatar !== undefined) target.avatar = input.avatar;
    if (input.disabled !== undefined) {
      if (target.id === actor.id) throw badRequest("Anda tidak dapat menonaktifkan akun sendiri.");
      target.disabled = input.disabled;
      if (target.disabled) await users.revokeSessions(target.id);
    }
    if (input.permissions !== undefined) {
      if (actor.role !== "superadmin") throw forbidden("Hanya superadmin yang dapat mengatur hak akses.");
      if (target.role === "admin") target.permissions = users.cleanPermissions(input.permissions);
    }

    await users.save(target);
    return c.json({ data: toPublic(target) });
  });

  app.delete("/users/:id", guards.authenticated(), async function (c) {
    const actor = c.get("user");
    const target = await users.mustFind(c.req.param("id"));
    if (target.id === actor.id) throw badRequest("Anda tidak dapat menghapus akun sendiri.");
    assertCanManage(actor, target.role);
    await users.remove(target);
    return c.json({ ok: true });
  });

  return app;
}
