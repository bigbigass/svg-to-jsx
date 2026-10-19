import type { ConvertOptions } from "./convert";

export const PAGE_KEYS = [
  "home",
  "svgToReact",
  "svgToTsx",
  "svgToReactNative",
  "svgToVue",
  "svgToSolid",
  "svgCurrentcolor",
  "guideSvgIconsInReact",
  "about",
  "privacy",
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export interface PageDef {
  path: string;
  /** Converter preset for the page; `null` means the page has no tool. */
  tool: Partial<ConvertOptions> | null;
  /** Landing pages get a BreadcrumbList. */
  landing: boolean;
  related: PageKey[];
}

export const PAGES: Record<PageKey, PageDef> = {
  home: {
    path: "/",
    tool: {},
    landing: false,
    related: ["svgToReact", "svgToTsx", "svgToReactNative", "svgToVue", "svgToSolid", "svgCurrentcolor", "guideSvgIconsInReact"],
  },
  svgToReact: {
    path: "/svg-to-react/",
    tool: { target: "react", typescript: false },
    landing: true,
    related: ["svgToTsx", "svgCurrentcolor", "guideSvgIconsInReact", "svgToReactNative"],
  },
  svgToTsx: {
    path: "/svg-to-tsx/",
    tool: { target: "react", typescript: true },
    landing: true,
    related: ["svgToReact", "svgCurrentcolor", "guideSvgIconsInReact", "svgToSolid"],
  },
  svgToReactNative: {
    path: "/svg-to-react-native/",
    tool: { target: "react-native", typescript: true },
    landing: true,
    related: ["svgToReact", "svgToTsx", "svgCurrentcolor", "guideSvgIconsInReact"],
  },
  svgToVue: {
    path: "/svg-to-vue/",
    tool: { target: "vue", typescript: true },
    landing: true,
    related: ["svgToReact", "svgToSolid", "svgCurrentcolor", "home"],
  },
  svgToSolid: {
    path: "/svg-to-solid/",
    tool: { target: "solid", typescript: true },
    landing: true,
    related: ["svgToReact", "svgToTsx", "svgToVue", "svgCurrentcolor"],
  },
  svgCurrentcolor: {
    path: "/svg-currentcolor/",
    tool: { target: "react", typescript: true, currentColor: true, sizeProp: true },
    landing: true,
    related: ["guideSvgIconsInReact", "svgToReact", "svgToTsx", "svgToVue"],
  },
  guideSvgIconsInReact: {
    path: "/guides/svg-icons-in-react/",
    tool: { target: "react", typescript: true, currentColor: true, sizeProp: true },
    landing: true,
    related: ["svgCurrentcolor", "svgToTsx", "svgToReact", "svgToReactNative"],
  },
  about: { path: "/about/", tool: null, landing: true, related: ["home", "guideSvgIconsInReact", "privacy"] },
  privacy: { path: "/privacy/", tool: null, landing: true, related: ["home", "about"] },
};
