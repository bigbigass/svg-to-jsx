# SvgJsx — SVG to JSX / React / Vue Component Converter

Free, client-side-only tool site that converts SVG markup into React (JSX/TSX), React Native (`react-native-svg`), Vue SFC, Solid components or plain JSX snippets. Files are read with `FileReader` and converted in the browser — nothing is uploaded, there is no backend.

Spec: [PROJECT.md](./PROJECT.md) · Build instructions: [BUILD.md](./BUILD.md)

## Stack

Next.js 16 (App Router, fully static) · TypeScript (strict) · Tailwind CSS v4 · Vitest · `@vercel/analytics` · `fflate` (client-side ZIP for batch mode). The converter (`lib/convert.ts` + `lib/svg-parser.ts`) is a dependency-free string/AST implementation that runs in Node and the browser.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest: converter, i18n, sitemap and metadata tests
npm run build   # static production build (every route is ○/●)
npm start       # serve the production build
```

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://svg-to-jsx.vercel.app` | Absolute base URL for canonical, hreflang, sitemap, robots, OG and JSON-LD URLs |

## Pages

Every page exists in 7 locales: English at the root, others under `/zh/`, `/es/`, `/de/`, `/fr/`, `/ja/`, `/pt/`.

| Path | Content |
| --- | --- |
| `/` | Converter (all formats) |
| `/svg-to-react/` | Landing, React preset |
| `/svg-to-tsx/` | Landing, React + TypeScript preset |
| `/svg-to-react-native/` | Landing, react-native-svg preset |
| `/svg-to-vue/` | Landing, Vue SFC preset |
| `/svg-to-solid/` | Landing, Solid preset |
| `/svg-currentcolor/` | Landing, currentColor + size preset |
| `/guides/svg-icons-in-react/` | Guide + tool |
| `/about/`, `/privacy/` | About, privacy policy |

Plus `/sitemap.xml` (every page × locale with `alternates.languages`), `/robots.txt`, `/opengraph-image` and `/icon.svg`.

## How it is organised

- `lib/convert.ts`, `lib/svg-parser.ts` — parser + converter (options: TypeScript, component name, currentColor, size prop, props spread, forwardRef, memo, remove width/height, strip xmlns/comments/metadata/unused ids, whitespace collapse, number rounding, default/named export; targets React, React Native, Vue, Solid, JSX snippet).
- `lib/i18n/` — locale config and dictionaries (`dictionaries/{locale}.json`, typed from `en.json`; tests enforce identical keys, no empty strings and matching placeholders).
- `lib/pages.ts` — page registry (path, tool preset, related links). `lib/seo.ts` — metadata (canonical, hreflang + `x-default`, OG/Twitter) and JSON-LD (`WebApplication`, `FAQPage`, `BreadcrumbList`).
- `app/(en)/…` — English routes at the root; `app/[locale]/…` — the six prefixed locales via `generateStaticParams` (`dynamicParams = false`). Both are thin wrappers around `components/ContentPage.tsx`, and each group has its own root layout so `<html lang>` is correct per locale. No middleware, no redirects.
- `components/SvgConverter.tsx` — the interactive client component. Analytics events: `copy_output`, `preset_click`, `locale_switch`.

## Deploying

Import the repo in Vercel (framework preset: Next.js) and optionally set `NEXT_PUBLIC_SITE_URL`. Enable Web Analytics in the Vercel project to receive the cookieless analytics events.
