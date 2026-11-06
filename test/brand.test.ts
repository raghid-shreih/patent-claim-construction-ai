import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { NuvoPatentsMark } from "../src/ui/brand";
import { createMarkSvg, MARK_PATHS } from "../src/ui/brand/mark-geometry";

test("the shared mark is graphic-only and decorative beside the accessible brand name", () => {
  const markup = renderToStaticMarkup(createElement("a", { href: "/" },
    createElement(NuvoPatentsMark, { size: 32, color: "currentColor" }), "NuvoPatents",
  ));
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /focusable="false"/);
  assert.match(markup, /width="32"/);
  assert.match(markup, /fill="currentColor"/);
  assert.equal((markup.match(/NuvoPatents/g) ?? []).length, 1);
  assert.equal((markup.match(/<path /g) ?? []).length, 3);
  assert.doesNotMatch(markup, /<text|<title|<image|<script|foreignObject|xlink:href/);
});

test("standalone exported SVG and inline mark share safe, readable geometry", async () => {
  const exported = await readFile(new URL("../standalone/public/logo.svg", import.meta.url), "utf8");
  assert.equal(exported, createMarkSvg());
  for (const path of MARK_PATHS) assert.ok(exported.includes(path.outline));
  assert.doesNotMatch(exported, /<text|<image|<script|foreignObject|style=|<filter|href=/);
  for (const name of ["nuvo-mark.svg", "nuvo-mark-white.svg", "nuvo-mark-ink.svg"]) {
    const source = await readFile(new URL(`../brand-assets/${name}`, import.meta.url), "utf8");
    assert.equal((source.match(/<path /g) ?? []).length, 3);
    assert.doesNotMatch(source, /<text|<image|<script|foreignObject|href=/);
  }
});

test("native favicon sizes contain both a visible white glyph and a blue background", async () => {
  for (const size of [16, 32]) {
    const file = new URL(`../standalone/public/favicon-${size}x${size}.png`, import.meta.url);
    const { data, info } = await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, size);
    assert.equal(info.height, size);
    let whitePixels = 0;
    let bluePixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 240 && data[index + 1] > 240 && data[index + 2] > 240 && data[index + 3] > 240) whitePixels++;
      if (data[index] < 60 && data[index + 1] > 70 && data[index + 2] > 200 && data[index + 3] > 240) bluePixels++;
    }
    assert.ok(whitePixels > 10, `The ${size}px glyph must survive rasterization`);
    assert.ok(bluePixels > 10, `The ${size}px icon must retain its background`);
  }
  const ico = await readFile(new URL("../standalone/public/favicon.ico", import.meta.url));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48]);
});

test("standalone favicon metadata stays base-path relative and includes a touch icon", async () => {
  const html = await readFile(new URL("../standalone/index.html", import.meta.url), "utf8");
  assert.match(html, /href="%BASE_URL%favicon\.svg/);
  assert.match(html, /sizes="32x32"/);
  assert.match(html, /sizes="16x16"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.doesNotMatch(html, /href="\/favicon|nuvopatents\.com\/.*(?:favicon|logo)/);
});
