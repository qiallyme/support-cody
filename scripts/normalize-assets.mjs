import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";

const ROOT = process.cwd();
const TARGET_DIRS = ["property-images", "property-docs"].map(p => path.join(ROOT, p));

const DRY = process.argv.includes("--dry-run");

function normalizeName(name) {
  const ext = path.extname(name).toLowerCase();
  let base = path.basename(name, path.extname(name));
  base = base
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) base = "file";
  return base + ext;
}

async function listFilesRecursive(dir) {
  const out = [];
  async function walk(d) {
    const entries = await fsp.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else out.push(full);
    }
  }
  if (!fs.existsSync(dir)) return out;
  await walk(dir);
  return out;
}

async function ensureUnique(target) {
  if (!fs.existsSync(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  let i = 1;
  while (true) {
    const cand = path.join(dir, `${base}-${i}${ext}`);
    if (!fs.existsSync(cand)) return cand;
    i++;
  }
}

// Windows/macOS case-insensitive filesystems hate renaming only by case.
// Do a temp rename hop to force it.
async function safeRename(from, to) {
  if (from === to) return;
  if (DRY) {
    console.log(pc.yellow(`DRY: ${from} -> ${to}`));
    return;
  }
  // If same path differing only by case, hop via temp
  if (from.toLowerCase() === to.toLowerCase() && from !== to) {
    const tmp = await ensureUnique(path.join(path.dirname(from), `.__tmp__${path.basename(from)}`));
    await fsp.rename(from, tmp);
    await fsp.rename(tmp, to);
    return;
  }
  // If target exists, uniquify
  const finalTo = await ensureUnique(to);
  await fsp.rename(from, finalTo);
}

async function normalizeDir(dir) {
  const files = await listFilesRecursive(dir);
  let changed = 0;
  for (const abs of files) {
    const rel = abs.replace(ROOT + path.sep, "");
    const dirn = path.dirname(abs);
    const newName = normalizeName(path.basename(abs));
    const dest = path.join(dirn, newName);
    if (abs !== dest) {
      console.log(pc.cyan(`${rel} -> ${dest.replace(ROOT + path.sep, "")}`));
      await safeRename(abs, dest);
      changed++;
    }
  }
  return changed;
}

async function main() {
  let totalChanges = 0;
  for (const d of TARGET_DIRS) {
    if (!fs.existsSync(d)) {
      console.log(pc.dim(`(skip) ${path.relative(ROOT, d)} does not exist`));
      continue;
    }
    console.log(pc.bold(`Scanning ${path.relative(ROOT, d)}`));
    totalChanges += await normalizeDir(d);
  }
  console.log(pc.green(`Done${DRY ? " (dry run)" : ""}. Changes: ${totalChanges}`));

  if (!DRY && totalChanges >= 0) {
    // Optional: rebuild gallery/docs if script exists
    try {
      const { spawn } = await import("node:child_process");
      await new Promise((resolve, reject) => {
        const p = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build:assets"], {
          stdio: "inherit",
        });
        p.on("exit", code => (code === 0 ? resolve() : reject(new Error(`build:assets exit ${code}`))));
      });
      console.log(pc.green("✓ Rebuilt gallery.json and docs.json"));
    } catch (e) {
      console.log(pc.red("Could not run `npm run build:assets`. Did you add it to package.json?"));
    }
  }
}

main().catch(err => {
  console.error(pc.red(err.stack || String(err)));
  process.exit(1);
});
