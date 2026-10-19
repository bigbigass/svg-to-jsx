"use client";

import { track } from "@vercel/analytics";
import { strToU8, zipSync } from "fflate";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  convertSvg,
  DEFAULT_OPTIONS,
  optimizeSvg,
  outputExtension,
  SvgError,
  toComponentName,
  type ConvertOptions,
  type ConvertResult,
  type Target,
} from "@/lib/convert";
import { fmt, type ToolStrings } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator 28.0, SVG Export Plug-In -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24" class="icon icon-heart">
  <metadata>Exported icon</metadata>
  <g id="Layer_1" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19.0001 14.0002c1.4900-1.4600 3.0000-3.2100 3.0000-5.5000A5.5000 5.5000 0 0 0 16.5000 3c-1.7600 0-3.0000.5000-4.5000 2-1.5000-1.5000-2.7400-2-4.5000-2A5.5000 5.5000 0 0 0 2 8.5000c0 2.3000 1.5000 4.0500 3 5.5000l7 7Z" style="fill-opacity: 0.15; fill: #e11d48"/>
  </g>
</svg>
`;

type PresetKey = keyof ToolStrings["presets"];
const PRESETS: Record<PresetKey, Partial<ConvertOptions>> = {
  react: { target: "react", typescript: false, currentColor: false, sizeProp: false },
  reactTs: { target: "react", typescript: true, currentColor: false, sizeProp: false },
  icon: { target: "react", typescript: true, currentColor: true, sizeProp: true, removeDimensions: true },
  reactNative: { target: "react-native", typescript: true },
  vue: { target: "vue", typescript: true },
  solid: { target: "solid", typescript: true },
};

const TARGETS: Target[] = ["react", "react-native", "vue", "solid", "jsx"];
const BOOL_OPTIONS = [
  "typescript",
  "currentColor",
  "sizeProp",
  "spreadProps",
  "forwardRef",
  "memo",
  "removeDimensions",
  "stripXmlns",
  "stripComments",
  "stripMetadata",
  "stripIds",
  "collapseWhitespace",
] as const;
type BoolOption = (typeof BOOL_OPTIONS)[number];

function isDisabled(option: BoolOption | "exportStyle", target: Target): boolean {
  switch (option) {
    case "typescript":
      return target === "jsx";
    case "forwardRef":
    case "memo":
      return target !== "react" && target !== "react-native";
    case "spreadProps":
    case "exportStyle":
      return target === "vue" || target === "jsx";
    case "sizeProp":
      return target === "jsx";
    default:
      return false;
  }
}

interface BatchItem {
  name: string;
  source: string;
}

type Outcome = { ok: true; result: ConvertResult; optimized: string } | { ok: false; error: unknown };

function run(source: string, options: ConvertOptions): Outcome {
  try {
    return { ok: true, result: convertSvg(source, options), optimized: optimizeSvg(source, options) };
  } catch (error) {
    return { ok: false, error };
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SvgConverter({
  t,
  locale,
  preset,
}: {
  t: ToolStrings;
  locale: Locale;
  preset: Partial<ConvertOptions>;
}) {
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(SAMPLE);
  const [options, setOptions] = useState<ConvertOptions>({ ...DEFAULT_OPTIONS, componentName: "HeartIcon", ...preset });
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const outcome = useMemo(() => run(source, options), [source, options]);
  const batchResults = useMemo(
    () => batch.map((item) => ({ item, outcome: run(item.source, { ...options, componentName: item.name }) })),
    [batch, options],
  );

  const bytes = useMemo(() => new Intl.NumberFormat(locale, { style: "unit", unit: "byte", unitDisplay: "narrow" }), [locale]);
  const percent = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const size = (s: string) => new TextEncoder().encode(s).length;

  const set = <K extends keyof ConvertOptions>(key: K, value: ConvertOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  const applyPreset = (key: PresetKey) => {
    setOptions((o) => ({ ...o, ...PRESETS[key] }));
    track("preset_click", { preset: key });
  };

  const loadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /\.svg$/i.test(f.name) || f.type === "image/svg+xml");
    if (!list.length) return;
    const texts = await Promise.all(list.map(readFile));
    const used = new Set<string>();
    const items = list.map((file, i) => {
      let name = toComponentName(file.name);
      for (let n = 2; used.has(name); n++) name = `${toComponentName(file.name)}${n}`;
      used.add(name);
      return { name, source: texts[i] };
    });
    setSource(items[0].source);
    setOptions((o) => ({ ...o, componentName: items[0].name }));
    setBatch(items.length > 1 ? items : []);
  }, []);

  const copy = async () => {
    if (!outcome.ok) return;
    try {
      await navigator.clipboard.writeText(outcome.result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      track("copy_output", { target: options.target });
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); the code stays selectable.
    }
  };

  const download = () => {
    if (!outcome.ok) return;
    downloadBlob(new Blob([outcome.result.code], { type: "text/plain" }), outcome.result.fileName);
  };

  const downloadZip = () => {
    const files: Record<string, Uint8Array> = {};
    const exports: string[] = [];
    for (const { outcome: o } of batchResults) {
      if (!o.ok) continue;
      files[o.result.fileName] = strToU8(o.result.code);
      const name = o.result.componentName;
      const from = options.target === "vue" ? `./${o.result.fileName}` : `./${name}`;
      exports.push(
        options.exportStyle === "named" && options.target !== "vue"
          ? `export { ${name} } from "${from}";`
          : `export { default as ${name} } from "${from}";`,
      );
    }
    if (options.target !== "jsx") files[options.typescript ? "index.ts" : "index.js"] = strToU8(exports.join("\n") + "\n");
    downloadBlob(new Blob([zipSync(files) as BlobPart], { type: "application/zip" }), "svg-components.zip");
    track("copy_output", { target: options.target, kind: "zip", count: exports.length });
  };

  const errorMessage = (error: unknown) => {
    if (error instanceof SvgError) {
      const msg = fmt(t.errors[error.code], { detail: error.detail });
      return `${msg} (${fmt(t.errorLine, { line: error.line })})`;
    }
    return t.errors.unknown;
  };

  const inputId = `${ids}-input`;
  const outputId = `${ids}-output`;
  const failed = batchResults.filter((b) => !b.outcome.ok).length;
  const fieldClass =
    "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";
  const buttonClass =
    "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";

  return (
    <section aria-label={t.regionLabel} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.presetsLabel}:</span>
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
          <button key={key} type="button" onClick={() => applyPreset(key)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900">
            {t.presets[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor={inputId} className="text-sm font-semibold">{t.inputLabel}</label>
            <div className="flex gap-2">
              <button type="button" className={buttonClass} onClick={() => { setSource(SAMPLE); setBatch([]); set("componentName", "HeartIcon"); }}>
                {t.loadSample}
              </button>
              <button type="button" className={buttonClass} onClick={() => { setSource(""); setBatch([]); }}>
                {t.clear}
              </button>
            </div>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void loadFiles(e.dataTransfer.files); }}
            className={`rounded-lg border-2 border-dashed ${dragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-300 dark:border-slate-700"}`}
          >
            <textarea
              id={inputId}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t.inputPlaceholder}
              spellCheck={false}
              className="block h-64 w-full resize-y rounded-t-lg bg-transparent p-3 font-mono text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
            <div className="flex flex-wrap items-center gap-1 border-t border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
              <span>{t.dropHint}</span>
              <button type="button" onClick={() => fileInput.current?.click()} className="font-medium text-indigo-700 underline dark:text-indigo-300">
                {t.chooseFiles}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".svg,image/svg+xml"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-label={t.chooseFiles}
                onChange={(e) => { if (e.target.files) void loadFiles(e.target.files); e.target.value = ""; }}
              />
              <span className="w-full">{t.fileNote}</span>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold">{t.optionsLabel}</legend>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                {t.options.componentName}
                <input className={fieldClass} value={options.componentName} onChange={(e) => set("componentName", e.target.value)} spellCheck={false} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t.options.precision}
                <select
                  className={fieldClass}
                  value={options.precision === null ? "off" : String(options.precision)}
                  onChange={(e) => set("precision", e.target.value === "off" ? null : Number(e.target.value))}
                >
                  <option value="off">{t.options.precisionOff}</option>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{fmt(t.options.decimals, { n })}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {BOOL_OPTIONS.map((key) => {
                const disabled = isDisabled(key, options.target);
                return (
                  <label key={key} className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={options[key]}
                      disabled={disabled}
                      onChange={(e) => set(key, e.target.checked)}
                    />
                    {t.options[key]}
                  </label>
                );
              })}
            </div>
            <div className={`mt-3 flex flex-wrap items-center gap-4 text-sm ${isDisabled("exportStyle", options.target) ? "opacity-50" : ""}`}>
              <span>{t.options.exportStyle}:</span>
              {(["default", "named"] as const).map((style) => (
                <label key={style} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`${ids}-export`}
                    className="accent-indigo-600"
                    checked={options.exportStyle === style}
                    disabled={isDisabled("exportStyle", options.target)}
                    onChange={() => set("exportStyle", style)}
                  />
                  {style === "default" ? t.options.exportDefault : t.options.exportNamed}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`${ids}-target`} className="text-sm font-semibold">{t.targetLabel}</label>
            <select
              id={`${ids}-target`}
              className={fieldClass}
              value={options.target}
              onChange={(e) => set("target", e.target.value as Target)}
            >
              {TARGETS.map((target) => (
                <option key={target} value={target}>{t.targets[target]}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <pre
              id={outputId}
              aria-label={t.outputLabel}
              tabIndex={0}
              className="h-96 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-100"
            >
              {outcome.ok ? (
                <code>{outcome.result.code}</code>
              ) : source.trim() === "" ? (
                <span className="text-slate-400">{t.emptyOutput}</span>
              ) : (
                <span role="alert" className="whitespace-pre-wrap text-rose-300">
                  <strong className="block">{t.errorTitle}</strong>
                  {errorMessage(outcome.error)}
                </span>
              )}
            </pre>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={copy} disabled={!outcome.ok} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <span aria-live="polite">{copied ? t.copied : t.copy}</span>
            </button>
            <button type="button" onClick={download} disabled={!outcome.ok} className={buttonClass}>
              {fmt(t.download, {
                file: outcome.ok ? outcome.result.fileName : `${options.componentName}.${outputExtension(options)}`,
              })}
            </button>
          </div>

          {outcome.ok && outcome.result.warnings.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-semibold">{t.warningsTitle}</p>
              <ul className="mt-1 list-disc pl-5">
                {outcome.result.warnings.map((w) => (
                  <li key={`${w.code}-${w.detail}`}>{fmt(t.warnings[w.code], { detail: w.detail })}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 grid grid-cols-[8rem_1fr] gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold">{t.previewLabel}</p>
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2 dark:border-slate-700">
                {outcome.ok && (
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(outcome.optimized)}`}
                    alt={t.previewAlt}
                    width={112}
                    height={112}
                    className="h-28 w-28 object-contain"
                  />
                )}
              </div>
            </div>
            <dl className="self-end text-sm">
              <div className="flex justify-between gap-2 border-b border-slate-100 py-1 dark:border-slate-800">
                <dt>{t.sizeOriginal}</dt>
                <dd className="font-mono">{bytes.format(size(source))}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 py-1 dark:border-slate-800">
                <dt>{t.sizeOptimized}</dt>
                <dd className="font-mono">
                  {outcome.ok ? bytes.format(size(outcome.optimized)) : "—"}
                  {outcome.ok && size(source) > 0 && (
                    <span className="ml-1 text-emerald-700 dark:text-emerald-400">
                      ({percent.format(size(outcome.optimized) / size(source) - 1)})
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt>{t.sizeOutput}</dt>
                <dd className="font-mono">{outcome.ok ? bytes.format(size(outcome.result.code)) : "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {batch.length > 1 && (
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              {t.batchTitle}{" "}
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                {fmt(t.batchCount, { n: batch.length - failed })}
                {failed > 0 && ` · ${fmt(t.batchFailed, { n: failed })}`}
              </span>
            </h2>
            <button type="button" onClick={downloadZip} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
              {t.downloadZip}
            </button>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {batchResults.map(({ item, outcome: o }) => (
              <li key={item.name} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="truncate font-mono">
                  {o.ok ? o.result.fileName : item.name}
                  {!o.ok && <span className="ml-2 text-rose-600 dark:text-rose-400">{t.batchError}</span>}
                </span>
                <button
                  type="button"
                  className="text-indigo-700 underline dark:text-indigo-300"
                  onClick={() => { setSource(item.source); set("componentName", item.name); }}
                >
                  {t.batchShow}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
