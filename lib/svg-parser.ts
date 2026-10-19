// A small, dependency-free XML parser tailored to SVG markup.
// It works in Node and the browser (no DOMParser) so it can be unit tested.

export type SvgErrorCode =
  | "empty"
  | "noSvgRoot"
  | "unclosedTag"
  | "mismatchedTag"
  | "unexpectedClosingTag"
  | "invalidAttribute"
  | "duplicateAttribute"
  | "unterminated"
  | "multipleRoots"
  | "textOutsideRoot";

export class SvgError extends Error {
  readonly code: SvgErrorCode;
  readonly line: number;
  readonly detail: string;

  constructor(code: SvgErrorCode, line: number, detail = "") {
    super(`${code}${detail ? `: ${detail}` : ""} (line ${line})`);
    this.name = "SvgError";
    this.code = code;
    this.line = line;
    this.detail = detail;
  }
}

export interface ElementNode {
  type: "element";
  name: string;
  attrs: [string, string][];
  children: SvgNode[];
}
export interface TextNode {
  type: "text";
  value: string;
}
export interface CommentNode {
  type: "comment";
  value: string;
}
export interface CdataNode {
  type: "cdata";
  value: string;
}
export type SvgNode = ElementNode | TextNode | CommentNode | CdataNode;

const NAME_START = /[A-Za-z_:]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-]/;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

/** Parses SVG/XML markup and returns the root `<svg>` element. Throws `SvgError` on malformed input. */
export function parseSvg(input: string): ElementNode {
  const src = input.replace(/^﻿/, "");
  if (!src.trim()) throw new SvgError("empty", 1);

  let pos = 0;
  const lineAt = (i: number) => src.slice(0, i).split("\n").length;
  const roots: ElementNode[] = [];
  const stack: ElementNode[] = [];

  const append = (node: SvgNode) => {
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else if (node.type === "element") roots.push(node);
    else if (node.type === "text" && node.value.trim()) throw new SvgError("textOutsideRoot", lineAt(pos));
  };

  const readUntil = (terminator: string, start: number): number => {
    const end = src.indexOf(terminator, start);
    if (end === -1) throw new SvgError("unterminated", lineAt(start), terminator);
    return end;
  };

  const readName = (): string => {
    const start = pos;
    if (!NAME_START.test(src[pos] ?? "")) return "";
    while (pos < src.length && NAME_CHAR.test(src[pos])) pos++;
    return src.slice(start, pos);
  };

  const skipSpace = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  };

  while (pos < src.length) {
    const lt = src.indexOf("<", pos);
    if (lt === -1) {
      append({ type: "text", value: decodeEntities(src.slice(pos)) });
      break;
    }
    if (lt > pos) append({ type: "text", value: decodeEntities(src.slice(pos, lt)) });
    pos = lt;

    if (src.startsWith("<!--", pos)) {
      const end = readUntil("-->", pos + 4);
      append({ type: "comment", value: src.slice(pos + 4, end) });
      pos = end + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", pos)) {
      const end = readUntil("]]>", pos + 9);
      append({ type: "cdata", value: src.slice(pos + 9, end) });
      pos = end + 3;
      continue;
    }
    if (src.startsWith("<?", pos)) {
      pos = readUntil("?>", pos + 2) + 2;
      continue;
    }
    if (src.startsWith("<!", pos)) {
      // DOCTYPE (possibly with an internal subset in brackets).
      let depth = 0;
      let i = pos + 2;
      for (; i < src.length; i++) {
        if (src[i] === "[") depth++;
        else if (src[i] === "]") depth--;
        else if (src[i] === ">" && depth <= 0) break;
      }
      if (i >= src.length) throw new SvgError("unterminated", lineAt(pos), ">");
      pos = i + 1;
      continue;
    }
    if (src[pos + 1] === "/") {
      pos += 2;
      const name = readName();
      skipSpace();
      if (src[pos] !== ">") throw new SvgError("unterminated", lineAt(pos), ">");
      pos++;
      const open = stack.pop();
      if (!open) throw new SvgError("unexpectedClosingTag", lineAt(pos), name);
      if (open.name !== name) throw new SvgError("mismatchedTag", lineAt(pos), `${open.name} / ${name}`);
      continue;
    }

    // Opening tag.
    const tagLine = lineAt(pos);
    pos++;
    const name = readName();
    if (!name) throw new SvgError("invalidAttribute", tagLine, src.slice(pos, pos + 10));
    const element: ElementNode = { type: "element", name, attrs: [], children: [] };
    let selfClosing = false;
    for (;;) {
      const before = pos;
      skipSpace();
      if (pos >= src.length) throw new SvgError("unclosedTag", tagLine, name);
      if (src.startsWith("/>", pos)) {
        selfClosing = true;
        pos += 2;
        break;
      }
      if (src[pos] === ">") {
        pos++;
        break;
      }
      if (pos === before) throw new SvgError("invalidAttribute", lineAt(pos), name);
      const attrName = readName();
      if (!attrName) throw new SvgError("invalidAttribute", lineAt(pos), src.slice(pos, pos + 12));
      skipSpace();
      if (src[pos] !== "=") throw new SvgError("invalidAttribute", lineAt(pos), attrName);
      pos++;
      skipSpace();
      const quote = src[pos];
      if (quote !== '"' && quote !== "'") throw new SvgError("invalidAttribute", lineAt(pos), attrName);
      const end = src.indexOf(quote, pos + 1);
      if (end === -1) throw new SvgError("unterminated", lineAt(pos), quote);
      if (element.attrs.some(([n]) => n === attrName)) throw new SvgError("duplicateAttribute", lineAt(pos), attrName);
      element.attrs.push([attrName, decodeEntities(src.slice(pos + 1, end))]);
      pos = end + 1;
    }
    append(element);
    if (!selfClosing) stack.push(element);
  }

  if (stack.length) throw new SvgError("unclosedTag", lineAt(src.length), stack[stack.length - 1].name);
  if (roots.length > 1) throw new SvgError("multipleRoots", 1);
  const root = roots[0];
  if (!root || root.name.replace(/^.*:/, "") !== "svg") throw new SvgError("noSvgRoot", 1, root?.name ?? "");
  return root;
}
