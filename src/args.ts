import path from "node:path";
import { parseArgs as nodeParseArgs } from "node:util";
import { DEFAULT_OPTIONS } from "./constants.js";
import { CliError } from "./types.js";
import type { ConvertOptions } from "./types.js";

export interface ParsedArgs {
  options: ConvertOptions;
  input: string | undefined;
  help: boolean;
}

const WINDOWS_INVALID_CHARS = /[<>:"|?*]/;

export function parseCliArgs(argv: string[]): ParsedArgs {
  let raw: ReturnType<typeof nodeParseArgs>;

  try {
    raw = nodeParseArgs({
      args: argv,
      strict: true,
      allowPositionals: true,
      options: {
        quality: { type: "string", short: "q" },
        output: { type: "string", short: "o" },
        suffix: { type: "string", short: "s" },
        recursive: { type: "boolean", short: "r" },
        lossless: { type: "boolean" },
        force: { type: "boolean", short: "f" },
        "delete-originals": { type: "boolean" },
        "keep-original": { type: "boolean", short: "k" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    throw new CliError(
      `Unknown option: ${(err as Error).message.replace("Unknown option '", "").replace("'", "")}. Use --help to see available options.`,
      2,
    );
  }

  if (raw.values.help) {
    return { options: { ...DEFAULT_OPTIONS }, input: undefined, help: true };
  }

  if ((raw.values as Record<string, unknown>)["keep-original"]) {
    process.stderr.write(
      "  ⚠  --keep-original / -k is deprecated. Originals are kept by default in v2.\n" +
        "     Use --delete-originals to remove originals after conversion.\n",
    );
  }

  if (raw.positionals.length > 1) {
    throw new CliError(
      `Too many positional arguments. Expected at most one <path>, got: ${raw.positionals.join(", ")}`,
      2,
    );
  }

  const rawValues = raw.values as {
    quality?: string;
    output?: string;
    suffix?: string;
    recursive?: boolean;
    lossless?: boolean;
    force?: boolean;
    "delete-originals"?: boolean;
    "keep-original"?: boolean;
    help?: boolean;
  };

  const options: ConvertOptions = {
    quality: DEFAULT_OPTIONS.quality,
    lossless: rawValues.lossless ?? DEFAULT_OPTIONS.lossless,
    suffix: DEFAULT_OPTIONS.suffix,
    recursive: rawValues.recursive ?? DEFAULT_OPTIONS.recursive,
    deleteOriginals: rawValues["delete-originals"] ?? DEFAULT_OPTIONS.deleteOriginals,
    force: rawValues.force ?? DEFAULT_OPTIONS.force,
  };

  if (rawValues.quality !== undefined) {
    const q = Number(rawValues.quality);
    if (!Number.isInteger(q) || Number.isNaN(q) || q < 1 || q > 100) {
      throw new CliError(
        `Invalid quality value: "${rawValues.quality}". Must be an integer between 1 and 100.`,
        2,
      );
    }
    options.quality = q;
  }

  if (rawValues.output !== undefined) {
    options.output = path.resolve(rawValues.output);
  }

  if (rawValues.suffix !== undefined) {
    const s = rawValues.suffix;
    if (path.sep === "\\" && WINDOWS_INVALID_CHARS.test(s)) {
      throw new CliError(`Invalid suffix "${s}": contains characters not allowed in filenames.`, 2);
    }
    if (s.includes("/") || s.includes("\\")) {
      throw new CliError(`Invalid suffix "${s}": must not contain path separators.`, 2);
    }
    options.suffix = s;
  }

  return {
    options,
    input: raw.positionals[0],
    help: false,
  };
}
