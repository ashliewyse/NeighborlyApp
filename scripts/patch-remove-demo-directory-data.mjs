import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

const businessStart = source.indexOf("const BUSINESSES: Business[] = [");
const profilesStart = source.indexOf("const USER_PROFILES: Record<string, UserProfile> = {", businessStart);
const avatarStart = source.indexOf("const AVATAR_COLORS = [", profilesStart);

if (businessStart < 0 || profilesStart < 0 || avatarStart < 0) {
  throw new Error("Demo directory cleanup failed: expected data blocks were not found.");
}

source =
  source.slice(0, businessStart) +
  "const BUSINESSES: Business[] = [];\n\n" +
  "const USER_PROFILES: Record<string, UserProfile> = {};\n\n" +
  source.slice(avatarStart);

const forbidden = [
  'name: "Martinez Plumbing"',
  'name: "Corner Market Deli"',
  '"Maria Santos": {',
  '"James Whitfield": {',
  '"Nadia Petrov": {',
  '"Grace Okonkwo": {',
];
for (const marker of forbidden) {
  if (source.includes(marker)) throw new Error(`Demo directory cleanup verification failed: ${marker}`);
}

if (!source.includes("const BUSINESSES: Business[] = [];") || !source.includes("const USER_PROFILES: Record<string, UserProfile> = {};")) {
  throw new Error("Demo directory cleanup verification failed: empty directory data markers are missing.");
}

fs.writeFileSync(appPath, source);
console.log("Removed remaining hard-coded fake business and member directory data.");
