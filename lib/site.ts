export const SITE_NAME = "SvgJsx";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://svgtojsx.top").replace(/\/+$/, "");

export const SISTER_SITES = [
  { name: "ContrastCheck", url: "https://contrastcheck.top" },
  { name: "Aspect Ratio Calculator", url: "https://aspectratiocalc.top" },
] as const;
