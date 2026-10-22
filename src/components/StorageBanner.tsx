"use client";

import Link from "next/link";
import { dismissStorageNotice, useStore } from "@/lib/store";
import { Button } from "./Button";

/** App-wide notice when saving to this device isn't working. */
export function StorageBanner() {
  const store = useStore();
  if (!store || store.storage === "ok") return null;

  const messages = {
    unavailable: <>This browser isn&rsquo;t saving. Tasks will disappear when you close the tab.</>,
    full: (
      <>
        Storage is full. Clear finished tasks on the{" "}
        <Link href="/done" className="font-semibold underline">
          Done page
        </Link>{" "}
        to keep saving.
      </>
    ),
    corrupt: <>We couldn&rsquo;t read your saved tasks, so we started a fresh list.</>,
  };

  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <p>{messages[store.storage]}</p>
      {store.storage === "corrupt" && (
        <Button variant="ghost" size="sm" onClick={dismissStorageNotice}>
          OK
        </Button>
      )}
    </div>
  );
}
