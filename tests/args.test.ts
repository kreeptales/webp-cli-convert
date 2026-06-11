import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parseCliArgs } from "../src/args.js";
import { CliError } from "../src/types.js";

describe("parseCliArgs", () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns defaults with no args and no input", () => {
    const result = parseCliArgs([]);
    expect(result.help).toBe(false);
    expect(result.input).toBeUndefined();
    expect(result.options.quality).toBe(90);
    expect(result.options.lossless).toBe(false);
    expect(result.options.deleteOriginals).toBe(false);
    expect(result.options.recursive).toBe(false);
    expect(result.options.force).toBe(false);
  });

  it("parses positional input path", () => {
    const r = parseCliArgs(["./images"]);
    expect(r.input).toBe("./images");
  });

  it("parses --quality / -q", () => {
    expect(parseCliArgs(["-q", "75"]).options.quality).toBe(75);
    expect(parseCliArgs(["--quality", "50"]).options.quality).toBe(50);
  });

  it("parses --lossless", () => {
    expect(parseCliArgs(["--lossless"]).options.lossless).toBe(true);
  });

  it("parses --recursive / -r", () => {
    expect(parseCliArgs(["-r"]).options.recursive).toBe(true);
    expect(parseCliArgs(["--recursive"]).options.recursive).toBe(true);
  });

  it("parses --delete-originals", () => {
    expect(parseCliArgs(["--delete-originals"]).options.deleteOriginals).toBe(true);
  });

  it("parses --force / -f", () => {
    expect(parseCliArgs(["-f"]).options.force).toBe(true);
    expect(parseCliArgs(["--force"]).options.force).toBe(true);
  });

  it("parses --suffix / -s", () => {
    expect(parseCliArgs(["-s", "_converted"]).options.suffix).toBe("_converted");
  });

  it("returns help:true for -h / --help", () => {
    expect(parseCliArgs(["-h"]).help).toBe(true);
    expect(parseCliArgs(["--help"]).help).toBe(true);
  });

  it("accepts -k/--keep-original as no-op (deprecated)", () => {
    const r = parseCliArgs(["-k"]);
    expect(r.options.deleteOriginals).toBe(false);
    expect(process.stderr.write).toHaveBeenCalled();
  });

  it("throws CliError(exitCode=2) for quality 0", () => {
    expect(() => parseCliArgs(["-q", "0"])).toThrowError(CliError);
    expect(() => parseCliArgs(["-q", "0"])).toThrow(/invalid quality/i);
  });

  it("throws CliError(exitCode=2) for quality 101", () => {
    expect(() => parseCliArgs(["-q", "101"])).toThrowError(CliError);
  });

  it("throws CliError(exitCode=2) for non-numeric quality", () => {
    expect(() => parseCliArgs(["-q", "abc"])).toThrowError(CliError);
  });

  it("throws CliError(exitCode=2) for float quality", () => {
    expect(() => parseCliArgs(["-q", "85.5"])).toThrowError(CliError);
  });

  it("throws CliError(exitCode=2) for unknown flag", () => {
    expect(() => parseCliArgs(["--bogus"])).toThrowError(CliError);
  });

  it("throws CliError(exitCode=2) for multiple positionals", () => {
    expect(() => parseCliArgs(["path1", "path2"])).toThrowError(CliError);
  });
});
