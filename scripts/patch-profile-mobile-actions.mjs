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

fs.writeFileSync(appPath, source);
console.log("Applied responsive wrapping to user-profile action buttons.");
