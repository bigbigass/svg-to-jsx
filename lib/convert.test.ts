import { describe, expect, it } from "vitest";
import {
  convertSvg,
  optimizeSvg,
  outputExtension,
  parseSvg,
  roundNumbers,
  styleToObjectLiteral,
  SvgError,
  toComponentName,
  toJsxAttrName,
  type SvgErrorCode,
} from "./convert";

const ICON = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Sketch -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="24" viewBox="0 0 24 24" class="icon" version="1.1">
  <metadata>created by editor</metadata>
  <title>Arrow</title>
  <g id="layer-1" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round">
    <path d="M5 12h14M12 5l7 7-7 7" style="opacity: .9; -webkit-transform: none"/>
  </g>
</svg>`;

function expectSvgError(input: string, code: SvgErrorCode) {
  try {
    parseSvg(input);
  } catch (e) {
    expect(e).toBeInstanceOf(SvgError);
    expect((e as SvgError).code).toBe(code);
    return;
  }
  throw new Error(`expected SvgError ${code}`);
}

describe("parser", () => {
  it("parses a simple svg into a tree", () => {
    const root = parseSvg(`<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>`);
    expect(root.name).toBe("svg");
    expect(root.attrs).toEqual([["viewBox", "0 0 1 1"]]);
    expect(root.children).toHaveLength(1);
  });

  it("skips xml declarations and doctypes", () => {
    const root = parseSvg(`<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd"><svg/>`);
    expect(root.name).toBe("svg");
  });

  it("decodes entities in attributes and text", () => {
    const root = parseSvg(`<svg aria-label="a &amp; b"><text>&lt;1&#x41;</text></svg>`);
    expect(root.attrs[0][1]).toBe("a & b");
    const text = root.children[0];
    expect(text.type === "element" && text.children[0]).toEqual({ type: "text", value: "<1A" });
  });

  it("rejects empty input", () => expectSvgError("   ", "empty"));
  it("rejects a non-svg root", () => expectSvgError(`<div></div>`, "noSvgRoot"));
  it("rejects unclosed tags", () => expectSvgError(`<svg><g><path/></svg>`, "mismatchedTag"));
  it("rejects a missing closing tag", () => expectSvgError(`<svg><g>`, "unclosedTag"));
  it("rejects unquoted attributes", () => expectSvgError(`<svg width=24></svg>`, "invalidAttribute"));
  it("rejects duplicate attributes", () => expectSvgError(`<svg a="1" a="2"/>`, "duplicateAttribute"));
  it("rejects unterminated comments", () => expectSvgError(`<svg><!-- oops</svg>`, "unterminated"));
  it("rejects stray closing tags", () => expectSvgError(`<svg/></g>`, "unexpectedClosingTag"));
  it("rejects multiple root elements", () => expectSvgError(`<svg/><svg/>`, "multipleRoots"));

  it("reports the line number of errors", () => {
    try {
      parseSvg(`<svg>\n<g>\n<path d=x/>\n</g></svg>`);
    } catch (e) {
      expect((e as SvgError).line).toBe(3);
    }
  });
});

