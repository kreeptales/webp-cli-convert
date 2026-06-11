import { B, c, padEnd, vlen } from "./colors.js";

interface BoxOptions {
  title?: string;
  color?: string;
  pad?: number;
}

export function box(lines: string[], { title = "", color = c.cyan, pad = 1 }: BoxOptions = {}): string {
  const inner = Math.max(
    title ? vlen(title) + 4 : 0,
    ...lines.map((l) => vlen(l) + pad * 2),
  );

  const out: string[] = [];
  const sp = " ".repeat(pad);

  if (title) {
    const head = `${B.h} ${c.bold}${title}${c.reset}${color} `;
    const fill = inner - (vlen(title) + 3);
    out.push(`${color}${B.tl}${head}${B.h.repeat(Math.max(0, fill))}${B.tr}${c.reset}`);
  } else {
    out.push(`${color}${B.tl}${B.h.repeat(inner)}${B.tr}${c.reset}`);
  }

  for (const l of lines) {
    out.push(`${color}${B.v}${c.reset}${sp}${padEnd(l, inner - pad * 2)}${sp}${color}${B.v}${c.reset}`);
  }

  out.push(`${color}${B.bl}${B.h.repeat(inner)}${B.br}${c.reset}`);
  return out.join("\n");
}

export function bar(ratio: number, width = 22, fill = c.green): string {
  const r = Math.max(0, Math.min(1, ratio));
  const f = Math.round(r * width);
  return `${fill}${"█".repeat(f)}${c.gray}${"░".repeat(width - f)}${c.reset}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function banner(): void {
  const title = `${c.bold}${c.cyan}WebP${c.reset} ${c.bold}Converter${c.reset}`;
  const sub = `${c.dim}images → .webp · lossless-grade${c.reset}`;
  console.log();
  console.log(box([title, sub], { color: c.cyan }));
}
