import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/Page";
import { CalendarView } from "./CalendarView";

export const metadata: Metadata = { title: "Calendar · Dayplan" };

// The chosen month and day live in the URL, so the view sits behind Suspense.
export default function CalendarPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CalendarView />
    </Suspense>
  );
}
