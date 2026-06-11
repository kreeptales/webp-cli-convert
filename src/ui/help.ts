import { c } from "./colors.js";
import { banner } from "./components.js";

export function showHelp(): void {
  banner();
  console.log(`
  ${c.bold}USAGE${c.reset}
    ${c.cyan}webp-cli-convert${c.reset}                      Opens the interactive folder browser
    ${c.cyan}webp-cli-convert${c.reset} ${c.dim}[options]${c.reset} ${c.green}<path>${c.reset}     Direct conversion

  ${c.bold}OPTIONS${c.reset}
    ${c.cyan}-q, --quality <n>${c.reset}        WebP quality (1-100, default: ${c.bold}90${c.reset})
    ${c.cyan}-o, --output <dir>${c.reset}       Output folder (default: same as source)
    ${c.cyan}-s, --suffix <text>${c.reset}      Suffix for output filename (default: none)
    ${c.cyan}-r, --recursive${c.reset}          Process subfolders as well
    ${c.cyan}--delete-originals${c.reset}       Delete original files after conversion
    ${c.cyan}--lossless${c.reset}               Force lossless compression (larger file, 0% loss)
    ${c.cyan}-f, --force${c.reset}              Reconvert even if .webp already exists
    ${c.cyan}-h, --help${c.reset}               Show this help

  ${c.bold}EXAMPLES${c.reset}
    ${c.dim}$${c.reset} webp-cli-convert photo.jpg
    ${c.dim}$${c.reset} webp-cli-convert -q 85 ./images
    ${c.dim}$${c.reset} webp-cli-convert -q 95 -o ./webp ./photos
    ${c.dim}$${c.reset} webp-cli-convert --lossless logo.png
    ${c.dim}$${c.reset} webp-cli-convert -r --delete-originals ./src/assets

  ${c.bold}SUPPORTED FORMATS${c.reset}
    ${c.green}JPG${c.reset} · ${c.green}JPEG${c.reset} · ${c.green}PNG${c.reset} · ${c.green}GIF${c.reset} · ${c.green}TIFF${c.reset} · ${c.green}TIF${c.reset} · ${c.green}AVIF${c.reset} · ${c.green}BMP${c.reset}

  ${c.dim}${c.italic}Quality 90 produces files ~30-50% smaller than JPG/PNG with identical visual quality.${c.reset}
  ${c.dim}Originals are ${c.bold}kept by default${c.reset}${c.dim}. Use ${c.cyan}--delete-originals${c.reset}${c.dim} to remove them.${c.reset}
`);
}
