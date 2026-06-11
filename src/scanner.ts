import fs from "node:fs";
import path from "node:path";
import { SKIP_DIRS, SUPPORTED_EXTENSIONS } from "./constants.js";
import { CliError } from "./types.js";

export function findImages(inputPath: string, recursive: boolean): string[] {
  let stat: fs.Stats;

  try {
    stat = fs.statSync(inputPath);
  } catch {
    throw new CliError(`Path not found: ${inputPath}`, 1);
  }

  if (stat.isFile()) {
    const ext = path.extname(inputPath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new CliError(
        `Unsupported format: "${ext}". Supported: ${Array.from(SUPPORTED_EXTENSIONS).join(", ")}`,
        1,
      );
    }
    return [inputPath];
  }

  if (stat.isDirectory()) {
    return collectFromDir(inputPath, recursive);
  }

  throw new CliError(`Not a file or directory: ${inputPath}`, 1);
}

function collectFromDir(dir: string, recursive: boolean): string[] {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    process.stderr.write(`  ⚠  Cannot read directory (permission denied): ${dir}\n`);
    return [];
  }

  const dirs: string[] = [];
  const imgs: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) imgs.push(fullPath);
    } else if (entry.isDirectory() && recursive && !SKIP_DIRS.has(entry.name)) {
      dirs.push(fullPath);
    }
  }

  imgs.sort((a, b) => a.localeCompare(b));

  const result = [...imgs];
  for (const d of dirs.sort((a, b) => a.localeCompare(b))) {
    result.push(...collectFromDir(d, true));
  }

  return result;
}
