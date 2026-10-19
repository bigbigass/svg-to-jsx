// SVG → React / React Native / Vue / Solid component converter.
// Pure string/AST transformation (no DOM), so it runs in the browser and in Vitest.

import { parseSvg, type ElementNode, type SvgNode } from "./svg-parser";

export { SvgError, parseSvg } from "./svg-parser";
export type { SvgErrorCode } from "./svg-parser";

export type Target = "react" | "react-native" | "vue" | "solid" | "jsx";
export type ExportStyle = "default" | "named";

export interface ConvertOptions {
  target: Target;
  typescript: boolean;
  componentName: string;
  currentColor: boolean;
  sizeProp: boolean;
  spreadProps: boolean;
  forwardRef: boolean;
  memo: boolean;
  removeDimensions: boolean;
  stripXmlns: boolean;
  stripComments: boolean;
  stripMetadata: boolean;
  stripIds: boolean;
  collapseWhitespace: boolean;
  /** Round numbers in geometry attributes to this many decimals; `null` disables rounding. */
  precision: number | null;
  exportStyle: ExportStyle;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  target: "react",
  typescript: false,
  componentName: "SvgIcon",
  currentColor: false,
  sizeProp: false,
  spreadProps: true,
  forwardRef: false,
  memo: false,
  removeDimensions: false,
  stripXmlns: true,
  stripComments: true,
  stripMetadata: true,
  stripIds: false,
  collapseWhitespace: true,
  precision: null,
  exportStyle: "default",
};

export type WarningCode =
  | "scriptRemoved"
  | "eventHandlerRemoved"
  | "rnUnsupportedElement"
  | "rnClassRemoved"
  | "vueStyleTag";

export interface ConvertWarning {
  code: WarningCode;
  detail: string;
}

export interface ConvertResult {
  code: string;
  componentName: string;
  fileName: string;
  warnings: ConvertWarning[];
}

const RN_ELEMENTS: Record<string, string> = {
  svg: "Svg",
  circle: "Circle",
  clipPath: "ClipPath",
  defs: "Defs",
  ellipse: "Ellipse",
  foreignObject: "ForeignObject",
  g: "G",
  image: "Image",
  line: "Line",
  linearGradient: "LinearGradient",
  marker: "Marker",
  mask: "Mask",
  path: "Path",
  pattern: "Pattern",
  polygon: "Polygon",
  polyline: "Polyline",
  radialGradient: "RadialGradient",
  rect: "Rect",
  stop: "Stop",
  symbol: "Symbol",
  text: "Text",
  textPath: "TextPath",
  tspan: "TSpan",
  use: "Use",
  filter: "Filter",
  feGaussianBlur: "FeGaussianBlur",
  feOffset: "FeOffset",
  feColorMatrix: "FeColorMatrix",
  feBlend: "FeBlend",
  feFlood: "FeFlood",
  feComposite: "FeComposite",
  feMerge: "FeMerge",
  feMergeNode: "FeMergeNode",
};

const EDITOR_PREFIXES = ["sodipodi:", "inkscape:", "sketch:", "serif:", "figma:"];
const METADATA_ELEMENTS = new Set(["metadata"]);
const GEOMETRY_ATTRS = new Set([
  "d", "points", "viewBox", "transform", "gradientTransform", "patternTransform",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "dx", "dy",
  "width", "height", "stroke-width", "stroke-dasharray", "stroke-dashoffset", "offset",
]);
const TEXT_PRESERVING = new Set(["text", "tspan", "textPath", "style", "title", "desc"]);

const NUMBER_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/** Rounds every number inside an attribute value, keeping tokens separated (`.5.5` → `0.5 0.5`). */
export function roundNumbers(value: string, precision: number): string {
  let out = "";
  let last = 0;
  for (const match of value.matchAll(NUMBER_RE)) {
    const index = match.index ?? 0;
    out += value.slice(last, index);
    let rounded = String(Number(Number(match[0]).toFixed(precision)));
    if (rounded === "-0") rounded = "0";
    if (/[\d.]$/.test(out) && /^[\d.]/.test(rounded)) out += " ";
    out += rounded;
    last = index + match[0].length;
  }
  return out + value.slice(last);
}

