import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { convertImage } from "../src/converter.js";
import { DEFAULT_OPTIONS } from "../src/constants.js";
import type { ConvertOptions } from "../src/types.js";
import { cleanFixtures, createFixtures, type Fixture } from "./helpers/fixtures.js";

let fixture: Fixture;

beforeEach(async () => {
  fixture = await createFixtures();
});

afterEach(async () => {
  await cleanFixtures(fixture.dir);
});

function opts(overrides: Partial<ConvertOptions> = {}): ConvertOptions {
  return { ...DEFAULT_OPTIONS, ...overrides };
}

describe("convertImage", () => {
  it("converts PNG to webp", async () => {
    const result = await convertImage(fixture.png, opts());
    expect(result.status).toBe("converted");
    if (result.status === "converted") {
      expect(result.output).toMatch(/\.webp$/);
      expect(fs.existsSync(result.output)).toBe(true);
    }
  });

  it("converts JPEG to webp", async () => {
    const result = await convertImage(fixture.jpeg, opts());
    expect(result.status).toBe("converted");
  });

  it("keeps original by default", async () => {
    await convertImage(fixture.png, opts());
    expect(fs.existsSync(fixture.png)).toBe(true);
  });

  it("deletes original when deleteOriginals is true", async () => {
    await convertImage(fixture.png, opts({ deleteOriginals: true }));
    expect(fs.existsSync(fixture.png)).toBe(false);
  });

  it("skips when output already exists and force is false", async () => {
    // First conversion
    await convertImage(fixture.png, opts());
    // Second conversion — should skip
    const result = await convertImage(fixture.png, opts());
    expect(result.status).toBe("skipped");
  });

  it("reconverts when force is true", async () => {
    await convertImage(fixture.png, opts());
    const result = await convertImage(fixture.png, opts({ force: true }));
    expect(result.status).toBe("converted");
  });

  it("applies suffix to output filename", async () => {
    const result = await convertImage(fixture.png, opts({ suffix: "_opt" }));
    expect(result.status).toBe("converted");
    if (result.status === "converted") {
      expect(path.basename(result.output)).toBe("test_opt.webp");
    }
  });

  it("writes to custom output directory", async () => {
    const outDir = path.join(fixture.dir, "out");
    const result = await convertImage(fixture.png, opts({ output: outDir }));
    expect(result.status).toBe("converted");
    if (result.status === "converted") {
      expect(result.output.startsWith(outDir)).toBe(true);
      expect(fs.existsSync(outDir)).toBe(true);
    }
  });

  it("produces a valid webp file (lossless)", async () => {
    const result = await convertImage(fixture.png, opts({ lossless: true }));
    expect(result.status).toBe("converted");
    if (result.status === "converted") {
      const meta = await sharp(result.output).metadata();
      expect(meta.format).toBe("webp");
    }
  });

  it("returns failed status on unreadable input", async () => {
    const result = await convertImage("/nonexistent/file.png", opts());
    expect(result.status).toBe("failed");
  });
});
