import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import zh from "./dictionaries/zh.json";
import es from "./dictionaries/es.json";
import de from "./dictionaries/de.json";
import fr from "./dictionaries/fr.json";
import ja from "./dictionaries/ja.json";
import pt from "./dictionaries/pt.json";

/** Every locale dictionary must match the shape of `en.json` (checked by the TypeScript compiler). */
export type Dictionary = typeof en;
export type ToolStrings = Dictionary["tool"];

export const DICTIONARIES: Record<Locale, Dictionary> = { en, zh, es, de, fr, ja, pt };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Replaces `{name}` placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));
}
