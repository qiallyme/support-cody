import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import pc from 'picocolors';

const ROOT = process.cwd();
const IMAGES_DIR = path.join(ROOT, 'property-images');
const DOCS_DIR = path.join(ROOT, 'property-docs');
const OUTPUT_FILE = path.join(ROOT, 'site-data.json');

function makeRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

async function buildAssets() {
  console.log(pc.cyan('📦 Building asset lists...'));

  const imageFiles = glob.sync(`${IMAGES_DIR}/*.{jpg,jpeg,png,gif,webp}`, {
    nocase: true
  }).map(f => ({
    src: makeRelative(f),
    alt: path.basename(f, path.extname(f)).replace(/[-_]/g, ' ')
  }));

  const docFiles = glob.sync(`${DOCS_DIR}/*.{pdf,doc,docx,txt,md}`, {
    nocase: true
  }).map(f => ({
    name: path.basename(f),
    url: makeRelative(f)
  }));

  const data = {
    gallery: imageFiles,
    docs: docFiles
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(pc.green(`✅ Asset data written to ${OUTPUT_FILE}`));
}

buildAssets().catch(err => {
  console.error(pc.red('❌ Error building assets:'), err);
  process.exit(1);
});
