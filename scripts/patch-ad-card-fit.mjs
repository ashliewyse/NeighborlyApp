import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, "../src/app/App.tsx");
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) {
    throw new Error(`Neighborly ad patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

replaceOnce(
  'className="min-h-32 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"',
  'className="min-h-32 rounded-xl border border-blue-200 bg-white shadow-sm"',
  "ad card container",
);

replaceOnce(
  'className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"',
  'className="group block h-auto max-h-none w-full overflow-visible text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"',
  "ad card button",
);

replaceOnce(
  'className="relative flex min-h-16 w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"',
  'className="relative flex min-h-16 w-full items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-50 to-indigo-100"',
  "ad image wrapper",
);

replaceOnce(
  'className="block h-auto max-h-96 w-full object-contain"',
  'className="block h-auto max-h-none w-full object-contain"',
  "ad image sizing",
);

replaceOnce(
  'className="p-4 pb-2"',
  'className="block w-full p-4 pb-3"',
  "ad details block",
);

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied full-height Neighborly sidebar ad layout.");
} else {
  console.log("Neighborly sidebar ad layout already allows full content.");
}
