import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AddedAnnouncer } from "@/components/AddedAnnouncer";
import { AppHeader } from "@/components/AppHeader";
import { DayRollover } from "@/components/DayRollover";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Nav, NavTabs } from "@/components/Nav";
import { SignedInOnly } from "@/components/SignedInOnly";
import { StorageBanner } from "@/components/StorageBanner";
import { ToastProvider } from "@/components/Toast";
import { WeatherSync } from "@/components/WeatherSync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dayplan",
  description: "A day-by-day to-do list that remembers you on this device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          <ToastProvider>
            {/* First thing a keyboard user reaches: jump past the header and tabs to the page itself. */}
            <a
              href="#main"
              className="sr-only z-30 rounded-lg bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
            >
              Skip to main content
            </a>
            <SignedInOnly>
              {/* Nav reads the URL, so it needs its own Suspense boundary under Cache Components. */}
              <AppHeader
                nav={
                  <Suspense fallback={<NavTabs />}>
                    <Nav />
                  </Suspense>
                }
              />
            </SignedInOnly>
            <main id="main" tabIndex={-1} className="mx-auto outline-none flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-6 pb-24">
              <SignedInOnly>
                <StorageBanner />
                <AddedAnnouncer />
                <DayRollover />
                {/* Reads the URL, so it needs its own Suspense boundary under Cache Components. */}
                <Suspense fallback={null}>
                  <OnboardingGate />
                </Suspense>
                {/* Loads weather settings and keeps the forecast fresh. Reads the URL, so it has its own Suspense. */}
                <Suspense fallback={null}>
                  <WeatherSync />
                </Suspense>
              </SignedInOnly>
              {children}
            </main>
            <SignedInOnly>
              <footer className="mx-auto w-full max-w-xl px-4 pb-6 text-center text-sm text-muted">
                Saved on this device
              </footer>
            </SignedInOnly>
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
