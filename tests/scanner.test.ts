import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findImages } from "../src/scanner.js";
import { CliError } from "../src/types.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
});

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

async function touch(p: string): Promise<void> {
  await fs.promises.writeFile(p, "");
}

describe("findImages", () => {
  it("throws CliError for missing path", () => {
    expect(() => findImages("/no/such/path", false)).toThrowError(CliError);
  });

  it("throws CliError for unsupported extension", async () => {
    const f = path.join(tmpDir, "doc.pdf");
    await touch(f);
    expect(() => findImages(f, false)).toThrowError(CliError);
  });

  it("returns single file for supported extension", async () => {
    const f = path.join(tmpDir, "img.jpg");
    await touch(f);
    expect(findImages(f, false)).toEqual([f]);
  });

  it("finds images in a directory (non-recursive)", async () => {
    await touch(path.join(tmpDir, "a.png"));
    await touch(path.join(tmpDir, "b.jpeg"));
    await touch(path.join(tmpDir, "ignore.txt"));

    const sub = path.join(tmpDir, "sub");
    await fs.promises.mkdir(sub);
    await touch(path.join(sub, "c.png"));

    const result = findImages(tmpDir, false);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.endsWith(".png") || f.endsWith(".jpeg"))).toBe(true);
  });

  it("finds images recursively", async () => {
    await touch(path.join(tmpDir, "a.png"));

    const sub = path.join(tmpDir, "sub");
    await fs.promises.mkdir(sub);
    await touch(path.join(sub, "b.gif"));

    const result = findImages(tmpDir, true);
    expect(result).toHaveLength(2);
  });

  it("skips node_modules", async () => {
    await touch(path.join(tmpDir, "a.png"));

    const nm = path.join(tmpDir, "node_modules");
    await fs.promises.mkdir(nm);
    await touch(path.join(nm, "b.png"));

    const result = findImages(tmpDir, true);
    expect(result).toHaveLength(1);
  });

  it("skips hidden files", async () => {
    await touch(path.join(tmpDir, ".hidden.png"));
    await touch(path.join(tmpDir, "visible.png"));

    const result = findImages(tmpDir, false);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("visible.png");
  });
});