describe("helpers", () => {
  it("builds PascalCase component names from file names", () => {
    expect(toComponentName("arrow-left.svg")).toBe("ArrowLeft");
    expect(toComponentName("icons/ic_home_24px.SVG")).toBe("IcHome24px");
    expect(toComponentName("2fa badge.svg")).toBe("Svg2faBadge");
    expect(toComponentName("ADD-USER.svg")).toBe("AddUser");
    expect(toComponentName("---.svg")).toBe("SvgIcon");
  });

  it("converts attribute names to JSX props", () => {
    expect(toJsxAttrName("stroke-width")).toBe("strokeWidth");
    expect(toJsxAttrName("xlink:href")).toBe("xlinkHref");
    expect(toJsxAttrName("xml:space")).toBe("xmlSpace");
    expect(toJsxAttrName("class")).toBe("className");
    expect(toJsxAttrName("data-name")).toBe("data-name");
    expect(toJsxAttrName("aria-hidden")).toBe("aria-hidden");
    expect(toJsxAttrName("viewBox")).toBe("viewBox");
  });

  it("converts inline style strings into objects", () => {
    expect(styleToObjectLiteral("fill: red; stroke-width:2; -webkit-transform: none; --x: 1")).toBe(
      '{{ fill: "red", strokeWidth: "2", WebkitTransform: "none", "--x": "1" }}',
    );
  });

  it("rounds numbers without merging tokens", () => {
    expect(roundNumbers("M1.23456 2.34567L.5.5", 2)).toBe("M1.23 2.35L0.5 0.5");
    expect(roundNumbers("0 0 24.0001 -0.0001", 1)).toBe("0 0 24 0");
    expect(roundNumbers("translate(10.555,3)", 0)).toBe("translate(11,3)");
  });

  it("picks the right file extension", () => {
    expect(outputExtension({ target: "react", typescript: true })).toBe("tsx");
    expect(outputExtension({ target: "solid", typescript: false })).toBe("jsx");
    expect(outputExtension({ target: "vue", typescript: true })).toBe("vue");
  });
});

