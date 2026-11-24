import { Hono } from "npm:hono";
import type { AppEnv, Routes } from "../core/types.tsx";
import type { Deps } from "../core/deps.tsx";
import { image, text, validate } from "../core/validation.tsx";
import { badRequest, unauthorized } from "../core/errors.tsx";
import { verifyPassword } from "../core/security.tsx";
import { toPublic } from "./users.tsx";

const registerSchema = {
  username: text("Username", { min: 3, max: 24 }),
  password: text("Katasandi", { min: 6, max: 72 }),
  phone: text("Nomor telepon", { max: 20, required: false }),
};

const loginSchema = {
  username: text("Username", { max: 24 }),
  password: text("Katasandi", { max: 72 }),
};

const profileSchema = {
  username: text("Username", { min: 3, max: 24 }),
  phone: text("Nomor telepon", { max: 20, required: false }),
  avatar: image("Foto"),
};

const passwordSchema = {
  currentPassword: text("Katasandi saat ini", { max: 72 }),
  newPassword: text("Katasandi baru", { min: 6, max: 72 }),
};

export function authRoutes(deps: Deps): Routes {
  const app = new Hono<AppEnv>();
  const { users, guards } = deps;

  app.post("/auth/register", async function (c) {
    const input = validate(await c.req.json(), registerSchema);
    await users.create({ username: input.username, password: input.password, role: "user", phone: input.phone });
    const session = await users.login(input.username, input.password);
    return c.json({ token: session.token, user: toPublic(session.user) }, 201);
  });

  app.post("/auth/login", async function (c) {
    const input = validate(await c.req.json(), loginSchema);
    const session = await users.login(input.username, input.password);
    return c.json({ token: session.token, user: toPublic(session.user) });
  });

  app.post("/auth/logout", guards.authenticated(), async function (c) {
    await users.logout(c.req.header("X-Session") || "");
    return c.json({ ok: true });
  });

  app.get("/auth/me", guards.authenticated(), function (c) {
    return c.json({ user: toPublic(c.get("user")) });
  });

  app.patch("/auth/me", guards.authenticated(), async function (c) {
    const user = c.get("user");
    const input = validate(await c.req.json(), profileSchema, true);

    if (input.username !== undefined) await users.rename(user, input.username);
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.avatar !== undefined) user.avatar = input.avatar;

    await users.save(user);
    return c.json({ user: toPublic(user) });
  });

  app.put("/auth/me/password", guards.authenticated(), async function (c) {
    const user = c.get("user");
    const input = validate(await c.req.json(), passwordSchema);

    const valid = await verifyPassword(input.currentPassword, user.salt, user.hash);
    if (!valid) throw unauthorized("Katasandi saat ini salah.");
    if (input.currentPassword === input.newPassword) throw badRequest("Katasandi baru harus berbeda dari yang lama.");

    await users.setPassword(user, input.newPassword);
    await users.save(user);
    await users.revokeSessions(user.id, c.req.header("X-Session"));
    return c.json({ ok: true });
  });

  return app;
}
