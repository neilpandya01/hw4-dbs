import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/Page";
import { WelcomeFlow } from "./WelcomeFlow";

export const metadata: Metadata = { title: "Welcome · Dayplan" };

export default function WelcomePage() {
  // The step lives in the URL (?step=time), so the flow sits behind Suspense.
  return (
    <Suspense fallback={<ListSkeleton />}>
      <WelcomeFlow />
    </Suspense>
  );
}
