import { parseCliArgs } from "./args.js";
import { convertAll } from "./converter.js";
import { findImages } from "./scanner.js";
import { CliError } from "./types.js";
import type { ConversionOutcome, ConvertOptions } from "./types.js";
import { bar, banner, box, formatBytes } from "./ui/components.js";
import { showHelp } from "./ui/help.js";
import { log } from "./ui/log.js";
import { c } from "./ui/colors.js";
import { RawModeSession } from "./ui/raw-mode.js";
import { browseFolder } from "./ui/browser.js";
import { configureOptions } from "./ui/wizard.js";
import { DEFAULT_OPTIONS } from "./constants.js";
import path from "node:path";

async function runConversion(opts: ConvertOptions & { input: string }): Promise<void> {
  const files = findImages(opts.input, opts.recursive);

  if (files.length === 0) {
    log.warn("No supported images found in the given path.");
    process.exit(0);
  }

  banner();

  const headerLines = [
    `${c.dim}Images found ${c.reset}${c.bold}${files.length}${c.reset}`,
    `${c.dim}Quality      ${c.reset}${c.bold}${opts.lossless ? "lossless" : `${opts.quality}%`}${c.reset}`,
  ];
  if (opts.output) headerLines.push(`${c.dim}Output       ${c.reset}${c.bold}${opts.output}${c.reset}`);
  if (opts.deleteOriginals) headerLines.push(`${c.dim}Originals    ${c.reset}${c.yellow}${c.bold}will be deleted${c.reset}`);

  console.log(box(headerLines, { title: "Job", color: c.gray }));

  const summary = await convertAll(
    files,
    opts,
    (current: number, total: number, outcome: ConversionOutcome) => {
      const tag = `${c.dim}[${c.reset}${c.bold}${current}${c.reset}${c.dim}/${total}]${c.reset}`;
      const ratio = current / total;
      const pct = `${String(Math.round(ratio * 100)).padStart(3)}%`;
      process.stdout.write(`\n  ${tag} ${bar(ratio)} ${c.bold}${pct}${c.reset}\n`);

      if (outcome.status === "converted") {
        const saved = ((1 - outcome.after / outcome.before) * 100).toFixed(1);
        const savedPositive = parseFloat(saved) > 0;
        const sizeInfo = savedPositive
          ? `${c.green}↓ ${saved}% smaller${c.reset}`
          : `${c.yellow}↑ ${Math.abs(parseFloat(saved))}% larger${c.reset}`;
        const originalNote = outcome.originalDeleted ? "(original deleted)" : "(original kept)";
        log.success(`${c.bold}${path.basename(outcome.output)}${c.reset}`);
        log.dim(
          `${formatBytes(outcome.before)} ${c.cyan}→${c.reset} ${formatBytes(outcome.after)}   ${sizeInfo}   ${c.dim}${originalNote}${c.reset}`,
        );
      } else if (outcome.status === "skipped") {
        log.warn(
          `${c.bold}${path.basename(outcome.output)}${c.reset} ${c.dim}already exists, skipping${c.reset}`,
        );
      } else {
        log.error(`Failed: ${path.basename(outcome.input)}: ${outcome.error.message}`);
      }
    },
  );

  if (summary.converted === 0 && summary.skipped === 0) {
    console.log();
    log.error("Could not convert any images.");
    process.exit(1);
  }

  if (summary.converted === 0 && summary.skipped > 0) {
    console.log();
    console.log(
      box(
        [
          `All images already had a ${c.cyan}.webp${c.reset} version.`,
          `${c.dim}Use ${c.cyan}--force${c.reset}${c.dim} to reconvert.${c.reset}`,
        ],
        { title: "Nothing to do", color: c.yellow },
      ),
    );
    console.log();
    process.exit(0);
  }

  const totalSaved = ((1 - summary.totalAfter / summary.totalBefore) * 100).toFixed(1);
  const savedPositive = parseFloat(totalSaved) > 0;
  const savedColor = savedPositive ? c.green : c.yellow;

  const summaryLines = [
    `${c.dim}Converted    ${c.reset}${c.bold}${summary.converted}${c.reset}${c.dim} / ${files.length}${c.reset}`,
  ];
  if (summary.skipped > 0) {
    summaryLines.push(`${c.dim}Skipped      ${c.reset}${c.bold}${summary.skipped}${c.reset}${c.dim} (already existed)${c.reset}`);
  }
  if (summary.failed > 0) {
    summaryLines.push(`${c.dim}Failed       ${c.reset}${c.red}${c.bold}${summary.failed}${c.reset}`);
  }
  summaryLines.push(`${c.dim}Before       ${c.reset}${formatBytes(summary.totalBefore)}`);
  summaryLines.push(`${c.dim}After        ${c.reset}${formatBytes(summary.totalAfter)}`);
  summaryLines.push("");
  summaryLines.push(
    `${bar(savedPositive ? parseFloat(totalSaved) / 100 : 0, 22, savedColor)}  ${c.bold}${savedColor}${totalSaved}%${c.reset}`,
  );
  summaryLines.push(
    `${c.dim}Total saved  ${c.reset}${c.bold}${savedColor}${formatBytes(summary.totalBefore - summary.totalAfter)}${c.reset}`,
  );

  console.log();
  console.log(box(summaryLines, { title: "Summary", color: c.green }));
  console.log();
}

async function interactiveMode(): Promise<void> {
  const session = new RawModeSession();

  await session.run(async (s) => {
    const selectedPath = await browseFolder(s);
    if (selectedPath === null) return;

    const opts = await configureOptions(s, selectedPath, DEFAULT_OPTIONS);
    if (opts === null) return;

    // Exit raw mode before running conversion (it logs to stdout)
    s.stop();

    await runConversion({ ...opts, input: selectedPath });
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      await interactiveMode();
    } else {
      showHelp();
      process.exit(0);
    }
    return;
  }

  const parsed = parseCliArgs(argv);

  if (parsed.help) {
    showHelp();
    process.exit(0);
  }

  if (!parsed.input) {
    log.error("You must specify a file or folder.");
    log.dim("Use --help to see available options.");
    process.exit(1);
  }

  await runConversion({ ...parsed.options, input: parsed.input });
}

main().catch((err: unknown) => {
  if (err instanceof CliError) {
    log.error(err.message);
    process.exit(err.exitCode);
  }
  log.error(`Unexpected error: ${(err as Error).message}`);
  console.error((err as Error).stack);
  process.exit(1);
});
