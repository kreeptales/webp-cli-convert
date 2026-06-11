import fs from "node:fs";
import path from "node:path";
import { SKIP_DIRS, SUPPORTED_EXTENSIONS } from "../constants.js";
import { B, c, padEnd, vlen } from "./colors.js";
import type { RawModeSession } from "./raw-mode.js";

interface Entry {
  name: string;
  type: "select" | "parent" | "dir" | "file";
  fullPath: string;
}

const W = 60;

function frameTop(title: string): string {
  const head = `${B.h}${B.h} ${c.bold}${c.cyan}${title}${c.reset}${c.dim} `;
  const fill = W - (vlen(title) + 4);
  return `  ${c.dim}${B.tl}${head}${B.h.repeat(Math.max(0, fill))}${B.tr}${c.reset}`;
}

function frameMid(content: string): string {
  return `  ${c.dim}${B.v}${c.reset} ${padEnd(content, W - 2)} ${c.dim}${B.v}${c.reset}`;
}

function frameSep(): string {
  return `  ${c.dim}├${B.h.repeat(W)}┤${c.reset}`;
}

function frameBottom(): string {
  return `  ${c.dim}${B.bl}${B.h.repeat(W)}${B.br}${c.reset}`;
}

function buildEntries(dir: string): Entry[] {
  const items: Entry[] = [
    { name: "[ Convert images in this folder ]", type: "select", fullPath: dir },
  ];

  const parent = path.dirname(dir);
  if (parent !== dir) {
    items.push({ name: "..", type: "parent", fullPath: parent });
  }

  try {
    const raw = fs.readdirSync(dir, { withFileTypes: true });
    const dirs: Entry[] = [];
    const imgs: Entry[] = [];

    for (const e of raw) {
      if (e.name.startsWith(".")) continue;
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) dirs.push({ name: e.name, type: "dir", fullPath });
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) imgs.push({ name: e.name, type: "file", fullPath });
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    imgs.sort((a, b) => a.name.localeCompare(b.name));
    items.push(...dirs, ...imgs);
  } catch {
    // permission denied — show what we have
  }

  return items;
}

function render(
  session: RawModeSession,
  currentPath: string,
  entries: Entry[],
  selectedIndex: number,
): void {
  session.clear();
  const out: string[] = ["", frameTop("Folder Browser")];

  let displayPath = currentPath;
  if (displayPath.length > W - 4) displayPath = `…${displayPath.slice(-(W - 5))}`;
  out.push(frameMid(`${c.cyan}${displayPath}${c.reset}`));
  out.push(frameSep());

  const maxVisible = 14;
  const half = Math.floor(maxVisible / 2);
  const start = Math.max(0, Math.min(selectedIndex - half, entries.length - maxVisible));
  const end = Math.min(entries.length, start + maxVisible);

  if (start > 0) out.push(frameMid(`${c.dim}  ↑ ${start} more above${c.reset}`));

  for (let i = start; i < end; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const sel = i === selectedIndex;
    const cursor = sel ? `${c.cyan}${c.bold}▸${c.reset}` : " ";

    let icon: string;
    let text: string;

    if (entry.type === "select") {
      icon = `${c.green}✦${c.reset}`;
      text = sel
        ? `${c.bold}${c.green}Convert images in this folder${c.reset}`
        : `${c.green}Convert images in this folder${c.reset}`;
    } else if (entry.type === "parent") {
      icon = `${c.yellow}↰${c.reset}`;
      text = sel ? `${c.bold}${c.yellow}.. (go up)${c.reset}` : `${c.dim}.. (go up)${c.reset}`;
    } else if (entry.type === "dir") {
      icon = `${c.cyan}▸${c.reset}`;
      text = sel
        ? `${c.bold}${c.cyan}${entry.name}/${c.reset}`
        : `${c.cyan}${entry.name}/${c.reset}`;
    } else {
      icon = `${c.magenta}◆${c.reset}`;
      text = sel ? `${c.bold}${entry.name}${c.reset}` : `${c.dim}${entry.name}${c.reset}`;
    }

    out.push(frameMid(`${cursor} ${icon}  ${text}`));
  }

  if (end < entries.length)
    out.push(frameMid(`${c.dim}  ↓ ${entries.length - end} more below${c.reset}`));

  out.push(frameSep());

  const cur = entries[selectedIndex];
  let note = "";
  if (cur) {
    if (cur.type === "select") {
      const imgCount = entries.filter((e) => e.type === "file").length;
      note =
        imgCount > 0
          ? `${c.green}${imgCount}${c.reset}${c.dim} image(s) ready to convert${c.reset}`
          : `${c.dim}no supported images here${c.reset}`;
    } else if (cur.type === "file") {
      note = `${c.dim}Enter → convert this file only${c.reset}`;
    } else {
      note = `${c.dim}Enter / → open folder${c.reset}`;
    }
  }

  out.push(frameMid(note));
  out.push(frameBottom());
  out.push(
    `  ${c.dim}↑↓${c.reset} navigate   ${c.dim}↵${c.reset} open/select   ${c.dim}←${c.reset} up   ${c.dim}q / Esc${c.reset} quit`,
  );

  process.stdout.write(`${out.join("\n")}\n`);
}

export async function browseFolder(
  session: RawModeSession,
  startDir = process.cwd(),
): Promise<string | null> {
  let currentPath = startDir;
  let selectedIndex = 0;
  let entries = buildEntries(currentPath);

  render(session, currentPath, entries, selectedIndex);

  return new Promise((resolve) => {
    const off = session.onKey((key) => {
      if (key === "\x03" || key === "\x1b" || key === "q" || key === "Q") {
        off();
        resolve(null);
        return;
      }

      if (key === "\x1b[A") {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render(session, currentPath, entries, selectedIndex);
        return;
      }

      if (key === "\x1b[B") {
        selectedIndex = Math.min(entries.length - 1, selectedIndex + 1);
        render(session, currentPath, entries, selectedIndex);
        return;
      }

      if (key === "\x1b[D" || key === "\x7f" || key === "\b") {
        const parent = path.dirname(currentPath);
        if (parent !== currentPath) {
          try {
            fs.accessSync(parent, fs.constants.R_OK);
            currentPath = parent;
            entries = buildEntries(currentPath);
            selectedIndex = 0;
            render(session, currentPath, entries, selectedIndex);
          } catch {
            // ignore permission errors
          }
        }
        return;
      }

      if (key === "\r" || key === "\n" || key === "\x1b[C") {
        const entry = entries[selectedIndex];
        if (!entry) return;

        if (entry.type === "select") {
          off();
          resolve(currentPath);
        } else if (entry.type === "parent" || entry.type === "dir") {
          try {
            fs.accessSync(entry.fullPath, fs.constants.R_OK);
            currentPath = entry.fullPath;
            entries = buildEntries(currentPath);
            selectedIndex = 0;
            render(session, currentPath, entries, selectedIndex);
          } catch {
            // flash permission error in note area - re-render with message
            const errEntries = [...entries];
            render(session, currentPath, errEntries, selectedIndex);
            process.stdout.write(
              `\n  ${"\x1b[31m"}✖${"\x1b[0m"}  Cannot open folder (permission denied)\n`,
            );
          }
        } else if (entry.type === "file") {
          off();
          resolve(entry.fullPath);
        }
      }
    });
  });
}
