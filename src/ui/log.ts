import { c } from "./colors.js";

export const log = {
  success: (msg: string) => console.log(`  ${c.green}✔${c.reset}  ${msg}`),
  info: (msg: string) => console.log(`  ${c.cyan}ℹ${c.reset}  ${msg}`),
  warn: (msg: string) => console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`),
  error: (msg: string) => console.log(`  ${c.red}✖${c.reset}  ${msg}`),
  dim: (msg: string) => console.log(`     ${c.dim}${msg}${c.reset}`),
};
