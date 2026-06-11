import type { ConvertOptions } from "./types.js";

export const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".tiff",
  ".tif",
  ".avif",
  ".bmp",
]);

export const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  "dist",
  "build",
  ".next",
  "__pycache__",
]);

export const DEFAULT_OPTIONS: ConvertOptions = {
  quality: 90,
  lossless: false,
  suffix: "",
  recursive: false,
  deleteOriginals: false,
  force: false,
};
