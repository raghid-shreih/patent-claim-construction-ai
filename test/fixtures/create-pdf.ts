import { writeFile } from "node:fs/promises";

/** Tiny generated fixture: fictional text plus a vector drawing, never a real patent. */
const objects: string[] = [];
function addObject(content: string): number { objects.push(content); return objects.length; }
addObject("<< /Type /Catalog /Pages 2 0 R >>");
addObject("<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>");
addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>");
addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>");
addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
function textLines(lines: string[]): string {
  return `BT /F1 12 Tf 48 740 Td 18 TL ${lines.map((line, index) =>
    `${index ? "T* " : ""}(${line.replace(/[()\\]/g, character => "\\" + character)}) Tj`,
  ).join("\n")} ET`;
}
const firstPage = textLines([
  "FICTIONAL EDUCATIONAL SAMPLE - NOT A REAL PATENT",
  "DESCRIPTION",
  "",
  "[0001] A coupling is a detachable connector between the",
  "housing and the sensor.",
  "",
  "[0002] The housing surrounds the sensor. Figure 1 depicts",
  "a housing, a sensor and their coupling in an example apparatus.",
  "",
  "CLAIMS",
  "1. An apparatus comprising a housing, a sensor, and a coupling",
  "connecting the housing to the sensor.",
  "2. The apparatus of claim 1, wherein the coupling is detachable.",
]);
const secondPage = textLines([
  "FICTIONAL EDUCATIONAL SAMPLE - DRAWING PAGE",
  "Figure 1: Example apparatus",
  "The drawing is illustrative, not a mandatory claim limitation.",
]) + "\n0.8 w 100 350 350 200 re S 220 420 100 60 re S 0 0 0 RG 150 450 m 220 450 l S\n" +
  "BT /F1 12 Tf 110 560 Td (Housing) Tj 125 -60 Td (Sensor) Tj -120 -30 Td (Coupling) Tj ET";
for (const content of [firstPage, secondPage]) addObject(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
let output = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((content, index) => {
  offsets.push(Buffer.byteLength(output));
  output += `${index + 1} 0 obj\n${content}\nendobj\n`;
});
const xrefOffset = Buffer.byteLength(output);
output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
output += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
await writeFile(process.argv[2] || "/tmp/claim-fixture.pdf", output);
