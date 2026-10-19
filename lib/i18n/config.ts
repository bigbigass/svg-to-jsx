export const LOCALES = ["en", "zh", "es", "de", "fr", "ja", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

/** Native language names for the language switcher. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
  pt: "Português",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function asLocale(value: string): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Prefixes a site path (always starting and ending with `/`) with the locale; English lives at the root. */
export function localePath(locale: Locale, path: string): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;
}

/** Splits a pathname into its locale and the locale-independent path (with trailing slash). */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const match = normalized.match(/^\/([a-z]{2})(\/.*)$/);
  if (match && isLocale(match[1]) && match[1] !== DEFAULT_LOCALE) return { locale: match[1], path: match[2] };
  return { locale: DEFAULT_LOCALE, path: normalized };
}
