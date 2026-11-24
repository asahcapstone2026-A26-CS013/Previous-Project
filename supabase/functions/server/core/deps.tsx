import type { Store } from "./store.tsx";
import type { Guards } from "./guards.tsx";
import type { UserService } from "../modules/users.tsx";
import type { Notifier } from "../modules/notifications.tsx";

export interface Deps {
  store: Store;
  users: UserService;
  guards: Guards;
  notifier: Notifier;
}
