import type { Metadata } from "next";
import { GlanceView } from "./GlanceView";

export const metadata: Metadata = { title: "At a Glance · Dayplan" };

export default function GlancePage() {
  return <GlanceView />;
}
