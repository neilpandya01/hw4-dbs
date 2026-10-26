import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <p className="text-xl font-semibold tracking-tight text-ink">Dayplan</p>
      {/* Clerk's form reads the URL, so it needs its own Suspense boundary under Cache Components. */}
      <Suspense fallback={<div aria-busy="true" className="h-96 w-full max-w-sm animate-pulse rounded-xl bg-surface" />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
