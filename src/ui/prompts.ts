import { B, c, padEnd, vlen } from "./colors.js";
import type { RawModeSession } from "./raw-mode.js";

const W = 56;

function frameTop(title: string): string {
  const head = `${B.h}${B.h} ${c.bold}${c.cyan}${title}${c.reset}${c.dim} `;
  const fill = W - (vlen(title) + 4);
  return `  ${c.dim}${B.tl}${head}${B.h.repeat(Math.max(0, fill))}${B.tr}${c.reset}`;
}

function frameMid(content: string): string {
  return `  ${c.dim}${B.v}${c.reset} ${padEnd(content, W - 2)} ${c.dim}${B.v}${c.reset}`;
}

function frameBottom(): string {
  return `  ${c.dim}${B.bl}${B.h.repeat(W)}${B.br}${c.reset}`;
}

// ─── Select prompt ────────────────────────────────────────────────────────────

export interface Choice<T> {
  label: string;
  value: T;
  hint?: string;
}

export async function selectPrompt<T>(
  session: RawModeSession,
  title: string,
  choices: Choice<T>[],
): Promise<T | null> {
  let idx = 0;

  function render(): void {
    session.clear();
    const lines: string[] = ["", frameTop(title)];
    for (let i = 0; i < choices.length; i++) {
      const ch = choices[i];
      if (!ch) continue;
      const sel = i === idx;
      const cursor = sel ? `${c.cyan}${c.bold}▸${c.reset}` : " ";
      const label = sel ? `${c.bold}${ch.label}${c.reset}` : ch.label;
      const hint = ch.hint ? `  ${c.dim}${ch.hint}${c.reset}` : "";
      lines.push(frameMid(`${cursor} ${label}${hint}`));
    }
    lines.push(frameBottom());
    lines.push(`  ${c.dim}↑↓ navigate   ↵ select   Esc/Ctrl+C cancel${c.reset}`);
    process.stdout.write(`${lines.join("\n")}\n`);
  }

  return new Promise((resolve) => {
    render();
    const off = session.onKey((key) => {
      if (key === "\x1b[A") {
        idx = Math.max(0, idx - 1);
        render();
      } else if (key === "\x1b[B") {
        idx = Math.min(choices.length - 1, idx + 1);
        render();
      } else if (key === "\r" || key === "\n") {
        off();
        resolve(choices[idx]?.value ?? null);
      } else if (key === "\x1b" || key === "\x03") {
        off();
        resolve(null);
      }
    });
  });
}

// ─── Toggle prompt ────────────────────────────────────────────────────────────

export async function togglePrompt(
  session: RawModeSession,
  title: string,
  initial = false,
): Promise<boolean | null> {
  let value = initial;

  function render(): void {
    session.clear();
    const on = value ? `${c.bold}${c.green}Yes${c.reset}` : `${c.dim}Yes${c.reset}`;
    const off = !value ? `${c.bold}${c.red}No${c.reset}` : `${c.dim}No${c.reset}`;
    const toggle = `${on}  /  ${off}`;
    const lines = ["", frameTop(title), frameMid(`  ${toggle}`), frameBottom()];
    lines.push(`  ${c.dim}← → or Y/N to toggle   ↵ confirm   Esc/Ctrl+C cancel${c.reset}`);
    process.stdout.write(`${lines.join("\n")}\n`);
  }

  return new Promise((resolve) => {
    render();
    const off = session.onKey((key) => {
      if (key === "\x1b[D" || key === "n" || key === "N") {
        value = false;
        render();
      } else if (key === "\x1b[C" || key === "y" || key === "Y") {
        value = true;
        render();
      } else if (key === " ") {
        value = !value;
        render();
      } else if (key === "\r" || key === "\n") {
        off();
        resolve(value);
      } else if (key === "\x1b" || key === "\x03") {
        off();
        resolve(null);
      }
    });
  });
}

// ─── Number prompt ────────────────────────────────────────────────────────────

export async function numberPrompt(
  session: RawModeSession,
  title: string,
  { min, max, initial }: { min: number; max: number; initial: number },
): Promise<number | null> {
  let buffer = String(initial);
  let error = "";

  function render(): void {
    session.clear();
    const display = `${c.bold}${buffer}${c.reset}${c.dim}_${c.reset}`;
    const range = `${c.dim}(${min}–${max})${c.reset}`;
    const err = error ? `  ${c.red}${error}${c.reset}` : "";
    const lines = ["", frameTop(title), frameMid(`  ${display}  ${range}${err}`), frameBottom()];
    lines.push(`  ${c.dim}Type a number   ↵ confirm   Esc/Ctrl+C cancel${c.reset}`);
    process.stdout.write(`${lines.join("\n")}\n`);
  }

  return new Promise((resolve) => {
    render();
    const off = session.onKey((key) => {
      if (key === "\x7f" || key === "\b") {
        buffer = buffer.slice(0, -1);
        error = "";
        render();
      } else if (key >= "0" && key <= "9") {
        buffer += key;
        error = "";
        render();
      } else if (key === "\r" || key === "\n") {
        const n = Number(buffer);
        if (!buffer || !Number.isInteger(n) || n < min || n > max) {
          error = `Must be ${min}–${max}`;
          render();
          return;
        }
        off();
        resolve(n);
      } else if (key === "\x1b" || key === "\x03") {
        off();
        resolve(null);
      }
    });
  });
}

// ─── Text prompt ──────────────────────────────────────────────────────────────

export async function textPrompt(
  session: RawModeSession,
  title: string,
  { initial = "", validate }: { initial?: string; validate?: (v: string) => string | null } = {},
): Promise<string | null> {
  let buffer = initial;
  let error = "";

  function render(): void {
    session.clear();
    const display = buffer
      ? `${c.bold}${buffer}${c.reset}${c.dim}▏${c.reset}`
      : `${c.dim}▏${c.reset}`;
    const err = error ? `  ${c.red}${error}${c.reset}` : "";
    const lines = ["", frameTop(title), frameMid(`  ${display}${err}`), frameBottom()];
    lines.push(`  ${c.dim}Type text   ↵ confirm   Esc/Ctrl+C cancel${c.reset}`);
    process.stdout.write(`${lines.join("\n")}\n`);
  }

  return new Promise((resolve) => {
    render();
    const off = session.onKey((key) => {
      if (key === "\x7f" || key === "\b") {
        buffer = buffer.slice(0, -1);
        error = "";
        render();
      } else if (key === "\r" || key === "\n") {
        const msg = validate?.(buffer);
        if (msg) {
          error = msg;
          render();
          return;
        }
        off();
        resolve(buffer);
      } else if (key === "\x1b" || key === "\x03") {
        off();
        resolve(null);
      } else if (key.length === 1 && key >= " ") {
        buffer += key;
        error = "";
        render();
      }
    });
  });
}
