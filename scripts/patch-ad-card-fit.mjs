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
  'className="relative flex min-h-16 w-full flex-col items-stretch justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-50 to-indigo-100"',
  "ad image wrapper",
);

replaceOnce(
  'className="block h-auto max-h-96 w-full object-contain"',
  'className="block h-auto max-h-none w-full object-contain"',
  "ad image sizing",
);

replaceOnce(
  '<span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Paid Local Feature</span>',
  '<span className="order-first block w-full bg-slate-900 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white">Paid Local Feature</span>',
  "paid feature label",
);

replaceOnce(
  'className="p-4 pb-2"',
  'className="block w-full p-4 pb-3"',
  "ad details block",
);

replaceOnce(
  '<button onClick={onAdvertise} className="mt-2 w-full text-center text-[11px] font-semibold text-blue-600 hover:underline">Promote Your Business</button>',
  '<button type="button" onClick={onAdvertise} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"><Megaphone size={13} /> Advertise With Us</button>',
  "active ad advertise button",
);

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied full-height Neighborly sidebar ad layout with separate paid label and advertise action.");
} else {
  console.log("Neighborly sidebar ad layout already allows full content and advertising access.");
}
