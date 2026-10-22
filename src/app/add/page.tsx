import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, PageHeader } from "@/components/Page";
import { AddForm } from "./AddForm";

export const metadata: Metadata = { title: "Add a task · Dayplan" };

export default function AddPage() {
  return (
    <>
      <PageHeader title="Add a task" subtitle="Pick the day you want to do it." />
      <Suspense fallback={<ListSkeleton />}>
        <AddForm />
      </Suspense>
    </>
  );
}
