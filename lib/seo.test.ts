import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { LOCALES } from "./i18n/config";
import { PAGE_KEYS, PAGES } from "./pages";
import { hreflangMap, pageJsonLd, pageMetadata } from "./seo";
import { SITE_URL } from "./site";

describe("sitemap", () => {
  const entries = sitemap();

  it("contains every page × 7 locales", () => {
    expect(entries).toHaveLength(PAGE_KEYS.length * LOCALES.length);
    const urls = new Set(entries.map((e) => e.url));
    expect(urls.size).toBe(entries.length);
    for (const key of PAGE_KEYS) {
      for (const locale of LOCALES) {
        const prefix = locale === "en" ? "" : `/${locale}`;
        expect(urls.has(`${SITE_URL}${prefix}${PAGES[key].path}`), `${locale} ${key}`).toBe(true);
      }
    }
  });

  it("uses absolute URLs everywhere, including alternates", () => {
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https?:\/\//);
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages)).toHaveLength(8);
      for (const href of Object.values(languages)) expect(href).toMatch(/^https?:\/\//);
    }
  });
});

describe("metadata", () => {
  it("builds an hreflang map with 7 locales + x-default", () => {
    const map = hreflangMap("/svg-to-react/");
    expect(Object.keys(map).sort()).toEqual([...LOCALES, "x-default"].sort());
    expect(map["x-default"]).toBe(`${SITE_URL}/svg-to-react/`);
    expect(map.fr).toBe(`${SITE_URL}/fr/svg-to-react/`);
  });

  it("sets a self-referencing canonical and alternates on a sample page", () => {
    const meta = pageMetadata("de", "svgToVue");
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/de/svg-to-vue/`);
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages)).toHaveLength(8);
    expect(languages["x-default"]).toBe(`${SITE_URL}/svg-to-vue/`);
  });

  it("emits WebApplication, FAQPage and BreadcrumbList JSON-LD where expected", () => {
    const types = (key: (typeof PAGE_KEYS)[number]) => pageJsonLd("es", key).map((d) => d["@type"]);
    expect(types("home")).toEqual(["WebApplication", "FAQPage"]);
    expect(types("svgToSolid")).toEqual(["WebApplication", "FAQPage", "BreadcrumbList"]);
    expect(types("privacy")).toEqual(["FAQPage", "BreadcrumbList"]);
    const app = pageJsonLd("ja", "home")[0] as { offers: { price: string }; inLanguage: string };
    expect(app.offers.price).toBe("0");
    expect(app.inLanguage).toBe("ja");
  });
});
