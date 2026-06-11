import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { ConversionOutcome, ConvertOptions, Summary } from "./types.js";

export async function convertImage(
  inputFile: string,
  opts: ConvertOptions,
): Promise<ConversionOutcome> {
  const dir = opts.output ?? path.dirname(inputFile);
  const baseName = path.basename(inputFile, path.extname(inputFile));
  const outFile = path.join(dir, `${baseName}${opts.suffix}.webp`);

  if (!fs.existsSync(dir)) {
    await fsPromises.mkdir(dir, { recursive: true });
  }

  if (!opts.force && fs.existsSync(outFile)) {
    return { status: "skipped", input: inputFile, output: outFile };
  }

  let before: number;
  try {
    const beforeStat = await fsPromises.stat(inputFile);
    before = beforeStat.size;
  } catch (err) {
    return { status: "failed", input: inputFile, error: err as Error };
  }

  const webpOpts = opts.lossless ? { lossless: true } : { quality: opts.quality, effort: 6 };

  try {
    await sharp(inputFile).webp(webpOpts).toFile(outFile);
  } catch (err) {
    return { status: "failed", input: inputFile, error: err as Error };
  }

  const afterStat = await fsPromises.stat(outFile);
  const after = afterStat.size;

  let originalDeleted = false;
  if (opts.deleteOriginals && path.resolve(inputFile) !== path.resolve(outFile)) {
    await fsPromises.unlink(inputFile);
    originalDeleted = true;
  }

  return { status: "converted", input: inputFile, output: outFile, before, after, originalDeleted };
}

export async function convertAll(
  files: string[],
  opts: ConvertOptions,
  onProgress?: (current: number, total: number, outcome: ConversionOutcome) => void,
): Promise<Summary> {
  const summary: Summary = { converted: 0, skipped: 0, failed: 0, totalBefore: 0, totalAfter: 0 };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    const outcome = await convertImage(file, opts);

    onProgress?.(i + 1, files.length, outcome);

    if (outcome.status === "converted") {
      summary.converted++;
      summary.totalBefore += outcome.before;
      summary.totalAfter += outcome.after;
    } else if (outcome.status === "skipped") {
      summary.skipped++;
    } else {
      summary.failed++;
    }
  }

  return summary;
}
