/**
 * Rasterizes the Lucide-style ruler SVG to PNGs for manifest icons.
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "src", "extension", "icons");

/** Lucide `Ruler` paths — guide red strokes on transparent */
const RULER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128">
  <g fill="none" stroke="#ef4444" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>
    <path d="m14.5 12.5 2-2"/>
    <path d="m11.5 9.5 2-2"/>
    <path d="m8.5 6.5 2-2"/>
    <path d="m17.5 15.5 2-2"/>
  </g>
</svg>`;

const sizes = [16, 32, 48, 128];

mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const out = join(outDir, `icon-${size}.png`);
  await sharp(Buffer.from(RULER_SVG))
    .resize(size, size)
    .ensureAlpha()
    .png()
    .toFile(out);
  console.log("wrote", out);
}
