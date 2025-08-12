import { glob } from "glob";
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

const ROOT = process.cwd();

const GALLERY_DIR = path.join(ROOT, "property-images");
const DOCS_DIR = path.join(ROOT, "property-docs");

const OUT_GALLERY = path.join(ROOT, "gallery.json");
const OUT_DOCS = path.join(ROOT, "docs.json");

function toWebPath(abs) {
  return abs.replace(ROOT + path.sep, "").replaceAll(path.sep, "/");
}
function titleFromFilename(p) {
  const base = path.basename(p).replace(/\.[^.]+$/, "");
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

async function buildGallery() {
  const files = await glob("**/*.{jpg,jpeg,png,webp}", {
    cwd: GALLERY_DIR,
    nocase: true,
  });
  const items = files.sort().map((rel) => {
    const web = "property-images/" + rel.replaceAll(path.sep, "/");
    return { src: web, alt: titleFromFilename(rel) };
  });
  fs.writeFileSync(OUT_GALLERY, JSON.stringify(items, null, 2));
  console.log(pc.green(`✓ gallery.json (${items.length} items)`));
}

async function buildDocs() {
  const files = await glob("**/*.{pdf,jpg,jpeg,png,webp}", {
    cwd: DOCS_DIR,
    nocase: true,
  });
  const items = files.sort().map((rel) => {
    const web = "property-docs/" + rel.replaceAll(path.sep, "/");
    const name = titleFromFilename(rel);
    return { name, src: web };
  });
  fs.writeFileSync(OUT_DOCS, JSON.stringify(items, null, 2));
  console.log(pc.green(`✓ docs.json (${items.length} items)`));
}

async function run() {
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  await buildGallery();
  await buildDocs();
  console.log(pc.cyan("Done. Commit gallery.json and docs.json."));
}

run().catch((e) => {
  console.error(pc.red(e.stack || e));
  process.exit(1);
});
