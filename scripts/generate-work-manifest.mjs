import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const workDir = path.join(rootDir, "selected-work");
const manifestPath = path.join(workDir, "manifest.json");
const manifestJsPath = path.join(workDir, "manifest.js");

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".svg"]);

function formatTitle(name) {
  return name
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function readExistingManifest() {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Map();
    }

    return new Map(parsed.map((item) => [item.src, item]));
  } catch {
    return new Map();
  }
}

async function main() {
  const entries = await fs.readdir(workDir, { withFileTypes: true });
  const existingItems = await readExistingManifest();

  const items = entries
    .filter((entry) => entry.isFile())
    .filter((entry) => allowedExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((entry) => {
      const baseName = path.basename(entry.name, path.extname(entry.name));
      const title = formatTitle(baseName);
      const src = `./selected-work/${entry.name}`;
      const existingItem = existingItems.get(src);
      const label = existingItem?.label || title;
      const slides = existingItem?.slides || [src];
      const url = existingItem?.url || "";

      return {
        src,
        slides,
        label,
        title,
        alt: title,
        url,
      };
    });

  await fs.writeFile(manifestPath, `${JSON.stringify(items, null, 2)}\n`);
  await fs.writeFile(manifestJsPath, `window.SELECTED_WORK = ${JSON.stringify(items, null, 2)};\n`);

  console.log(
    `Generated ${path.relative(rootDir, manifestPath)} and ${path.relative(rootDir, manifestJsPath)} with ${items.length} item(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
