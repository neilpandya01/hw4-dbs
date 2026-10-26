"use client";

import { reloadStore, useStore } from "@/lib/store";
import { Button } from "./Button";

/** App-wide notice when your list can't be loaded from, or saved to, your account. */
export function StorageBanner() {
  const store = useStore();
  if (!store || store.storage === "ok") return null;

  const messages = {
    "load-failed": "Couldn't load your tasks. Check your connection, then try again.",
    "save-failed": "Your last change didn't save. Check your connection, then reload your list to see what's saved.",
  };

  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <p>{messages[store.storage]}</p>
      <Button variant="ghost" size="sm" onClick={reloadStore}>
        {store.storage === "load-failed" ? "Try again" : "Reload list"}
      </Button>
    </div>
  );
}
