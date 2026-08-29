import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Neighborly recent activity patch failed: could not find ${label}.`);
  source = source.replace(needle, replacement);
  changed = true;
}

replaceOnce(
  '{profile.recentActivity.map((a, i) => {',
  '{[...(profile.badges.includes("newcomer") ? [{ type: "badge", text: "Earned the New Neighbor badge", time: profile.joinDate }] : []), ...profile.recentActivity.filter((activity) => activity.type !== "post")].slice(0, 5).map((a, i) => {',
  "recent activity list",
);

replaceOnce(
  'const icons: Record<string, React.ReactNode> = { post: <Megaphone size={11} />, comment: <MessageCircle size={11} />, rec: <Star size={11} />, event: <CalendarDays size={11} /> };',
  'const icons: Record<string, React.ReactNode> = { comment: <MessageCircle size={11} />, rec: <Star size={11} />, event: <CalendarDays size={11} />, badge: <Leaf size={11} /> };',
  "recent activity icons",
);

replaceOnce(
  'const colors: Record<string, string> = { post: "bg-sky-50 text-sky-700", comment: "bg-stone-50 text-stone-600", rec: "bg-emerald-50 text-emerald-700", event: "bg-violet-50 text-violet-700" };',
  'const colors: Record<string, string> = { comment: "bg-stone-50 text-stone-600", rec: "bg-emerald-50 text-emerald-700", event: "bg-violet-50 text-violet-700", badge: "bg-teal-50 text-teal-700" };',
  "recent activity colors",
);

if (!source.includes('No recent public activity yet.')) {
  replaceOnce(
    '<div className="flex flex-col">\n                  {[...(profile.badges.includes("newcomer") ? [{ type: "badge", text: "Earned the New Neighbor badge", time: profile.joinDate }] : []), ...profile.recentActivity.filter((activity) => activity.type !== "post")].slice(0, 5).map((a, i) => {',
    '<div className="flex flex-col">\n                  {!profile.badges.includes("newcomer") && profile.recentActivity.filter((activity) => activity.type !== "post").length === 0 && (\n                    <p className="py-2 text-xs text-muted-foreground">No recent public activity yet.</p>\n                  )}\n                  {[...(profile.badges.includes("newcomer") ? [{ type: "badge", text: "Earned the New Neighbor badge", time: profile.joinDate }] : []), ...profile.recentActivity.filter((activity) => activity.type !== "post")].slice(0, 5).map((a, i) => {',
    "recent activity empty state",
  );
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Kept Recent Activity concise and moved actual posts to the Posts tab only.");
} else {
  console.log("Neighborly recent activity summary already applied.");
}
