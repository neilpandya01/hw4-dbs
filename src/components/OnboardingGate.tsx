"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNewUser, useStore } from "@/lib/store";

/**
 * Onboarding is required: someone new who opens any page (Today, At a Glance, Calendar, Done, Add)
 * is sent to /welcome first. /welcome itself sends people who have finished onward. Renders nothing.
 */
export function OnboardingGate() {
  const store = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const mustOnboard = !!store && isNewUser(store.data) && pathname !== "/welcome";

  useEffect(() => {
    if (mustOnboard) router.replace("/welcome");
  }, [mustOnboard, router]);

  return null;
}
