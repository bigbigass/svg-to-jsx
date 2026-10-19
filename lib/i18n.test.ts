import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n";
import { LOCALES, localePath, splitLocale } from "./i18n/config";
import { PAGE_KEYS } from "./pages";

/** Flattens a dictionary into dotted key paths (array indexes included) → string values. */
function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }),
      {} as Record<string, unknown>,
    );
  }
  return { [prefix]: value };
}

const english = flatten(DICTIONARIES.en);

describe("dictionaries", () => {
  it.each(LOCALES)("%s has exactly the same keys as en", (locale) => {
    expect(Object.keys(flatten(DICTIONARIES[locale])).sort()).toEqual(Object.keys(english).sort());
  });

  it.each(LOCALES)("%s has no empty strings", (locale) => {
    for (const [key, value] of Object.entries(flatten(DICTIONARIES[locale]))) {
      expect(typeof value, key).toBe("string");
      expect((value as string).trim(), key).not.toBe("");
    }
  });

  it.each(LOCALES.filter((l) => l !== "en"))("%s is actually translated", (locale) => {
    const flat = flatten(DICTIONARIES[locale]);
    for (const key of PAGE_KEYS) {
      expect(flat[`pages.${key}.h1`], key).not.toBe(english[`pages.${key}.h1`]);
      expect(flat[`pages.${key}.intro`], key).not.toBe(english[`pages.${key}.intro`]);
    }
  });

  it.each(LOCALES)("%s keeps the same placeholders as en", (locale) => {
    const flat = flatten(DICTIONARIES[locale]);
    for (const [key, value] of Object.entries(english)) {
      const placeholders = (s: unknown) => String(s).match(/\{(n|line|detail|file)\}/g)?.sort() ?? [];
      expect(placeholders(flat[key]), `${locale}:${key}`).toEqual(placeholders(value));
    }
  });
});

describe("SEO copy", () => {
  it.each(LOCALES)("%s titles (<60) and descriptions (<155) fit and are unique", (locale) => {
    const pages = DICTIONARIES[locale].pages;
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const key of PAGE_KEYS) {
      const { title, description, faq } = pages[key];
      expect(title.length, `${locale}:${key} title`).toBeLessThan(60);
      expect(description.length, `${locale}:${key} description`).toBeLessThan(155);
      expect(faq.length, `${locale}:${key} faq`).toBeGreaterThanOrEqual(4);
      expect(faq.length, `${locale}:${key} faq`).toBeLessThanOrEqual(6);
      titles.add(title);
      descriptions.add(description);
    }
    expect(titles.size).toBe(PAGE_KEYS.length);
    expect(descriptions.size).toBe(PAGE_KEYS.length);
  });
});

describe("locale paths", () => {
  it("serves English at the root and other locales under a prefix", () => {
    expect(localePath("en", "/svg-to-vue/")).toBe("/svg-to-vue/");
    expect(localePath("ja", "/svg-to-vue/")).toBe("/ja/svg-to-vue/");
  });

  it("splits a pathname into locale and path", () => {
    expect(splitLocale("/")).toEqual({ locale: "en", path: "/" });
    expect(splitLocale("/zh")).toEqual({ locale: "zh", path: "/" });
    expect(splitLocale("/de/svg-to-react/")).toEqual({ locale: "de", path: "/svg-to-react/" });
    expect(splitLocale("/guides/svg-icons-in-react")).toEqual({ locale: "en", path: "/guides/svg-icons-in-react/" });
  });
});