describe("convertSvg — React", () => {
  it("matches the snapshot for a sample icon", () => {
    expect(convertSvg(ICON, { componentName: "Arrow" }).code).toMatchSnapshot();
  });

  it("matches the snapshot for a TypeScript icon with every React option", () => {
    const { code } = convertSvg(ICON, {
      componentName: "Arrow",
      typescript: true,
      currentColor: true,
      sizeProp: true,
      forwardRef: true,
      memo: true,
      stripIds: true,
      exportStyle: "named",
    });
    expect(code).toMatchSnapshot();
  });

  it("camelCases attributes and converts class and style", () => {
    const { code } = convertSvg(ICON);
    expect(code).toContain('strokeWidth="2"');
    expect(code).toContain('strokeLinecap="round"');
    expect(code).toContain('className="icon"');
    expect(code).toContain('style={{ opacity: ".9", WebkitTransform: "none" }}');
    expect(code).not.toContain("stroke-width");
  });

  it("strips the xml declaration, comments, metadata and xmlns by default", () => {
    const { code } = convertSvg(ICON);
    expect(code).not.toContain("<?xml");
    expect(code).not.toContain("Sketch");
    expect(code).not.toContain("metadata");
    expect(code).not.toContain("xmlns");
    expect(code).not.toContain("version");
    expect(code).toContain("<title>Arrow</title>");
  });

  it("keeps comments as JSX comments when asked", () => {
    const { code } = convertSvg(ICON, { stripComments: false });
    expect(code).not.toContain("Sketch"); // comment outside the root is dropped anyway
    const inner = convertSvg(`<svg><!-- keep me --><path d="M0 0"/></svg>`, { stripComments: false }).code;
    expect(inner).toContain("{/* keep me */}");
  });

  it("keeps xmlns as xmlnsXlink when stripXmlns is off", () => {
    const { code } = convertSvg(ICON, { stripXmlns: false });
    expect(code).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(code).toContain('xmlnsXlink="http://www.w3.org/1999/xlink"');
  });

  it("converts xlink:href to xlinkHref", () => {
    const { code } = convertSvg(`<svg><defs><path id="a" d="M0 0"/></defs><use xlink:href="#a"/></svg>`);
    expect(code).toContain('xlinkHref="#a"');
  });

  it("preserves data-* and aria-* attributes", () => {
    const { code } = convertSvg(`<svg aria-hidden="true" data-icon="x" role="img"/>`);
    expect(code).toContain('aria-hidden="true"');
    expect(code).toContain('data-icon="x"');
  });

  it("replaces fill and stroke colors with currentColor but keeps none and url()", () => {
    const { code } = convertSvg(
      `<svg><path fill="#f00" stroke="none"/><rect fill="url(#g)"/><circle style="fill:red;stroke:blue"/></svg>`,
      { currentColor: true },
    );
    expect(code).toContain('fill="currentColor" stroke="none"');
    expect(code).toContain('fill="url(#g)"');
    expect(code).toContain('style={{ fill: "currentColor", stroke: "currentColor" }}');
  });

  it("adds a size prop that replaces width and height", () => {
    const { code } = convertSvg(ICON, { sizeProp: true });
    expect(code).toContain("const SvgIcon = ({ size = 24, ...props }) => (");
    expect(code).toContain("width={size} height={size} {...props}");
    expect(code).not.toContain('width="24"');
  });

  it("types props with SVGProps in TypeScript mode", () => {
    const { code } = convertSvg(ICON, { typescript: true });
    expect(code).toContain('import type { SVGProps } from "react";');
    expect(code).toContain("const SvgIcon = (props: SVGProps<SVGSVGElement>) => (");
  });

  it("omits the props spread when disabled", () => {
    const { code } = convertSvg(ICON, { spreadProps: false });
    expect(code).toContain("const SvgIcon = () => (");
    expect(code).not.toContain("{...props}");
  });

  it("wraps the component in forwardRef", () => {
    const { code } = convertSvg(ICON, { forwardRef: true, typescript: true });
    expect(code).toContain('import { forwardRef } from "react";');
    expect(code).toContain("forwardRef((props: SVGProps<SVGSVGElement>, ref: Ref<SVGSVGElement>) => (");
    expect(code).toContain("ref={ref}");
    expect(code).toContain('SvgIcon.displayName = "SvgIcon";');
  });

  it("wraps the component in memo and supports named exports", () => {
    const def = convertSvg(ICON, { memo: true }).code;
    expect(def).toContain("const MemoSvgIcon = memo(SvgIcon);");
    expect(def).toContain("export default MemoSvgIcon;");
    const named = convertSvg(ICON, { memo: true, exportStyle: "named" }).code;
    expect(named).toContain("export { MemoSvgIcon as SvgIcon };");
  });

  it("supports named exports without memo", () => {
    const { code } = convertSvg(ICON, { exportStyle: "named" });
    expect(code).toContain("export const SvgIcon = (props) => (");
    expect(code).not.toContain("export default");
  });

  it("removes width and height but keeps the viewBox", () => {
    const { code } = convertSvg(ICON, { removeDimensions: true });
    expect(code).not.toMatch(/\bwidth="24"/);
    expect(code).toContain('viewBox="0 0 24 24"');
  });

  it("creates a viewBox from width/height when removing dimensions", () => {
    const { code } = convertSvg(`<svg width="32px" height="16"><path d="M0 0"/></svg>`, { removeDimensions: true });
    expect(code).toContain('viewBox="0 0 32 16"');
  });

  it("strips unreferenced ids but keeps referenced ones", () => {
    const { code } = convertSvg(
      `<svg><defs><linearGradient id="g"/></defs><g id="unused"><path id="p" fill="url(#g)"/></g><use href="#p"/></svg>`,
      { stripIds: true },
    );
    expect(code).toContain('id="g"');
    expect(code).toContain('id="p"');
    expect(code).not.toContain('id="unused"');
  });

  it("rounds geometry numbers to the chosen precision", () => {
    const { code } = convertSvg(`<svg viewBox="0 0 24.0004 24"><path d="M1.23456 2.5L3.98765 4"/></svg>`, {
      precision: 1,
    });
    expect(code).toContain('viewBox="0 0 24 24"');
    expect(code).toContain('d="M1.2 2.5L4 4"');
  });

  it("collapses whitespace in attributes", () => {
    const { code } = convertSvg(`<svg><path d="M0   0\n   L10\t10"/></svg>`);
    expect(code).toContain('d="M0 0 L10 10"');
  });

  it("escapes braces in text and keeps style tags as string literals", () => {
    const { code } = convertSvg(`<svg><style>.a{fill:red}</style><text>{x}</text></svg>`);
    expect(code).toContain('<style>{".a{fill:red}"}</style>');
    expect(code).toContain('<text>{"{x}"}</text>');
  });

  it("removes scripts and event handlers with warnings", () => {
    const result = convertSvg(`<svg onload="alert(1)"><script>alert(1)</script><path onclick="x()"/></svg>`);
    expect(result.code).not.toContain("alert");
    expect(result.code).not.toContain("onClick");
    expect(result.warnings.map((w) => w.code)).toEqual(["scriptRemoved", "eventHandlerRemoved", "eventHandlerRemoved"]);
    expect(result.warnings[1].detail).toBe("onload");
  });

  it("outputs a plain JSX snippet", () => {
    const { code } = convertSvg(ICON, { target: "jsx" });
    expect(code.startsWith("<svg ")).toBe(true);
    expect(code).not.toContain("const ");
    expect(code).not.toContain("{...props}");
  });

  it("sanitises invalid component names", () => {
    const result = convertSvg(ICON, { componentName: "my icon", typescript: true });
    expect(result.componentName).toBe("MyIcon");
    expect(result.fileName).toBe("MyIcon.tsx");
  });

  it("throws SvgError for malformed input", () => {
    expect(() => convertSvg("<svg><path></svg>")).toThrow(SvgError);
  });
});

