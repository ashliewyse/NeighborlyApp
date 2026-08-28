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
  'className="min-h-32 shrink-0 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"',
  "ad card container",
);

replaceOnce(
  'className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"',
  'className="group block h-auto max-h-none w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"',
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

// Keep the original Neighborly artwork exactly as designed. Only cover the original
// "Neighborly App" title line and redraw "Neighborly" centered in the same area.
const legacyBrandCardPattern = /<div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-center">\s*<img src=\{neighborlyAppLogo\} alt="Neighborly App" className="w-full h-auto object-contain" \/>\s*<\/div>/g;
const legacyBrandCardCount = (source.match(legacyBrandCardPattern) || []).length;
const neighborlyBrandCard = `<div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-center">
  <div className="relative w-full">
    <img src={neighborlyAppLogo} alt="Neighborly" className="w-full h-auto object-contain" />
    <div aria-hidden="true" className="pointer-events-none absolute left-[18%] right-[18%] top-[55%] h-[15%] bg-white flex items-center justify-center">
      <span className="font-['Playfair_Display',serif] text-[clamp(1rem,2vw,1.5rem)] font-normal text-slate-800">Neighborly</span>
    </div>
  </div>
</div>`;

if (legacyBrandCardCount > 0) {
  source = source.replace(legacyBrandCardPattern, neighborlyBrandCard);
  changed = true;
} else if (!source.includes('alt="Neighborly" className="w-full h-auto object-contain"')) {
  throw new Error("Neighborly branding patch failed: could not find the original sidebar logo card.");
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied original Neighborly artwork with only the App label removed, plus full-height ad layout without overlap.");
} else {
  console.log("Neighborly branding and ad layout are already up to date.");
}
