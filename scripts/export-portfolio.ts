/**
 * Export only the public demo, never the parent workspace or its Git history.
 * Usage: pnpm exec tsx scripts/export-portfolio.ts /absolute/path/to/empty-folder
 */
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = fileURLToPath(new URL("..", import.meta.url));
const destinationArgument = process.argv[2];
if (!destinationArgument) throw new Error("Supply an empty export folder outside the source directory.");
const destinationDirectory = path.resolve(destinationArgument);
if (
  destinationDirectory === sourceDirectory ||
  destinationDirectory.startsWith(sourceDirectory + path.sep) ||
  sourceDirectory.startsWith(destinationDirectory + path.sep)
) {
  throw new Error("The export folder must be separate from the source and its ancestors.");
}

const rootFiles = [
  ".env.example", ".gitignore", "LICENSE", "README.md",
  "package.json", "pnpm-lock.yaml", "tsconfig.json",
];
const allowedDirectories = ["src", "standalone", "test", "scripts", "brand-assets", "docs/illustrations"];
const walkthroughImages = [
  "docs/claim-constructor-desktop.jpg",
  "docs/claim-reading-example.jpg",
  "docs/evidence-inspection-example.jpg",
];
const blockedDirectoryNames = new Set([".git", "node_modules", "dist", "dist-web", "coverage", "uploads"]);
const textExtensions = new Set([".ts", ".tsx", ".json", ".md", ".html", ".css", ".svg", ".yaml"]);

async function listSafeFiles(relativeDirectory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(path.join(sourceDirectory, relativeDirectory), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in a portfolio export: ${entry.name}`);
    if (blockedDirectoryNames.has(entry.name)) continue;
    if (entry.name.startsWith(".env") || /\.(pem|key|p12|sqlite|tsbuildinfo)$/i.test(entry.name)) {
      throw new Error(`Unexpected private or generated file in the demo: ${entry.name}`);
    }
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await listSafeFiles(relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

const filePaths = [
  ...rootFiles,
  ...walkthroughImages,
  ...(await Promise.all(allowedDirectories.map(listSafeFiles))).flat(),
].sort();

// Scan the complete candidate set before copying anything.
for (const relativePath of filePaths) {
  const sourcePath = path.join(sourceDirectory, relativePath);
  if (!(await lstat(sourcePath)).isFile()) throw new Error(`Not a regular file: ${relativePath}`);
  if (!textExtensions.has(path.extname(relativePath)) && relativePath !== ".env.example") continue;
  const content = await readFile(sourcePath, "utf8");
  const looksLikeRealCredential =
    /sk-[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content);
  if (looksLikeRealCredential) throw new Error(`Potential credential found; review ${relativePath} before exporting.`);
  if (relativePath.endsWith(".ts") || relativePath.endsWith(".tsx")) {
    const importsPrivateWorkspaceCode = /(?:from\s+|import\s*)["'](?:@workspace\/|[^"']*artifacts\/)/.test(content);
    if (importsPrivateWorkspaceCode) throw new Error(`Private workspace import found in ${relativePath}.`);
  }
}

await mkdir(destinationDirectory, { recursive: true });
if ((await readdir(destinationDirectory)).length > 0) {
  throw new Error("The export folder is not empty. Nothing will be overwritten.");
}

const manifest = [];
for (const relativePath of filePaths) {
  const sourcePath = path.join(sourceDirectory, relativePath);
  const bytes = await readFile(sourcePath);
  const destinationPath = path.join(destinationDirectory, relativePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
  manifest.push({
    path: relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    gitBlobSha: createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"),
  });
}

// Outside the export: this is publication evidence, not part of the public repo.
const manifestPath = destinationDirectory + ".manifest.json";
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Exported ${manifest.length} demo-only files. No parent files or Git history were copied.`);
console.log(`Integrity manifest: ${manifestPath}`);
