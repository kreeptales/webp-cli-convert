#!/usr/bin/env node

/**
 * WebP Converter — Convert images to WebP without quality loss
 * Supports: JPG, JPEG, PNG, GIF, TIFF, AVIF, BMP
 * Usage: img-to-webp [options] <path>
 *        img-to-webp          <- opens the folder browser
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  black: "\x1b[30m",
};

const log = {
  success: (msg) => console.log(`  ${c.green}✔${c.reset}  ${msg}`),
  info: (msg) => console.log(`  ${c.cyan}ℹ${c.reset}  ${msg}`),
  warn: (msg) => console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`),
  error: (msg) => console.log(`  ${c.red}✖${c.reset}  ${msg}`),
  dim: (msg) => console.log(`     ${c.dim}${msg}${c.reset}`),
};

// ─── UI helpers (box drawing, padding, bars) ───────────────────────────────────
const B = { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };

const ui = {
  // Visible length, ignoring ANSI escape sequences.
  vlen: (s) => s.replace(/\x1b\[[0-9;]*m/g, "").length,

  padEnd(s, w) {
    return s + " ".repeat(Math.max(0, w - this.vlen(s)));
  },

  // Render a framed box. `lines` may contain ANSI codes.
  box(lines, { title = "", color = c.cyan, pad = 1 } = {}) {
    const inner = Math.max(
      title ? this.vlen(title) + 4 : 0,
      ...lines.map((l) => this.vlen(l) + pad * 2)
    );

    const out = [];
    // top border with optional title
    if (title) {
      const head = `${B.h} ${c.bold}${title}${c.reset}${color} `;
      const fill = inner - (this.vlen(title) + 3);
      out.push(`${color}${B.tl}${head}${B.h.repeat(Math.max(0, fill))}${B.tr}${c.reset}`);
    } else {
      out.push(`${color}${B.tl}${B.h.repeat(inner)}${B.tr}${c.reset}`);
    }
    // content
    const sp = " ".repeat(pad);
    for (const l of lines) {
      out.push(`${color}${B.v}${c.reset}${sp}${this.padEnd(l, inner - pad * 2)}${sp}${color}${B.v}${c.reset}`);
    }
    // bottom border
    out.push(`${color}${B.bl}${B.h.repeat(inner)}${B.br}${c.reset}`);
    return out.join("\n");
  },

  bar(ratio, width = 22, fill = c.green) {
    const r = Math.max(0, Math.min(1, ratio));
    const f = Math.round(r * width);
    return `${fill}${"█".repeat(f)}${c.gray}${"░".repeat(width - f)}${c.reset}`;
  },
};

// ─── Banner ─────────────────────────────────────────────────────────────────────
function banner() {
  const title = `${c.bold}${c.cyan}WebP${c.reset} ${c.bold}Converter${c.reset}`;
  const sub = `${c.dim}images → .webp · lossless-grade${c.reset}`;
  console.log();
  console.log(ui.box([title, sub], { color: c.cyan }));
}

// ─── Help ─────────────────────────────────────────────────────────────────────
function showHelp() {
  banner();
  console.log(`
  ${c.bold}USAGE${c.reset}
    ${c.cyan}webp-cli-convert${c.reset}                      Opens the folder browser
    ${c.cyan}webp-cli-convert${c.reset} ${c.dim}[options]${c.reset} ${c.green}<path>${c.reset}     Direct conversion

  ${c.bold}OPTIONS${c.reset}
    ${c.cyan}-q, --quality <n>${c.reset}     WebP quality (1-100, default: ${c.bold}90${c.reset})
    ${c.cyan}-o, --output <dir>${c.reset}    Output folder (default: same as source)
    ${c.cyan}-s, --suffix <text>${c.reset}   Suffix for output filename (default: none)
    ${c.cyan}-r, --recursive${c.reset}       Process subfolders as well
    ${c.cyan}-k, --keep-original${c.reset}   Keep original files (default: kept)
    ${c.cyan}--lossless${c.reset}            Force lossless compression (larger file, 0% loss)
    ${c.cyan}-f, --force${c.reset}           Reconvert even if .webp already exists
    ${c.cyan}-h, --help${c.reset}            Show this help

  ${c.bold}EXAMPLES${c.reset}
    ${c.dim}$${c.reset} webp-cli-convert photo.jpg
    ${c.dim}$${c.reset} webp-cli-convert -q 85 ./images
    ${c.dim}$${c.reset} webp-cli-convert -q 95 -o ./webp ./photos
    ${c.dim}$${c.reset} webp-cli-convert --lossless logo.png
    ${c.dim}$${c.reset} webp-cli-convert -r -q 90 -o ./dist/img ./src/assets

  ${c.bold}SUPPORTED FORMATS${c.reset}
    ${c.green}JPG${c.reset} · ${c.green}JPEG${c.reset} · ${c.green}PNG${c.reset} · ${c.green}GIF${c.reset} · ${c.green}TIFF${c.reset} · ${c.green}TIF${c.reset} · ${c.green}AVIF${c.reset} · ${c.green}BMP${c.reset}

  ${c.dim}${c.italic}Quality 90 produces files ~30-50% smaller than JPG/PNG with identical visual quality.${c.reset}
`);
}

// ─── Parse arguments ──────────────────────────────────────────────────────────
function parseArgs(args) {
  const opts = {
    quality: 90,
    output: null,
    suffix: "",
    recursive: false,
    keepOriginal: true,
    lossless: false,
    force: false,
    input: null,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") { showHelp(); process.exit(0); }
    else if (a === "-q" || a === "--quality") opts.quality = parseInt(args[++i]) || 90;
    else if (a === "-o" || a === "--output") opts.output = args[++i];
    else if (a === "-s" || a === "--suffix") opts.suffix = args[++i];
    else if (a === "-r" || a === "--recursive") opts.recursive = true;
    else if (a === "-k" || a === "--keep-original") opts.keepOriginal = true;
    else if (a === "--lossless") opts.lossless = true;
    else if (a === "-f" || a === "--force") opts.force = true;
    else if (!a.startsWith("-")) opts.input = a;
  }

  return opts;
}

// ─── Format bytes ─────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Get image files ──────────────────────────────────────────────────────────
const SUPPORTED = [".jpg", ".jpeg", ".png", ".gif", ".tiff", ".tif", ".avif", ".bmp"];

const SKIP_DIRS = new Set(["node_modules", ".git", ".svn", "dist", "build", ".next", "__pycache__"]);

function getImageFiles(inputPath, recursive = false) {
  const stat = fs.statSync(inputPath);

  if (stat.isFile()) {
    const ext = path.extname(inputPath).toLowerCase();
    if (!SUPPORTED.includes(ext)) {
      log.error(`Unsupported format: ${ext}. Use: ${SUPPORTED.join(", ")}`);
      process.exit(1);
    }
    return [inputPath];
  }

  if (stat.isDirectory()) {
    const files = [];
    const entries = fs.readdirSync(inputPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(inputPath, entry.name);
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED.includes(ext)) files.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        files.push(...getImageFiles(fullPath, true));
      }
    }

    return files;
  }

  log.error(`Path not found: ${inputPath}`);
  process.exit(1);
}

// ─── Convert a single image ───────────────────────────────────────────────────
async function convertImage(inputFile, opts, progress) {
  const dir = opts.output || path.dirname(inputFile);
  const baseName = path.basename(inputFile, path.extname(inputFile));
  const outFile = path.join(dir, `${baseName}${opts.suffix}.webp`);

  // progress line: [ n/total ] ████░░░░  42%
  const tag = `${c.dim}[${c.reset}${c.bold}${progress.current}${c.reset}${c.dim}/${progress.total}]${c.reset}`;
  const ratio = progress.current / progress.total;
  const pct = `${String(Math.round(ratio * 100)).padStart(3)}%`;
  process.stdout.write(`\n  ${tag} ${ui.bar(ratio)} ${c.bold}${pct}${c.reset}\n`);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!opts.force && fs.existsSync(outFile)) {
    log.warn(`${c.bold}${path.basename(outFile)}${c.reset} ${c.dim}already exists, skipping${c.reset}`);
    return { skipped: true };
  }

  const beforeSize = fs.statSync(inputFile).size;

  try {
    const webpOpts = opts.lossless
      ? { lossless: true }
      : { quality: opts.quality, effort: 6 };

    await sharp(inputFile).webp(webpOpts).toFile(outFile);

    const afterSize = fs.statSync(outFile).size;
    const saved = ((1 - afterSize / beforeSize) * 100).toFixed(1);
    const savedPositive = parseFloat(saved) > 0;

    const sizeInfo = savedPositive
      ? `${c.green}↓ ${saved}% smaller${c.reset}`
      : `${c.yellow}↑ ${Math.abs(saved)}% larger${c.reset}`;

    fs.unlinkSync(inputFile);

    log.success(`${c.bold}${path.basename(outFile)}${c.reset}`);
    log.dim(`${formatBytes(beforeSize)} ${c.cyan}→${c.reset} ${formatBytes(afterSize)}   ${sizeInfo}   ${c.dim}(original deleted)${c.reset}`);

    return { input: inputFile, output: outFile, before: beforeSize, after: afterSize };
  } catch (err) {
    log.error(`Failed to convert ${path.basename(inputFile)}: ${err.message}`);
    return null;
  }
}

// ─── Interactive folder browser ───────────────────────────────────────────────
async function browseFolder() {
  return new Promise((resolve) => {
    let currentPath = process.cwd();
    let selectedIndex = 0;
    let entries = [];

    function buildEntries(dir) {
      const items = [
        { name: "[ Convert images in this folder ]", type: "select", fullPath: dir },
      ];

      const parent = path.dirname(dir);
      if (parent !== dir) {
        items.push({ name: "..", type: "parent", fullPath: parent });
      }

      try {
        const raw = fs.readdirSync(dir, { withFileTypes: true });
        const dirs = [];
        const imgs = [];

        for (const e of raw) {
          if (e.name.startsWith(".")) continue;
          const fullPath = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (!SKIP_DIRS.has(e.name)) dirs.push({ name: e.name, type: "dir", fullPath });
          } else if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            if (SUPPORTED.includes(ext)) imgs.push({ name: e.name, type: "file", fullPath });
          }
        }

        dirs.sort((a, b) => a.name.localeCompare(b.name));
        imgs.sort((a, b) => a.name.localeCompare(b.name));
        items.push(...dirs, ...imgs);
      } catch (_) {}

      return items;
    }

    const W = 60;

    function frameTop(title) {
      const head = `${B.h}${B.h} ${c.bold}${c.cyan}${title}${c.reset}${c.dim} `;
      const fill = W - (ui.vlen(title) + 4);
      return `  ${c.dim}${B.tl}${head}${B.h.repeat(Math.max(0, fill))}${B.tr}${c.reset}`;
    }
    function frameMid(content) {
      return `  ${c.dim}${B.v}${c.reset} ${ui.padEnd(content, W - 2)} ${c.dim}${B.v}${c.reset}`;
    }
    function frameSep() {
      return `  ${c.dim}├${B.h.repeat(W)}┤${c.reset}`;
    }
    function frameBottom() {
      return `  ${c.dim}${B.bl}${B.h.repeat(W)}${B.br}${c.reset}`;
    }

    function render() {
      process.stdout.write("\x1b[2J\x1b[H");

      const out = [];
      out.push("");
      out.push(frameTop("Folder Browser"));

      let displayPath = currentPath;
      if (displayPath.length > W - 4) displayPath = "…" + displayPath.slice(-(W - 5));
      out.push(frameMid(`${c.cyan}${displayPath}${c.reset}`));
      out.push(frameSep());

      const maxVisible = 14;
      const half = Math.floor(maxVisible / 2);
      const start = Math.max(0, Math.min(selectedIndex - half, entries.length - maxVisible));
      const end = Math.min(entries.length, start + maxVisible);

      if (start > 0) out.push(frameMid(`${c.dim}  ↑ ${start} more above${c.reset}`));

      for (let i = start; i < end; i++) {
        const entry = entries[i];
        const sel = i === selectedIndex;
        const cursor = sel ? `${c.cyan}${c.bold}▸${c.reset}` : " ";

        let icon, text;
        if (entry.type === "select") {
          icon = `${c.green}✦${c.reset}`;
          text = sel ? `${c.bold}${c.green}Convert images in this folder${c.reset}` : `${c.green}Convert images in this folder${c.reset}`;
        } else if (entry.type === "parent") {
          icon = `${c.yellow}↰${c.reset}`;
          text = sel ? `${c.bold}${c.yellow}.. (go up)${c.reset}` : `${c.dim}.. (go up)${c.reset}`;
        } else if (entry.type === "dir") {
          icon = `${c.cyan}▸${c.reset}`;
          text = sel ? `${c.bold}${c.cyan}${entry.name}/${c.reset}` : `${c.cyan}${entry.name}/${c.reset}`;
        } else {
          icon = `${c.magenta}◆${c.reset}`;
          text = sel ? `${c.bold}${entry.name}${c.reset}` : `${c.dim}${entry.name}${c.reset}`;
        }

        out.push(frameMid(`${cursor} ${icon}  ${text}`));
      }

      if (end < entries.length) out.push(frameMid(`${c.dim}  ↓ ${entries.length - end} more below${c.reset}`));

      out.push(frameSep());

      const cur = entries[selectedIndex];
      let note = "";
      if (cur) {
        if (cur.type === "select") {
          const imgCount = entries.filter((e) => e.type === "file").length;
          note = imgCount > 0 ? `${c.green}${imgCount}${c.reset}${c.dim} image(s) ready to convert${c.reset}` : `${c.dim}no supported images here${c.reset}`;
        } else if (cur.type === "file") {
          note = `${c.dim}Enter → convert this file only${c.reset}`;
        } else {
          note = `${c.dim}Enter / → open folder${c.reset}`;
        }
      }
      out.push(frameMid(note));
      out.push(frameBottom());
      out.push(`  ${c.dim}↑↓${c.reset} navigate   ${c.dim}↵${c.reset} open/select   ${c.dim}←${c.reset} up   ${c.dim}q${c.reset} quit`);

      console.log(out.join("\n"));
    }

    function navigate(dir) {
      try {
        fs.accessSync(dir, fs.constants.R_OK);
        currentPath = dir;
        entries = buildEntries(dir);
        selectedIndex = 0;
        render();
      } catch (_) {}
    }

    navigate(currentPath);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onKey = (key) => {
      if (key === "\x03" || key === "q" || key === "Q") {
        cleanup();
        process.stdout.write("\x1b[2J\x1b[H");
        log.warn("Operation cancelled.");
        process.exit(0);
      }

      if (key === "\x1b[A") {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
        return;
      }

      if (key === "\x1b[B") {
        selectedIndex = Math.min(entries.length - 1, selectedIndex + 1);
        render();
        return;
      }

      if (key === "\x1b[D" || key === "\x7f" || key === "\b") {
        const parent = path.dirname(currentPath);
        if (parent !== currentPath) navigate(parent);
        return;
      }

      if (key === "\r" || key === "\n" || key === "\x1b[C") {
        const entry = entries[selectedIndex];
        if (!entry) return;

        if (entry.type === "select") {
          cleanup();
          resolve(currentPath);
        } else if (entry.type === "parent" || entry.type === "dir") {
          navigate(entry.fullPath);
        } else if (entry.type === "file") {
          cleanup();
          resolve(entry.fullPath);
        }
      }
    };

    function cleanup() {
      process.stdin.removeListener("data", onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on("data", onKey);
  });
}

// ─── Run conversion ───────────────────────────────────────────────────────────
async function runConversion(opts) {
  if (!fs.existsSync(opts.input)) {
    log.error(`Path not found: ${opts.input}`);
    process.exit(1);
  }

  const files = getImageFiles(opts.input, opts.recursive);

  if (files.length === 0) {
    log.warn("No supported images found in the given path.");
    process.exit(0);
  }

  banner();

  const headerLines = [
    `${c.dim}Images found ${c.reset}${c.bold}${files.length}${c.reset}`,
    `${c.dim}Quality      ${c.reset}${c.bold}${opts.lossless ? "lossless" : opts.quality + "%"}${c.reset}`,
  ];
  if (opts.output) headerLines.push(`${c.dim}Output       ${c.reset}${c.bold}${opts.output}${c.reset}`);
  console.log(ui.box(headerLines, { title: "Job", color: c.gray }));

  const results = [];
  let skipped = 0;
  let current = 0;
  for (const file of files) {
    current++;
    const result = await convertImage(file, opts, { current, total: files.length });
    if (result?.skipped) skipped++;
    else if (result) results.push(result);
  }

  if (results.length === 0 && skipped === 0) {
    console.log();
    log.error("Could not convert any images.");
    process.exit(1);
  }

  if (results.length === 0 && skipped > 0) {
    console.log();
    console.log(ui.box([
      `All images already had a ${c.cyan}.webp${c.reset} version.`,
      `${c.dim}Use ${c.cyan}--force${c.reset}${c.dim} to reconvert.${c.reset}`,
    ], { title: "Nothing to do", color: c.yellow }));
    console.log();
    process.exit(0);
  }

  const totalBefore = results.reduce((s, r) => s + r.before, 0);
  const totalAfter = results.reduce((s, r) => s + r.after, 0);
  const totalSaved = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  const savedPositive = parseFloat(totalSaved) > 0;
  const savedColor = savedPositive ? c.green : c.yellow;

  const summaryLines = [
    `${c.dim}Converted    ${c.reset}${c.bold}${results.length}${c.reset}${c.dim} / ${files.length}${c.reset}`,
  ];
  if (skipped > 0) summaryLines.push(`${c.dim}Skipped      ${c.reset}${c.bold}${skipped}${c.reset}${c.dim} (already existed)${c.reset}`);
  summaryLines.push(`${c.dim}Before       ${c.reset}${formatBytes(totalBefore)}`);
  summaryLines.push(`${c.dim}After        ${c.reset}${formatBytes(totalAfter)}`);
  summaryLines.push("");
  summaryLines.push(`${ui.bar(savedPositive ? parseFloat(totalSaved) / 100 : 0, 22, savedColor)}  ${c.bold}${savedColor}${totalSaved}%${c.reset}`);
  summaryLines.push(`${c.dim}Total saved  ${c.reset}${c.bold}${savedColor}${formatBytes(totalBefore - totalAfter)}${c.reset}`);

  console.log();
  console.log(ui.box(summaryLines, { title: "Summary", color: c.green }));
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      const selectedPath = await browseFolder();
      process.stdout.write("\x1b[2J\x1b[H");
      const opts = parseArgs([]);
      opts.input = selectedPath;
      await runConversion(opts);
    } else {
      showHelp();
      process.exit(0);
    }
    return;
  }

  const opts = parseArgs(args);

  if (!opts.input) {
    log.error("You must specify a file or folder.");
    log.dim("Use --help to see available options.");
    process.exit(1);
  }

  await runConversion(opts);
}

main().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
