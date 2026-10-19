# SvgJsx — SVG to JSX / React / Vue Component Converter

Slug/repo: `svg-to-jsx` · Target: Vercel `svg-to-jsx.vercel.app` (owner deploys; do not deploy). Free, client-side-only tool site for overseas (Google) SEO. Primary keyword: **SVG to JSX/React component converter**.

## Core tool
- Paste SVG or drop .svg file(s) (read with FileReader; never uploaded) → React component output.
- Options: TypeScript (`SVGProps<SVGSVGElement>`), component name (auto PascalCase from filename), `currentColor` replacement for fill/stroke, `size` prop (width/height), spread `{...props}`, `forwardRef`, `memo`, remove width/height (keep viewBox), strip `xmlns`/comments/metadata/ids, export style (default/named), React Native (`react-native-svg`) output, Vue SFC output, Solid output, plain JSX snippet.
- Conversions: attributes to camelCase (`stroke-width`→`strokeWidth`, `xlink:href`→`xlinkHref`, `class`→`className`), `style="a:b"`→object, `data-*`/`aria-*` preserved.
- Light SVG optimisation (no SVGO dependency required; keep bundle small): collapse whitespace, round numbers to N decimals option.
- Live preview of the SVG (rendered sandboxed via `<img src=data:...>` — never inject raw HTML) and output size before/after. Batch mode → zip download (client-side `fflate`).
- Logic in `lib/convert.ts` (DOMParser-free pure string/AST approach usable in Node tests, e.g. small XML parser or `@xmldom/xmldom`) with tests for each option, malformed SVG errors, and snapshot of a sample icon.

## Pages (each in 7 locales)
- `/` converter
- `/svg-to-react/`, `/svg-to-tsx/`, `/svg-to-react-native/`, `/svg-to-vue/`, `/svg-to-solid/`, `/svg-currentcolor/` landings (preset options)
- `/guides/svg-icons-in-react/`, `/about/`, `/privacy/`

## i18n (mandatory)
- Locales: en (default, served at `/`), zh, es, de, fr, ja, pt — served at `/zh/`, `/es/`, `/de/`, `/fr/`, `/ja/`, `/pt/`.
- App Router structure: `app/[locale]/...` with `generateStaticParams` for all locales; English rendered at root via middleware/`proxy` rewrite OR a duplicated root route group (no redirect for `/`). All pages statically generated (SSG), no server runtime needed.
- Dictionaries: `lib/i18n/dictionaries/{locale}.json`, typed via the `en.json` shape; every key must exist in every locale (enforced by a test). Native-quality translations of UI, H1, meta title/description, FAQ, and landing-page copy (not just UI chrome).
- `<html lang>` set per locale. Language switcher in header that keeps the current path.
- Every page: `alternates.languages` in `generateMetadata` producing `<link rel="alternate" hreflang="xx">` for all 7 locales + `x-default` (→ English), and a self-referencing canonical.
- `app/sitemap.ts`: every page × every locale, each entry with `alternates.languages`. `app/robots.ts` pointing to sitemap.
- Base URL from `NEXT_PUBLIC_SITE_URL` (fallback `https://svg-to-jsx.vercel.app`).

## SEO
- Unique title (<60 chars) and meta description (<155 chars) per page per locale; OG + Twitter tags; generated OG image via `app/opengraph-image.tsx` (static).
- JSON-LD: `WebApplication` (price 0) on tool pages, `FAQPage` on pages with FAQ, `BreadcrumbList` on landing pages.
- Each page: one H1, 300–700 words of genuinely useful explanatory content below the tool, 4–6 FAQs, internal links to related landing pages.
- Core Web Vitals: no layout shift, tool interactive client component, content server-rendered. Lighthouse SEO/Accessibility ≥ 95.
- Footer: About, Privacy (states all processing is in-browser; Vercel Analytics is cookieless), link to sister sites (ContrastCheck https://wcag-contrastcheck.vercel.app, Aspect Ratio Calculator https://aspectratiocalc.top).

## Analytics
- `@vercel/analytics` `<Analytics />` in root layout. Custom events via `track()`: `copy_output`, `preset_click`, `locale_switch`.

## Tech
- Next.js (latest, App Router) + TypeScript strict + Tailwind CSS v4, same stack as github.com/bigbigass/contrast-check. Vitest for tests. No backend, no DB, no paid APIs, no external runtime requests. Dark mode via `prefers-color-scheme`.

## Tests (Vitest, `npm test`)
- Core logic unit tests (see feature section) — at least 25 cases.
- i18n test: all locale dictionaries have identical key sets, no empty strings.
- Sitemap test: contains every page × 7 locales, all URLs absolute.
- Metadata test: hreflang map for a sample page has 7 locales + x-default.

## Acceptance
- `npm test` and `npm run build` pass with zero errors; build output shows all routes as static (○/●).
