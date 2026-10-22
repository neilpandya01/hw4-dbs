import type { Metadata } from "next";
import { DoneView } from "./DoneView";

export const metadata: Metadata = { title: "Done · Dayplan" };

export default function DonePage() {
  return <DoneView />;
}
