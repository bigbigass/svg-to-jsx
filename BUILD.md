# BUILD.md — instructions for a Claude Code cloud session

You are implementing this repo end to end. Read PROJECT.md fully first; it is the spec.

1. Scaffold in the repo root (do not create a subfolder): Next.js latest App Router + TypeScript + Tailwind v4 + Vitest, mirroring github.com/bigbigass/contrast-check (`"test": "vitest run"`). Add `@vercel/analytics`.
2. Implement pure logic in `lib/` first, with Vitest tests, then UI client components, then pages/landings, then i18n dictionaries for all 7 locales (en, zh, es, de, fr, ja, pt) with real translations of all copy, then metadata/hreflang/sitemap/robots/JSON-LD/OG.
3. No network calls at runtime, no secrets, no paid services, no backend. Everything statically generated.
4. Run `npm install`, `npm test`, `npm run build`. Fix until both pass with zero errors and all routes are static.
5. Update README.md (what it is, dev commands, page list, env var `NEXT_PUBLIC_SITE_URL`).
6. Commit with clear messages and `git push origin main` (push directly to main; no PR needed). Do NOT deploy to Vercel or buy domains.
7. Finish with a summary: routes count, test count, any spec items deferred.
