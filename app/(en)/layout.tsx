import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