/** Builds a PascalCase React component name from a file name such as `arrow-left.svg`. */
export function toComponentName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, "").replace(/\.svg$/i, "");
  const words = base.split(/[^A-Za-z0-9]+/).filter(Boolean);
  let name = words
    .map((w) => (/^[A-Z0-9]+$/.test(w) && w.length > 1 ? w[0] + w.slice(1).toLowerCase() : w))
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
  if (!name) return "SvgIcon";
  if (/^\d/.test(name)) name = `Svg${name}`;
  return name;
}

/** Converts an SVG/XML attribute name to its JSX (React) prop name. */
export function toJsxAttrName(name: string): string {
  if (name === "class") return "className";
  if (name === "for") return "htmlFor";
  if (name === "xmlns" || name.startsWith("data-") || name.startsWith("aria-")) return name;
  return name.replace(/[:\-]([A-Za-z])/g, (_, c: string) => c.toUpperCase());
}

/** Converts a CSS property name to its React style-object key. */
export function toStyleKey(prop: string): string {
  if (prop.startsWith("--")) return prop;
  const p = prop.startsWith("-ms-") ? prop.slice(1) : prop;
  return p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function parseStyle(style: string): [string, string][] {
  return style
    .split(";")
    .map((decl) => {
      const colon = decl.indexOf(":");
      if (colon === -1) return null;
      const prop = decl.slice(0, colon).trim();
      const value = decl.slice(colon + 1).trim();
      return prop && value ? ([prop, value] as [string, string]) : null;
    })
    .filter((d): d is [string, string] => d !== null);
}

export function styleToObjectLiteral(style: string): string {
  const entries = parseStyle(style).map(([prop, value]) => {
    const key = toStyleKey(prop);
    const keyText = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
    return `${keyText}: ${JSON.stringify(value)}`;
  });
  return `{{ ${entries.join(", ")} }}`;
}

function isPaintColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  return !(
    v === "" ||
    v === "none" ||
    v === "currentcolor" ||
    v === "inherit" ||
    v === "transparent" ||
    v.startsWith("url(") ||
    v.startsWith("context-")
  );
}

function cloneNode(node: SvgNode): SvgNode {
  if (node.type !== "element") return { ...node };
  return { ...node, attrs: node.attrs.map(([n, v]) => [n, v]), children: node.children.map(cloneNode) };
}

function walk(node: ElementNode, fn: (el: ElementNode) => void) {
  fn(node);
  for (const child of node.children) if (child.type === "element") walk(child, fn);
}

