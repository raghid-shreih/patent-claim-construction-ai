import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BRAND_BLUE, BRAND_INK, MARK_PATHS, createMarkSvg } from "../src/ui/brand/mark-geometry";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const exportDirectory = path.join(packageDirectory, "brand-assets");
const standalonePublicDirectory = path.join(packageDirectory, "standalone/public");
const publicDirectories = [standalonePublicDirectory];
if (process.argv.includes("--platform")) {
  publicDirectories.push(path.resolve(packageDirectory, "../../artifacts/nuvopatents/public"));
}

const blueMarkSvg = createMarkSvg(BRAND_BLUE);
const whiteMarkSvg = createMarkSvg("#ffffff");
const inkMarkSvg = createMarkSvg(BRAND_INK);
const browserIconSvg = createMarkSvg("#ffffff", BRAND_BLUE);

/** Modern ICO containers can hold PNG images at several native browser sizes. */
function createWindowsIcon(images: Array<{ size: number; bytes: Buffer }>): Buffer {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let imageOffset = header.length;
  images.forEach((image, index) => {
    const entryOffset = 6 + index * 16;
    header[entryOffset] = image.size;
    header[entryOffset + 1] = image.size;
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.bytes.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += image.bytes.length;
  });
  return Buffer.concat([header, ...images.map(image => image.bytes)]);
}

const iconSizes = [16, 32, 48, 180, 192, 512];
const iconImages = await Promise.all(iconSizes.map(async size => ({
  size,
  // Touch icons use a full-bleed background; the device supplies its own corner mask.
  bytes: await sharp(Buffer.from(size === 180 ? browserIconSvg.replace('rx="12"', 'rx="0"') : browserIconSvg))
    .resize(size, size).png().toBuffer(),
})));
const windowsIcon = createWindowsIcon(iconImages.filter(image => [16, 32, 48].includes(image.size)));

await mkdir(exportDirectory, { recursive: true });
const exports = [
  ["nuvo-mark.svg", blueMarkSvg],
  ["nuvo-mark-white.svg", whiteMarkSvg],
  ["nuvo-mark-ink.svg", inkMarkSvg],
  ["nuvo-icon.svg", browserIconSvg],
] as const;
await Promise.all(exports.map(([name, content]) => writeFile(path.join(exportDirectory, name), content)));
await writeFile(
  path.join(exportDirectory, "nuvo-mark.png"),
  await sharp(Buffer.from(blueMarkSvg)).resize(512, 512).png().toBuffer(),
);
for (const image of iconImages) {
  await writeFile(path.join(exportDirectory, `nuvo-icon-${image.size}.png`), image.bytes);
}
await writeFile(path.join(exportDirectory, "favicon.ico"), windowsIcon);

// A portable presentation sheet, not an image wordmark used by the application.
function previewGlyph(color: string): string {
  return MARK_PATHS.map(mark => `<path d="${mark.outline}" fill="${color}"/>`).join("");
}
const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#f1f5f9"/>
  <g font-family="Inter, DejaVu Sans, sans-serif" fill="${BRAND_INK}">
    <text x="48" y="56" font-size="13" letter-spacing="2" fill="#2563eb">NUVOPATENTS / BRAND MARK</text>
    <text x="48" y="103" font-size="30" font-weight="600">An N, framed by claim brackets.</text>
    <rect x="48" y="140" width="540" height="252" rx="16" fill="white"/>
    <g transform="translate(76 216) scale(1.25)">${previewGlyph(BRAND_BLUE)}</g>
    <text x="176" y="271" font-size="39" font-weight="600">NuvoPatents</text>
    <text x="80" y="357" font-size="13" fill="#64748b">PRIMARY BLUE / WHITE BACKGROUND</text>
    <rect x="612" y="140" width="540" height="252" rx="16" fill="${BRAND_INK}"/>
    <g transform="translate(640 216) scale(1.25)">${previewGlyph("#ffffff")}</g>
    <text x="740" y="271" font-size="39" font-weight="600" fill="white">NuvoPatents</text>
    <text x="644" y="357" font-size="13" fill="#cbd5e1">REVERSED / SLATE BACKGROUND</text>
    <rect x="48" y="416" width="540" height="232" rx="16" fill="white"/>
    <text x="80" y="453" font-size="13" fill="#64748b">GRAPHIC-ONLY VECTORS</text>
    <g transform="translate(80 480) scale(1.4)">${previewGlyph(BRAND_BLUE)}</g>
    <g transform="translate(226 480) scale(1.4)">${previewGlyph(BRAND_INK)}</g>
    <rect x="378" y="484" width="92" height="92" rx="12" fill="${BRAND_INK}"/>
    <g transform="translate(379 485) scale(1.4)">${previewGlyph("#ffffff")}</g>
    <text x="80" y="615" font-size="13" fill="#64748b">BLUE</text>
    <text x="232" y="615" font-size="13" fill="#64748b">INK</text>
    <text x="378" y="615" font-size="13" fill="#64748b">WHITE</text>
    <rect x="612" y="416" width="540" height="232" rx="16" fill="white"/>
    <text x="644" y="453" font-size="13" fill="#64748b">BROWSER ICONS / ACTUAL DISPLAY SIZES</text>
    <g transform="translate(644 509) scale(.25)"><rect width="64" height="64" rx="12" fill="${BRAND_BLUE}"/>${previewGlyph("#ffffff")}</g>
    <g transform="translate(740 501) scale(.5)"><rect width="64" height="64" rx="12" fill="${BRAND_BLUE}"/>${previewGlyph("#ffffff")}</g>
    <g transform="translate(850 493) scale(.75)"><rect width="64" height="64" rx="12" fill="${BRAND_BLUE}"/>${previewGlyph("#ffffff")}</g>
    <text x="644" y="571" font-size="13" fill="#64748b">16 PX</text>
    <text x="740" y="571" font-size="13" fill="#64748b">32 PX</text>
    <text x="850" y="571" font-size="13" fill="#64748b">48 PX</text>
    <text x="644" y="615" font-size="13" fill="#64748b">SVG + PNG + MULTI-SIZE ICO + TOUCH ICON</text>
    <text x="48" y="703" font-size="15" fill="#475569">The name remains selectable HTML text. The mark contains no fonts or lettering.</text>
  </g>
</svg>`;
await writeFile(path.join(exportDirectory, "brand-preview.svg"), previewSvg);
await writeFile(path.join(exportDirectory, "brand-preview.png"), await sharp(Buffer.from(previewSvg)).png().toBuffer());

for (const directory of publicDirectories) {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "logo.svg"), blueMarkSvg),
    writeFile(path.join(directory, "favicon.svg"), browserIconSvg),
    writeFile(path.join(directory, "favicon.ico"), windowsIcon),
    ...iconImages.filter(image => [16, 32].includes(image.size)).map(image =>
      writeFile(path.join(directory, `favicon-${image.size}x${image.size}.png`), image.bytes),
    ),
    writeFile(path.join(directory, "apple-touch-icon.png"), iconImages.find(image => image.size === 180)!.bytes),
  ]);
}
console.log(`Built NuvoPatents vector and icon exports; updated ${publicDirectories.length} public asset directories.`);
