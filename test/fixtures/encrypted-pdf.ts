import { createHash } from "node:crypto";

// A single blank PDF page using the historical Standard encryption revision 2.
// This is a compatibility fixture, not encryption recommended for real documents.
const passwordPadding = Buffer.from("28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a", "hex");

function padPassword(password: string): Buffer {
  return Buffer.concat([Buffer.from(password, "latin1"), passwordPadding]).subarray(0, 32);
}

function historicalRc4(key: Buffer, plaintext: Buffer): Buffer {
  const permutation = Array.from({ length: 256 }, (_, index) => index);
  let swapIndex = 0;
  for (let index = 0; index < 256; index++) {
    swapIndex = (swapIndex + permutation[index] + key[index % key.length]) % 256;
    [permutation[index], permutation[swapIndex]] = [permutation[swapIndex], permutation[index]];
  }
  let firstIndex = 0;
  let secondIndex = 0;
  return Buffer.from(plaintext.map(value => {
    firstIndex = (firstIndex + 1) % 256;
    secondIndex = (secondIndex + permutation[firstIndex]) % 256;
    [permutation[firstIndex], permutation[secondIndex]] = [permutation[secondIndex], permutation[firstIndex]];
    return value ^ permutation[(permutation[firstIndex] + permutation[secondIndex]) % 256];
  }));
}

export function createPasswordProtectedPdf(password: string): Uint8Array {
  const documentIdentifier = Buffer.alloc(16, 7);
  const ownerKey = createHash("md5").update(padPassword("synthetic-owner-password")).digest().subarray(0, 5);
  const ownerEntry = historicalRc4(ownerKey, padPassword(password));
  const permissions = Buffer.alloc(4);
  permissions.writeInt32LE(-4);
  const fileKey = createHash("md5").update(Buffer.concat([
    padPassword(password), ownerEntry, permissions, documentIdentifier,
  ])).digest().subarray(0, 5);
  const userEntry = historicalRc4(fileKey, passwordPadding);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>",
    `<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${ownerEntry.toString("hex")}> /U <${userEntry.toString("hex")}> /P -4 >>`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const crossReferenceOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 5\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  const identifierHex = documentIdentifier.toString("hex");
  pdf += `trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R /ID [<${identifierHex}><${identifierHex}>] >>\nstartxref\n${crossReferenceOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
