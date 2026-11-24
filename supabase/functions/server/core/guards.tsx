import type { MiddlewareHandler } from "npm:hono";
import type { AppEnv, UserRecord } from "./types.tsx";
import { forbidden, unauthorized } from "./errors.tsx";
import type { UserService } from "../modules/users.tsx";

export function hasPermission(user: UserRecord, permission: string): boolean {
  if (user.role === "superadmin") return true;
  return user.role === "admin" && user.permissions.indexOf(permission) >= 0;
}

export function isStaff(user: UserRecord): boolean {
  return user.role === "admin" || user.role === "superadmin";
}

export class Guards {
  constructor(private users: UserService) {}

  authenticated(): MiddlewareHandler<AppEnv> {
    const users = this.users;
    return async function (c, next) {
      const token = c.req.header("X-Session");
      if (!token) throw unauthorized();
      c.set("user", await users.resolveSession(token));
      await next();
    };
  }

  permission(permission: string): MiddlewareHandler<AppEnv> {
    return async function (c, next) {
      if (!hasPermission(c.get("user"), permission)) throw forbidden();
      await next();
    };
  }

  superadmin(): MiddlewareHandler<AppEnv> {
    return async function (c, next) {
      if (c.get("user").role !== "superadmin") throw forbidden("Hanya superadmin yang dapat melakukan aksi ini.");
      await next();
    };
  }
}
