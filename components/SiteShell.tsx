import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";
import { PAGES } from "@/lib/pages";
import { SISTER_SITES, SITE_NAME } from "@/lib/site";
import LanguageSwitcher from "./LanguageSwitcher";

export default function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = getDictionary(locale);
  const href = (key: keyof typeof PAGES) => localePath(locale, PAGES[key].path);
  const nav = [
    { key: "svgToReact", label: t.nav.react },
    { key: "svgToTsx", label: t.nav.tsx },
    { key: "svgToReactNative", label: t.nav.reactNative },
    { key: "svgToVue", label: t.nav.vue },
    { key: "svgToSolid", label: t.nav.solid },
    { key: "guideSvgIconsInReact", label: t.nav.guide },
  ] as const;

  return (
    <html lang={locale}>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900">
          {t.nav.skip}
        </a>
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href={href("home")} className="flex items-center gap-2 font-semibold">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400">
                <path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />
              </svg>
              {SITE_NAME}
            </Link>
            <nav aria-label={t.nav.main} className="order-3 w-full sm:order-none sm:w-auto">
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {nav.map((item) => (
                  <li key={item.key}>
                    <Link href={href(item.key)} className="text-slate-700 underline-offset-4 hover:underline dark:text-slate-300">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <LanguageSwitcher locale={locale} label={t.nav.language} />
          </div>
        </header>
        {children}
        <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-slate-600 sm:grid-cols-3 dark:text-slate-400">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{SITE_NAME}</p>
              <p className="mt-1">{t.footer.note}</p>
            </div>
            <ul className="space-y-1">
              <li><Link href={href("about")} className="hover:underline">{t.footer.about}</Link></li>
              <li><Link href={href("privacy")} className="hover:underline">{t.footer.privacy}</Link></li>
            </ul>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{t.footer.sisterSites}</p>
              <ul className="mt-1 space-y-1">
                <li><a href={SISTER_SITES[0].url} className="hover:underline">{t.footer.contrast}</a></li>
                <li><a href={SISTER_SITES[1].url} className="hover:underline">{t.footer.aspect}</a></li>
              </ul>
            </div>
          </div>
          <p className="pb-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} {SITE_NAME}</p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
