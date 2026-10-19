"use client";

import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";
import { LANGUAGE_NAMES, LOCALES, localePath, splitLocale, type Locale } from "@/lib/i18n/config";

export default function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const { path } = splitLocale(usePathname() || "/");
  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <span className="sr-only">{label}: </span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
        {LANGUAGE_NAMES[locale]}
      </summary>
      <ul className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={localePath(l, path)}
              hrefLang={l}
              lang={l}
              aria-current={l === locale ? "true" : undefined}
              onClick={() => track("locale_switch", { from: locale, to: l })}
              className={`block px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${l === locale ? "font-semibold" : ""}`}
            >
              {LANGUAGE_NAMES[l]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
