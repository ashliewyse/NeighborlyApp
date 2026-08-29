import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Neighborly profile badge/rank patch failed: could not find ${label}.`);
  source = source.replace(needle, replacement);
  changed = true;
}

if (!source.includes("function isNewNeighbor(createdAt")) {
  replaceOnce(
`// ─── Data ─────────────────────────────────────────────────────────────────────`,
`function isNewNeighbor(createdAt?: string | null) {
  if (!createdAt) return false;
  const joined = new Date(createdAt);
  if (Number.isNaN(joined.getTime())) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return joined >= sixMonthsAgo;
}

function neighborhoodRankScore(profile: UserProfile) {
  return Math.min(
    100,
    Math.max(
      0,
      profile.posts * 5 +
      profile.neighbors * 2 +
      profile.helpfulVotes +
      profile.recsGiven * 3,
    ),
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────`,
    "profile badge/rank helpers",
  );
}

replaceOnce(
  '      badges: ["newcomer"],',
  '      badges: isNewNeighbor(created.toISOString()) ? ["newcomer"] : [],',
  "current member new-neighbor badge",
);

if (source.includes('      badges: [],\n      posts: postCount || 0,')) {
  source = source.replaceAll(
    '      badges: [],\n      posts: postCount || 0,',
    '      badges: isNewNeighbor(row.created_at) ? ["newcomer"] : [],\n      posts: postCount || 0,',
  );
  changed = true;
} else if (!source.includes('      badges: isNewNeighbor(row.created_at) ? ["newcomer"] : [],\n      posts: postCount || 0,')) {
  throw new Error("Neighborly profile badge/rank patch failed: could not find viewed member badge mapping.");
}

replaceOnce(
`                <p className={\`font-['Playfair_Display',serif] font-bold text-2xl \${T.accent}\`}>Top 5%</p>
                <p className="text-xs text-muted-foreground mt-0.5">contributor in {profile.neighborhood}</p>
                <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={\`h-full \${T.bar} rounded-full\`} style={{ width: "95%" }} />
                </div>`,
`                <p className={\`font-['Playfair_Display',serif] font-bold text-2xl \${T.accent}\`}>{neighborhoodRankScore(profile)} / 100</p>
                <p className="text-xs text-muted-foreground mt-0.5">community contribution score in {profile.neighborhood}</p>
                <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={\`h-full \${T.bar} rounded-full\`} style={{ width: \`\${neighborhoodRankScore(profile)}%\` }} />
                </div>`,
  "zero-based neighborhood rank",
);

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied automatic New Neighbor badges and zero-based neighborhood rank.");
} else {
  console.log("Neighborly profile badge/rank enhancements already applied.");
}
