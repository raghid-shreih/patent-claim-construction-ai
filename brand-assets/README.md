# NuvoPatents mark

The mark combines two open claim brackets and the diagonal of an **N**. It was refined from a QuiverAI concept onto a 64-unit grid. It is an original project asset, not a trademark-clearance claim.

## Choose the right asset

- `nuvo-mark.svg`: primary blue (`#2563eb`), transparent, editable vector.
- `nuvo-mark-ink.svg`: monochrome slate (`#0f172a`) for light backgrounds and print.
- `nuvo-mark-white.svg`: reversed white for slate or other sufficiently dark backgrounds.
- `nuvo-mark.png`: 512px transparent raster export.
- `nuvo-icon.svg`: white mark on blue for browser tabs.
- `nuvo-icon-16.png`, `nuvo-icon-32.png`, `nuvo-icon-48.png`: native-size browser exports.
- `favicon.ico`: 16px, 32px, and 48px images in one file.
- `nuvo-icon-180.png`: full-bleed touch icon; the device supplies its corner mask.
- `nuvo-icon-192.png`, `nuvo-icon-512.png`: larger icon exports.
- `brand-preview.png` / `.svg`: reference sheet, not an image wordmark for the UI.

Keep **NuvoPatents** as real HTML text next to the graphic. The application's inline mark is decorative (`aria-hidden`) so assistive technology announces the adjacent name only once. If using the mark alone as an interactive control, give the enclosing link or button an accessible name.

Use the square viewBox without stretching or rotating. The built-in margin provides clearspace; leave at least another bracket-stroke's width between the icon and nearby unrelated content. Do not add gradients, shadows, slogans, or text inside the mark. Use the blue/white tile rather than the transparent logo for very small browser icons. Keep blue/ink versions on light backgrounds and the white version on dark backgrounds.

## Regenerate

The human-readable source is `src/ui/brand/mark-geometry.ts`. The React component and export script share this geometry.

```sh
pnpm brand:assets
```

This regenerates this export folder and `standalone/public/`, with no dependency on the private platform. In the full NuvoPatents workspace, `pnpm --filter @workspace/claim-constructor brand:assets --platform` also refreshes the platform's public files.

Favicons in both HTML entry points use Vite's base-path substitution. Keep all icon assets beside the corresponding entry point's public assets; do not point the standalone portfolio demo at the private platform.
