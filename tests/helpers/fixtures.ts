import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

export interface Fixture {
  dir: string;
  png: string;
  jpeg: string;
}

export async function createFixtures(): Promise<Fixture> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "webp-test-"));

  const png = path.join(dir, "test.png");
  const jpeg = path.join(dir, "test.jpg");

  // 4x4 red pixels
  await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toFile(png);

  await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .jpeg()
    .toFile(jpeg);

  return { dir, png, jpeg };
}

export async function cleanFixtures(dir: string): Promise<void> {
  // On Windows, sharp/libvips keeps file handles open briefly after a toFile()
  // resolves. Retry with backoff to let Windows release the locks.
  const MAX_ATTEMPTS = 6;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if ((code === "EPERM" || code === "EBUSY") && i < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 100 * (i + 1)));
        continue;
      }
      // After max attempts or non-locking error — don't fail the test suite
      return;
    }
  }
}
