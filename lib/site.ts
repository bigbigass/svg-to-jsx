export const SITE_NAME = "SvgJsx";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://svg-to-jsx.vercel.app").replace(/\/+$/, "");

export const SISTER_SITES = [
  { name: "ContrastCheck", url: "https://wcag-contrastcheck.vercel.app" },
  { name: "Aspect Ratio Calculator", url: "https://aspectratiocalc.top" },
] as const;
