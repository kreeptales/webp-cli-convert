const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const e = (code: string) => (isTTY ? `\x1b[${code}m` : "");

export const c = {
  reset: e("0"),
  bold: e("1"),
  dim: e("2"),
  italic: e("3"),
  green: e("32"),
  cyan: e("36"),
  yellow: e("33"),
  red: e("31"),
  magenta: e("35"),
  blue: e("34"),
  gray: e("90"),
  bgCyan: e("46"),
  bgGreen: e("42"),
  black: e("30"),
};

export const B = { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };

// Dynamic regex to avoid control-character-in-regex lint rule
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** Strip ANSI codes and return the printable length of a string. */
export function vlen(s: string): number {
  return s.replace(ANSI_RE, "").length;
}

/** Pad string to visible width `w`, ignoring ANSI codes. */
export function padEnd(s: string, w: number): string {
  return s + " ".repeat(Math.max(0, w - vlen(s)));
}
