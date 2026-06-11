# webp-cli-convert

[![npm version](https://img.shields.io/npm/v/webp-cli-convert.svg)](https://www.npmjs.com/package/webp-cli-convert)
[![CI](https://github.com/username/webp-cli-convert/actions/workflows/ci.yml/badge.svg)](https://github.com/username/webp-cli-convert/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Zero-fuss CLI to convert images to WebP. Features an interactive folder browser with an options wizard, or direct conversion via flags.

Originals are **kept by default** — use `--delete-originals` to remove them.

## Install

```bash
# Global install
npm install -g webp-cli-convert

# Or run without installing
npx webp-cli-convert
```

## Usage

### Interactive mode

Run without arguments to open the folder browser and options wizard:

```
webp-cli-convert
```

The interactive mode lets you:
1. Browse your filesystem with arrow keys
2. Select a folder or individual image
3. Configure quality, lossless mode, originals, recursive, and output directory
4. Review a confirmation summary before converting

### Direct conversion

```bash
# Convert a single file
webp-cli-convert photo.jpg

# Convert all images in a folder
webp-cli-convert ./images

# Adjust quality
webp-cli-convert -q 85 ./images

# Custom output directory
webp-cli-convert -o ./dist/img ./src/assets

# Lossless (larger file, zero quality loss)
webp-cli-convert --lossless logo.png

# Recursive + delete originals
webp-cli-convert -r --delete-originals ./src/assets
```

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--quality <n>` | `-q` | `90` | WebP quality, integer 1–100 |
| `--output <dir>` | `-o` | source dir | Output folder |
| `--suffix <text>` | `-s` | `""` | Suffix added to output filename |
| `--recursive` | `-r` | `false` | Process subfolders |
| `--delete-originals` | | `false` | Delete source files after conversion |
| `--lossless` | | `false` | Lossless compression (overrides `--quality`) |
| `--force` | `-f` | `false` | Reconvert even if `.webp` already exists |
| `--help` | `-h` | | Show help |

## Supported formats

JPG · JPEG · PNG · GIF · TIFF · TIF · AVIF · BMP

## Migrating from v1

v2 introduces two breaking changes:

- **Originals are kept by default.** In v1 originals were always deleted. To restore the old behavior use `--delete-originals`.
- **Node.js ≥ 20.3.0** is required (v1 required ≥ 18).

The deprecated `-k / --keep-original` flag is still accepted but prints a warning and does nothing (originals are already kept).

## Requirements

- Node.js ≥ 20.3.0
- [`sharp`](https://sharp.pixelplumbing.com/) is the only runtime dependency

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