function collectReferencedIds(root: ElementNode): Set<string> {
  const ids = new Set<string>();
  const scan = (text: string) => {
    for (const m of text.matchAll(/url\(\s*['"]?#([^'")\s]+)/g)) ids.add(m[1]);
  };
  walk(root, (el) => {
    for (const [name, value] of el.attrs) {
      scan(value);
      if ((name === "href" || name === "xlink:href") && value.startsWith("#")) ids.add(value.slice(1));
      if (name === "aria-labelledby" || name === "aria-describedby") value.split(/\s+/).forEach((id) => ids.add(id));
    }
    for (const child of el.children) if (child.type === "text" || child.type === "cdata") scan(child.value);
  });
  return ids;
}

interface Prepared {
  root: ElementNode;
  warnings: ConvertWarning[];
}

/** Applies the cleanup/optimisation options to a parsed tree (target-independent). */
function prepare(input: string, o: ConvertOptions): Prepared {
  const root = cloneNode(parseSvg(input)) as ElementNode;
  const warnings: ConvertWarning[] = [];
  const warn = (code: WarningCode, detail = "") => {
    if (!warnings.some((w) => w.code === code && w.detail === detail)) warnings.push({ code, detail });
  };

  const referenced = o.stripIds ? collectReferencedIds(root) : new Set<string>();

  const clean = (el: ElementNode) => {
    el.children = el.children.filter((child) => {
      if (child.type === "comment") return !o.stripComments;
      if (child.type !== "element") return true;
      if (child.name === "script") {
        warn("scriptRemoved");
        return false;
      }
      if (o.stripMetadata && (METADATA_ELEMENTS.has(child.name) || EDITOR_PREFIXES.some((p) => child.name.startsWith(p)))) {
        return false;
      }
      return true;
    });
    // CDATA content is plain character data once parsed.
    el.children = el.children.map((c) => (c.type === "cdata" ? { type: "text", value: c.value } : c));

    el.attrs = el.attrs.filter(([name, value]) => {
      if (/^on/i.test(name)) {
        warn("eventHandlerRemoved", name);
        return false;
      }
      if (o.stripXmlns && (name === "xmlns" || name.startsWith("xmlns:"))) return false;
      if (o.stripMetadata) {
        if (EDITOR_PREFIXES.some((p) => name.startsWith(p) || name === `xmlns:${p.slice(0, -1)}`)) return false;
        if (el === root && name === "version") return false;
      }
      if (o.stripIds && name === "id" && !referenced.has(value)) return false;
      return true;
    });

    el.attrs = el.attrs.map(([name, value]) => {
      let v = value;
      if (o.collapseWhitespace && name !== "style") v = v.replace(/\s+/g, " ").trim();
      if (o.collapseWhitespace && name === "style") v = parseStyle(v).map(([p, val]) => `${p}:${val}`).join(";");
      if (o.precision !== null && GEOMETRY_ATTRS.has(name)) v = roundNumbers(v, o.precision);
      if (o.currentColor && (name === "fill" || name === "stroke") && isPaintColor(v)) v = "currentColor";
      if (o.currentColor && name === "style") {
        v = parseStyle(v)
          .map(([p, val]) => `${p}:${(p === "fill" || p === "stroke") && isPaintColor(val) ? "currentColor" : val}`)
          .join(";");
      }
      return [name, v];
    });

    if (o.collapseWhitespace) {
      const keepText = TEXT_PRESERVING.has(el.name);
      el.children = el.children
        .map((c) => (c.type === "text" && keepText ? { ...c, value: c.value.replace(/\s+/g, " ") } : c))
        .filter((c) => c.type !== "text" || keepText || c.value.trim() !== "");
      if (keepText && el.children.length === 1 && el.children[0].type === "text" && el.name !== "style") {
        el.children[0] = { type: "text", value: el.children[0].value.trim() };
      }
    }

    for (const child of el.children) if (child.type === "element") clean(child);
  };
  clean(root);

  if (o.removeDimensions || o.sizeProp) {
    const get = (n: string) => root.attrs.find(([name]) => name === n)?.[1];
    const w = get("width");
    const h = get("height");
    if (!get("viewBox") && w && h && /^[\d.]+(px)?$/.test(w) && /^[\d.]+(px)?$/.test(h)) {
      root.attrs.push(["viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`]);
    }
  }
  return { root, warnings };
}

// ---------- rendering helpers ----------

const INDENT = "  ";

function jsxAttrValue(value: string): string {
  return /["\\{}]/.test(value) || /[\n\r]/.test(value) ? `{${JSON.stringify(value)}}` : `"${value}"`;
}

function jsxText(value: string, raw: boolean): string {
  if (raw || /[{}<>&]/.test(value) || value !== value.trim()) return `{${JSON.stringify(value)}}`;
  return value;
}

function xmlEscapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function xmlEscapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Flavor = "react" | "react-native" | "solid";

interface RenderContext {
  flavor: Flavor;
  rootExtra: string[];
  dropRootAttrs: Set<string>;
  usedRn: Set<string>;
  warn: (code: WarningCode, detail?: string) => void;
}

function renderJsxAttrs(el: ElementNode, ctx: RenderContext, isRoot: boolean): string[] {
  const out: string[] = [];
  for (const [name, value] of el.attrs) {
    if (isRoot && ctx.dropRootAttrs.has(name)) continue;
    if (ctx.flavor === "solid") {
      out.push(`${name}=${jsxAttrValue(value)}`);
      continue;
    }
    if (ctx.flavor === "react-native" && (name === "class" || name === "className")) {
      ctx.warn("rnClassRemoved");
      continue;
    }
    if (ctx.flavor === "react-native" && (name === "xmlns" || name.startsWith("xmlns:"))) continue;
    const jsxName = toJsxAttrName(name);
    out.push(name === "style" ? `style=${styleToObjectLiteral(value)}` : `${jsxName}=${jsxAttrValue(value)}`);
  }
  if (isRoot) out.push(...ctx.rootExtra);
  return out;
}

function renderJsxNode(node: SvgNode, depth: number, ctx: RenderContext, isRoot: boolean): string[] {
  const pad = INDENT.repeat(depth);
  if (node.type === "comment") {
    const text = node.value.trim().replace(/\*\//g, "* /");
    return ctx.flavor === "react-native" ? [] : [`${pad}{/* ${text} */}`];
  }
  if (node.type === "text" || node.type === "cdata") return [`${pad}${jsxText(node.value, false)}`];

  let tag = node.name;
  if (ctx.flavor === "react-native") {
    const mapped = RN_ELEMENTS[node.name];
    if (!mapped) {
      ctx.warn("rnUnsupportedElement", node.name);
      return [];
    }
    tag = mapped;
    ctx.usedRn.add(mapped);
  }

  const attrs = renderJsxAttrs(node, ctx, isRoot);
  const open = attrs.length ? `<${tag} ${attrs.join(" ")}` : `<${tag}`;
  const rawText = node.name === "style";
  const children = node.children;
  if (!children.length) return [`${pad}${open} />`];
  if (children.length === 1 && (children[0].type === "text" || children[0].type === "cdata")) {
    return [`${pad}${open}>${jsxText(children[0].value, rawText)}</${tag}>`];
  }
  const lines = [`${pad}${open}>`];
  for (const child of children) {
    if (child.type === "text" && rawText) lines.push(`${pad}${INDENT}${jsxText(child.value, true)}`);
    else lines.push(...renderJsxNode(child, depth + 1, ctx, false));
  }
  lines.push(`${pad}</${tag}>`);
  return lines;
}

function renderXmlNode(node: SvgNode, depth: number, rootAttrs: string[] | null, warn: RenderContext["warn"]): string[] {
  const pad = INDENT.repeat(depth);
  if (node.type === "comment") return [`${pad}<!--${node.value}-->`];
  if (node.type === "text" || node.type === "cdata") return [`${pad}${xmlEscapeText(node.value)}`];
  if (node.name === "style") warn("vueStyleTag");
  const attrs = rootAttrs ?? node.attrs.map(([n, v]) => `${n}="${xmlEscapeAttr(v)}"`);
  const open = attrs.length ? `<${node.name} ${attrs.join(" ")}` : `<${node.name}`;
  if (!node.children.length) return [`${pad}${open} />`];
  const only = node.children[0];
  if (node.children.length === 1 && (only.type === "text" || only.type === "cdata")) {
    return [`${pad}${open}>${xmlEscapeText(only.value)}</${node.name}>`];
  }
  return [
    `${pad}${open}>`,
    ...node.children.flatMap((c) => renderXmlNode(c, depth + 1, null, warn)),
    `${pad}</${node.name}>`,
  ];
}

function defaultSize(root: ElementNode): string {
  const w = root.attrs.find(([n]) => n === "width")?.[1];
  if (w && /^\d+(\.\d+)?(px)?$/.test(w)) return String(parseFloat(w));
  return "24";
}

function sanitizeName(name: string): string {
  const trimmed = name.trim();
  if (/^[A-Z][A-Za-z0-9_$]*$/.test(trimmed)) return trimmed;
  return toComponentName(trimmed);
}

export function outputExtension(o: Pick<ConvertOptions, "target" | "typescript">): string {
  if (o.target === "vue") return "vue";
  return o.typescript ? "tsx" : "jsx";
}

/** Converts SVG markup to component source code. Throws `SvgError` for malformed SVG. */
export function convertSvg(input: string, options: Partial<ConvertOptions> = {}): ConvertResult {
  const o: ConvertOptions = { ...DEFAULT_OPTIONS, ...options };
  const name = sanitizeName(o.componentName);
  const { root, warnings } = prepare(input, o);
  const warn = (code: WarningCode, detail = "") => {
    if (!warnings.some((w) => w.code === code && w.detail === detail)) warnings.push({ code, detail });
  };
  const size = defaultSize(root);
  const sizeLiteral = /^\d/.test(size) ? size : JSON.stringify(size);
  const ts = o.typescript;
  const fileName = `${name}.${outputExtension(o)}`;
  const dims = new Set<string>(o.removeDimensions || o.sizeProp ? ["width", "height"] : []);

  if (o.target === "vue") {
    const rootAttrs = root.attrs.filter(([n]) => !dims.has(n)).map(([n, v]) => `${n}="${xmlEscapeAttr(v)}"`);
    if (o.sizeProp) rootAttrs.push(`:width="size"`, `:height="size"`);
    const template = ["<template>", ...renderXmlNode(root, 1, rootAttrs, warn), "</template>"];
    const script: string[] = [];
    if (o.sizeProp) {
      script.push(ts ? `<script setup lang="ts">` : "<script setup>");
      if (ts) script.push(`withDefaults(defineProps<{ size?: number | string }>(), { size: ${sizeLiteral} });`);
      else script.push(`defineProps({ size: { type: [Number, String], default: ${sizeLiteral} } });`);
      script.push("</script>", "");
    } else if (ts) {
      script.push(`<script setup lang="ts">`, `defineOptions({ name: "${name}" });`, "</script>", "");
    }
    return { code: [...script, ...template].join("\n") + "\n", componentName: name, fileName, warnings };
  }

  const flavor: Flavor = o.target === "react-native" ? "react-native" : o.target === "solid" ? "solid" : "react";
  const ctx: RenderContext = { flavor, rootExtra: [], dropRootAttrs: dims, usedRn: new Set(), warn };

  if (o.target === "jsx") {
    const markup = renderJsxNode(root, 0, ctx, true).join("\n");
    return { code: markup + "\n", componentName: name, fileName, warnings };
  }

  const useRef = o.forwardRef && flavor !== "solid";
  const useMemo = o.memo && flavor !== "solid";
  if (o.sizeProp) {
    ctx.rootExtra.push(flavor === "solid" ? `width={local.size ?? ${sizeLiteral}}` : "width={size}");
    ctx.rootExtra.push(flavor === "solid" ? `height={local.size ?? ${sizeLiteral}}` : "height={size}");
  }
  if (useRef) ctx.rootExtra.push("ref={ref}");
  if (o.spreadProps) ctx.rootExtra.push(flavor === "solid" && o.sizeProp ? "{...others}" : "{...props}");

  const body = renderJsxNode(root, flavor === "solid" ? 2 : 1, ctx, true);
  const lines: string[] = [];

  if (flavor === "solid") {
    const propsType = o.sizeProp
      ? "JSX.SvgSVGAttributes<SVGSVGElement> & { size?: number | string }"
      : "JSX.SvgSVGAttributes<SVGSVGElement>";
    if (o.sizeProp) lines.push(`import { splitProps } from "solid-js";`);
    if (ts) lines.push(`import type { JSX } from "solid-js";`);
    if (lines.length) lines.push("");
    const param = o.spreadProps || o.sizeProp ? (ts ? `props: ${propsType}` : "props") : "";
    lines.push(`${o.exportStyle === "named" ? "export " : ""}const ${name} = (${param}) => {`);
    if (o.sizeProp) lines.push(`${INDENT}const [local, others] = splitProps(props, ["size"]);`);
    lines.push(`${INDENT}return (`, ...body, `${INDENT});`, "};");
    if (o.exportStyle === "default") lines.push("", `export default ${name};`);
    return { code: lines.join("\n") + "\n", componentName: name, fileName, warnings };
  }

  const rn = flavor === "react-native";
  const propsType = rn ? "SvgProps" : "SVGProps<SVGSVGElement>";
  const refType = rn ? "Ref<Svg>" : "Ref<SVGSVGElement>";
  const reactValues = [useRef && "forwardRef", useMemo && "memo"].filter(Boolean) as string[];
  const reactTypes = ts ? ([useRef && "Ref", !rn && "SVGProps"].filter(Boolean) as string[]) : [];
  if (reactValues.length) lines.push(`import { ${reactValues.join(", ")} } from "react";`);
  if (reactTypes.length) lines.push(`import type { ${reactTypes.join(", ")} } from "react";`);
  if (rn) {
    const named = [...ctx.usedRn].filter((c) => c !== "Svg").sort();
    lines.push(`import Svg${named.length ? `, { ${named.join(", ")} }` : ""} from "react-native-svg";`);
    if (ts) lines.push(`import type { SvgProps } from "react-native-svg";`);
  }
  if (lines.length) lines.push("");

  let param: string;
  if (o.sizeProp) {
    const destructure = o.spreadProps ? `{ size = ${sizeLiteral}, ...props }` : `{ size = ${sizeLiteral} }`;
    param = ts ? `${destructure}: ${propsType} & { size?: number | string }` : destructure;
  } else if (o.spreadProps) {
    param = ts ? `props: ${propsType}` : "props";
  } else {
    param = useRef ? (ts ? `_props: ${propsType}` : "_props") : "";
  }
  if (useRef) param += ts ? `, ref: ${refType}` : ", ref";

  const fn = [`(${param}) => (`, ...body, ")"];
  const inner = useRef ? `forwardRef(${fn[0]}` : fn[0];
  const closing = useRef ? "));" : ");";
  const exportPrefix = o.exportStyle === "named" && !useMemo ? "export " : "";
  lines.push(`${exportPrefix}const ${name} = ${inner}`, ...fn.slice(1, -1), closing);
  if (useRef) lines.push(`${name}.displayName = "${name}";`);

  if (useMemo) {
    lines.push(`const Memo${name} = memo(${name});`);
    lines.push("", o.exportStyle === "default" ? `export default Memo${name};` : `export { Memo${name} as ${name} };`);
  } else if (o.exportStyle === "default") {
    lines.push("", `export default ${name};`);
  }
  return { code: lines.join("\n") + "\n", componentName: name, fileName, warnings };
}

/** Returns the cleaned SVG (same options, serialised back to SVG) — used for the size comparison. */
export function optimizeSvg(input: string, options: Partial<ConvertOptions> = {}): string {
  const o: ConvertOptions = { ...DEFAULT_OPTIONS, ...options, stripXmlns: false };
  const { root } = prepare(input, o);
  if (!root.attrs.some(([n]) => n === "xmlns")) root.attrs.unshift(["xmlns", "http://www.w3.org/2000/svg"]);
  return renderXmlNode(root, 0, null, () => {}).map((l) => l.trim()).join("");
}
