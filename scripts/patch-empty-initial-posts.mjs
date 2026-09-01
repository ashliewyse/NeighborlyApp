import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

const emptyMarker = "const INITIAL_POSTS: Post[] = [];";

if (!source.includes(emptyMarker)) {
  const pattern = /const INITIAL_POSTS: Post\[\] = \[[\s\S]*?\n\];\n\nconst EVENTS = /;
  if (!pattern.test(source)) {
    throw new Error("Could not find the hard-coded INITIAL_POSTS demo block.");
  }
  source = source.replace(pattern, `${emptyMarker}\n\nconst EVENTS = `);
  fs.writeFileSync(appPath, source);
}

if (!source.includes(emptyMarker)) {
  throw new Error("Failed to remove hard-coded Neighborly starter posts.");
}

console.log("Removed hard-coded demo starter posts from the Neighborly feed.");
