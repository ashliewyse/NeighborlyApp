import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

const legacy = '<div className="flex items-center gap-2 mt-12 flex-shrink-0 relative">';
const responsive = '<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 mt-12 relative pl-2">';

if (!source.includes(responsive)) {
  if (!source.includes(legacy)) {
    throw new Error("Could not find the user-profile action button row.");
  }
  source = source.replace(legacy, responsive);
}

// The business color button is leftmost on phones. Anchor its wider menu to
// that left edge below sm, while preserving the existing desktop alignment.
const businessMenu = '<div role="menu" className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-white shadow-xl">';
const responsiveBusinessMenu = '<div role="menu" className="absolute left-0 right-auto sm:left-auto sm:right-0 top-full z-50 mt-1 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-white shadow-xl">';

const alreadyDarkModeAwareMenu = source.includes('role="menu" className={`absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border shadow-xl ${isMidnightDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-border bg-white text-foreground"}`}');

if (!source.includes(responsiveBusinessMenu) && !alreadyDarkModeAwareMenu) {
  if (source.split(businessMenu).length !== 2) {
    throw new Error("Could not uniquely identify the business-profile color menu.");
  }
  source = source.replace(businessMenu, responsiveBusinessMenu);
}

fs.writeFileSync(appPath, source);
console.log("Applied responsive profile actions and mobile business color-menu alignment.");
