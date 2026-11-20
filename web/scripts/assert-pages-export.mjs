import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const basePath = "/witnessboard";
const pages = [
  "index.html",
  "desk/index.html",
  "desk/campaign/index.html",
  "desk/milestone/index.html",
  "actions/index.html",
  "limits/index.html",
  "prepare/index.html",
];
const localSimulatorAddress = "0x7466a13ff8ae365437dfb20e287e7f46897b453c";

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function assertAsset(page, url) {
  const pathOnly = decodeURIComponent(url.split("?")[0].split("#")[0]);
  if (!pathOnly.startsWith(`${basePath}/`)) {
    throw new Error(`${page} has an asset outside ${basePath}: ${url}`);
  }
  const relative = pathOnly.slice(basePath.length + 1);
  const file = join(outDir, relative);
  if (!existsSync(file)) throw new Error(`${page} references missing file ${url}`);
}

if (!existsSync(join(outDir, ".nojekyll"))) {
  throw new Error("web/out/.nojekyll is missing; GitHub Pages would drop _next");
}

for (const page of pages) {
  const file = join(outDir, page);
  const html = readFileSync(file, "utf8");
  if (!html.includes("见证台") && !html.includes("Witnessboard")) {
    throw new Error(`${page} does not render the app shell`);
  }
  if (!html.includes(`${basePath}/_next/`)) {
    throw new Error(`${page} does not load static assets from ${basePath}/_next/`);
  }
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  const localAssets = refs.filter((ref) => ref.startsWith(`${basePath}/`));
  if (localAssets.length === 0) throw new Error(`${page} has no ${basePath} assets`);
  for (const ref of localAssets) assertAsset(page, ref);
}

const built = walk(outDir);
for (const file of built) {
  if (!/\.(html|js|css|txt)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes(localSimulatorAddress)) {
    throw new Error(`local simulator address was copied into ${file}`);
  }
  if (/NEXT_PUBLIC_CONTRACT_ADDRESS["']?\s*[:=]\s*["']0x[0-9a-fA-F]{40}/.test(text)) {
    throw new Error(`a contract address was baked into ${file}`);
  }
}

const home = readFileSync(join(outDir, "index.html"), "utf8");
const stylesheet = [...home.matchAll(/href="(\/witnessboard\/_next\/static\/[^"]+\.css)"/g)].map((match) => match[1]);
if (stylesheet.length === 0) throw new Error("home page has no CSS asset under /witnessboard/_next/static/");
for (const href of stylesheet) {
  const css = readFileSync(join(outDir, href.slice(basePath.length + 1)), "utf8");
  for (const match of css.matchAll(/url\((?:'|")?(\/witnessboard\/[^)'"]+)/g)) {
    assertAsset("home.css", match[1]);
  }
}

const contractFile = join(outDir, "MilestoneWitness.py");
const contractHash = createHash("sha256").update(readFileSync(contractFile)).digest("hex");
if (contractHash !== "6cc5e74eba8c843870b7e6300b89b946678d747220f40e4caffe0557dd3a7aa9") {
  throw new Error(`MilestoneWitness.py hash ${contractHash} does not match deploy/SHA256SUMS`);
}

console.log(`pages export ok: ${pages.length} routes, ${built.length} files, base ${basePath}, address empty`);
