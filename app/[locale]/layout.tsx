import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { asLocale, PREFIXED_LOCALES } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return <SiteShell locale={asLocale((await params).locale)}>{children}</SiteShell>;
}
