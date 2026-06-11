import path from "node:path";
import fs from "node:fs";
import { c } from "./colors.js";
import { box } from "./components.js";
import { numberPrompt, selectPrompt, textPrompt, togglePrompt } from "./prompts.js";
import type { RawModeSession } from "./raw-mode.js";
import { DEFAULT_OPTIONS } from "../constants.js";
import type { ConvertOptions } from "../types.js";

/**
 * Interactive wizard shown after selecting a folder/file in the browser.
 * Walks the user through all conversion options and shows a confirmation summary.
 * Returns configured options or null if cancelled.
 */
export async function configureOptions(
  session: RawModeSession,
  target: string,
  defaults: ConvertOptions = DEFAULT_OPTIONS,
): Promise<ConvertOptions | null> {
  const isDir = fs.statSync(target).isDirectory();

  // Step 1 — lossless or quality?
  const compressionMode = await selectPrompt(session, "Compression mode", [
    { label: "Lossy (quality-based)", value: "lossy", hint: "smaller files, recommended" },
    { label: "Lossless", value: "lossless", hint: "larger files, 0% quality loss" },
  ]);
  if (compressionMode === null) return null;

  const lossless = compressionMode === "lossless";
  let quality = defaults.quality;

  if (!lossless) {
    const q = await numberPrompt(session, "Quality (1–100)", { min: 1, max: 100, initial: quality });
    if (q === null) return null;
    quality = q;
  }

  // Step 2 — delete originals?
  const deleteOriginals = await togglePrompt(
    session,
    "Delete originals after conversion?",
    defaults.deleteOriginals,
  );
  if (deleteOriginals === null) return null;

  // Step 3 — recursive? (only for directories)
  let recursive = defaults.recursive;
  if (isDir) {
    const r = await togglePrompt(session, "Process subfolders recursively?", defaults.recursive);
    if (r === null) return null;
    recursive = r;
  }

  // Step 4 — output directory
  const outputMode = await selectPrompt(session, "Output directory", [
    { label: "Same folder as source", value: "same" },
    { label: "Custom folder", value: "custom" },
  ]);
  if (outputMode === null) return null;

  let output: string | undefined;
  if (outputMode === "custom") {
    const raw = await textPrompt(session, "Output folder path", {
      initial: defaults.output ?? "",
      validate: (v) => {
        if (!v.trim()) return "Path cannot be empty";
        return null;
      },
    });
    if (raw === null) return null;
    output = path.resolve(raw);
  }

  // Step 5 — filename suffix
  const suffixInput = await textPrompt(session, "Filename suffix (leave empty for none)", {
    initial: defaults.suffix,
  });
  if (suffixInput === null) return null;

  const opts: ConvertOptions = {
    quality,
    lossless,
    ...(output !== undefined ? { output } : {}),
    suffix: suffixInput,
    recursive,
    deleteOriginals,
    force: defaults.force,
  };

  // Step 6 — confirmation
  const confirmed = await confirmationPrompt(session, target, opts);
  if (!confirmed) return null;

  return opts;
}

async function confirmationPrompt(
  session: RawModeSession,
  target: string,
  opts: ConvertOptions,
): Promise<boolean> {
  session.clear();

  const lines: string[] = [
    `${c.dim}Target       ${c.reset}${c.bold}${target}${c.reset}`,
    `${c.dim}Compression  ${c.reset}${c.bold}${opts.lossless ? "lossless" : `quality ${opts.quality}%`}${c.reset}`,
    `${c.dim}Output dir   ${c.reset}${c.bold}${opts.output ?? "same as source"}${c.reset}`,
    `${c.dim}Suffix       ${c.reset}${c.bold}${opts.suffix || "(none)"}${c.reset}`,
    `${c.dim}Recursive    ${c.reset}${c.bold}${opts.recursive ? "yes" : "no"}${c.reset}`,
    `${c.dim}Originals    ${c.reset}${opts.deleteOriginals ? `${c.yellow}${c.bold}delete after conversion${c.reset}` : `${c.green}${c.bold}keep${c.reset}`}`,
  ];

  process.stdout.write("\n" + box(lines, { title: "Conversion settings", color: c.cyan }) + "\n\n");

  const choice = await selectPrompt(session, "Ready to convert?", [
    { label: "Start conversion", value: "start" },
    { label: "Cancel", value: "cancel" },
  ]);

  return choice === "start";
}