describe("convertSvg — other targets", () => {
  it("outputs react-native-svg components with imports", () => {
    const result = convertSvg(ICON, { target: "react-native", typescript: true });
    expect(result.code).toContain('import Svg, { G, Path } from "react-native-svg";');
    expect(result.code).toContain('import type { SvgProps } from "react-native-svg";');
    expect(result.code).toContain("<Svg ");
    expect(result.code).toContain("<Path ");
    expect(result.code).not.toContain("className");
    expect(result.code).not.toContain("<title>");
    expect(result.warnings.map((w) => w.code)).toContain("rnUnsupportedElement");
    expect(result.warnings.map((w) => w.code)).toContain("rnClassRemoved");
  });

  it("supports forwardRef for React Native", () => {
    const { code } = convertSvg(ICON, { target: "react-native", typescript: true, forwardRef: true });
    expect(code).toContain("ref: Ref<Svg>");
  });

  it("outputs a Vue single-file component", () => {
    const { code, fileName } = convertSvg(ICON, { target: "vue", sizeProp: true, typescript: true });
    expect(fileName).toBe("SvgIcon.vue");
    expect(code).toContain('<script setup lang="ts">');
    expect(code).toContain("withDefaults(defineProps<{ size?: number | string }>(), { size: 24 });");
    expect(code).toContain('<template>\n  <svg viewBox="0 0 24 24" class="icon" :width="size" :height="size">');
    expect(code).toContain('stroke-width="2"');
  });

  it("outputs a plain Vue template without script when no props are needed", () => {
    const { code } = convertSvg(`<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>`, { target: "vue" });
    expect(code).toBe('<template>\n  <svg viewBox="0 0 1 1">\n    <path d="M0 0" />\n  </svg>\n</template>\n');
  });

  it("outputs a Solid component that keeps kebab-case attributes", () => {
    const { code } = convertSvg(ICON, { target: "solid", typescript: true, sizeProp: true });
    expect(code).toContain('import { splitProps } from "solid-js";');
    expect(code).toContain('import type { JSX } from "solid-js";');
    expect(code).toContain('const [local, others] = splitProps(props, ["size"]);');
    expect(code).toContain("width={local.size ?? 24} height={local.size ?? 24} {...others}");
    expect(code).toContain('stroke-width="2"');
    expect(code).toContain('class="icon"');
  });
});

describe("optimizeSvg", () => {
  it("produces smaller, valid SVG", () => {
    const optimized = optimizeSvg(ICON);
    expect(optimized.length).toBeLessThan(ICON.length);
    expect(optimized.startsWith("<svg ")).toBe(true);
    expect(() => parseSvg(optimized)).not.toThrow();
  });
});
