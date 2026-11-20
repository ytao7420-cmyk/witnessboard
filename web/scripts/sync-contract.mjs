import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(webRoot, "..", "deploy", "MilestoneWitness.py");
const target = join(webRoot, "public", "MilestoneWitness.py");
copyFileSync(source, target);
console.log("copied deploy/MilestoneWitness.py to web/public/MilestoneWitness.py");
