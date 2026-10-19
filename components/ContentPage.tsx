import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";
import { PAGES, type PageKey } from "@/lib/pages";
import { pageJsonLd } from "@/lib/seo";
import JsonLd from "./JsonLd";
import SvgConverter from "./SvgConverter";

export default function ContentPage({ locale, pageKey }: { locale: Locale; pageKey: PageKey }) {
  const dict = getDictionary(locale);
  const page = dict.pages[pageKey];
  const def = PAGES[pageKey];

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8">
      {def.landing && (
        <nav aria-label={dict.footer.breadcrumb} className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          <ol className="flex flex-wrap gap-1">
            <li>
              <Link href={localePath(locale, "/")} className="hover:underline">{dict.pages.home.breadcrumb}</Link>
              <span aria-hidden="true" className="mx-1">/</span>
            </li>
            <li aria-current="page">{page.breadcrumb}</li>
          </ol>
        </nav>
      )}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.h1}</h1>
      <p className="mt-3 max-w-3xl text-lg text-slate-700 dark:text-slate-300">{page.intro}</p>

      {def.tool && (
        <div className="mt-8">
          <SvgConverter t={dict.tool} locale={locale} preset={def.tool} />
        </div>
      )}

      <div className="mx-auto mt-4 max-w-3xl">
        <article className="prose-content">
          {page.sections.map((section) => (
            <section key={section.h}>
              <h2>{section.h}</h2>
              {section.p.map((para) => (
                <p key={para}>{para}</p>
              ))}
              {"list" in section && section.list && (
                <ul>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <section className="mt-12" aria-labelledby="faq-title">
          <h2 id="faq-title" className="mb-4 text-xl font-semibold tracking-tight">{dict.common.faqTitle}</h2>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {page.faq.map((item) => (
              <details key={item.q} className="group p-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  {item.q}
                </summary>
                <p className="mt-2 leading-7 text-slate-700 dark:text-slate-300">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="mt-12" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-3 text-xl font-semibold tracking-tight">{dict.common.relatedTitle}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {def.related.map((key) => (
              <li key={key}>
                <Link
                  href={localePath(locale, PAGES[key].path)}
                  className="block rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                >
                  {dict.pages[key].h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {pageJsonLd(locale, pageKey).map((data) => (
        <JsonLd key={String(data["@type"])} data={data} />
      ))}
    </main>
  );
}
