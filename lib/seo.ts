import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "./i18n/config";
import { getDictionary } from "./i18n";
import { PAGES, type PageKey } from "./pages";
import { SITE_NAME, SITE_URL } from "./site";

export function absoluteUrl(locale: Locale, path: string): string {
  return `${SITE_URL}${localePath(locale, path)}`;
}

/** hreflang → absolute URL for every locale plus `x-default` (English). */
export function hreflangMap(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = absoluteUrl(locale, path);
  languages["x-default"] = absoluteUrl(DEFAULT_LOCALE, path);
  return languages;
}

export function pageMetadata(locale: Locale, key: PageKey): Metadata {
  const dict = getDictionary(locale);
  const page = dict.pages[key];
  const url = absoluteUrl(locale, PAGES[key].path);
  const image = { url: `${SITE_URL}/opengraph-image/`, width: 1200, height: 630, alt: `${SITE_NAME} — ${dict.meta.tagline}` };
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: page.title },
    description: page.description,
    applicationName: SITE_NAME,
    alternates: { canonical: url, languages: hreflangMap(PAGES[key].path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title: page.title,
      description: page.description,
      locale: dict.meta.ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => getDictionary(l).meta.ogLocale),
      images: [image],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image.url] },
  };
}

type JsonLd = Record<string, unknown>;

export function pageJsonLd(locale: Locale, key: PageKey): JsonLd[] {
  const dict = getDictionary(locale);
  const page = dict.pages[key];
  const def = PAGES[key];
  const url = absoluteUrl(locale, def.path);
  const out: JsonLd[] = [];
  if (def.tool) {
    out.push({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: key === "home" ? SITE_NAME : `${SITE_NAME} — ${page.breadcrumb}`,
      url,
      description: page.description,
      inLanguage: locale,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  }
  if (page.faq.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  if (def.landing) {
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.pages.home.breadcrumb, item: absoluteUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: page.breadcrumb, item: url },
      ],
    });
  }
  return out;
}
