import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { PAGE_KEYS, PAGES } from "@/lib/pages";
import { absoluteUrl, hreflangMap } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGE_KEYS.flatMap((key) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(locale, PAGES[key].path),
      changeFrequency: "monthly" as const,
      priority: key === "home" ? 1 : PAGES[key].tool ? 0.8 : 0.4,
      alternates: { languages: hreflangMap(PAGES[key].path) },
    })),
  );
}
