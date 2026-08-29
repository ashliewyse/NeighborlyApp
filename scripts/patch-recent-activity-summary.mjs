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

if (!source.includes("profileRecentActivity, setProfileRecentActivity")) {
  const signature = /function UserProfileView\(([\s\S]*?)\) \{\n/;
  const match = source.match(signature);
  if (!match) throw new Error("Neighborly recent activity patch failed: could not find UserProfileView signature.");
  const insertion = `${match[0]}  const [profileRecentActivity, setProfileRecentActivity] = useState<Array<{ type: string; text: string; time: string }>>(\n    profile.recentActivity.filter((activity) => activity.type !== "post").slice(0, 5),\n  );\n\n  useEffect(() => {\n    let active = true;\n    if (!profile.id) {\n      setProfileRecentActivity(profile.recentActivity.filter((activity) => activity.type !== "post").slice(0, 5));\n      return () => { active = false; };\n    }\n\n    void (async () => {\n      const { data, error } = await supabase.rpc("profile_recent_activity", {\n        p_user_id: profile.id,\n        p_limit: 5,\n      });\n      if (!active) return;\n      if (error) {\n        console.error("Could not load profile recent activity", error);\n        setProfileRecentActivity(profile.recentActivity.filter((activity) => activity.type !== "post").slice(0, 5));\n        return;\n      }\n\n      setProfileRecentActivity((data || []).map((activity: any) => ({\n        type: activity.activity_type,\n        text: activity.activity_text,\n        time: activity.activity_at\n          ? new Date(activity.activity_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })\n          : "",\n      })));\n    })();\n\n    return () => { active = false; };\n  }, [profile.id, profile.name]);\n`;
  source = source.replace(match[0], insertion);
  changed = true;
}

replaceOnce(
  '{profile.recentActivity.map((a, i) => {',
  '{[...(profile.badges.includes("newcomer") ? [{ type: "badge", text: "Earned the New Neighbor badge", time: profile.joinDate }] : []), ...profileRecentActivity].slice(0, 5).map((a, i) => {',
  "recent activity list",
);

replaceOnce(
  'const icons: Record<string, React.ReactNode> = { post: <Megaphone size={11} />, comment: <MessageCircle size={11} />, rec: <Star size={11} />, event: <CalendarDays size={11} /> };',
  'const icons: Record<string, React.ReactNode> = { comment: <MessageCircle size={11} />, rec: <Star size={11} />, event: <CalendarDays size={11} />, badge: <Leaf size={11} />, neighbor: <Users size={11} />, review: <Star size={11} /> };',
  "recent activity icons",
);

replaceOnce(
  'const colors: Record<string, string> = { post: "bg-sky-50 text-sky-700", comment: "bg-stone-50 text-stone-600", rec: "bg-emerald-50 text-emerald-700", event: "bg-violet-50 text-violet-700" };',
  'const colors: Record<string, string> = { comment: "bg-stone-50 text-stone-600", rec: "bg-emerald-50 text-emerald-700", event: "bg-violet-50 text-violet-700", badge: "bg-teal-50 text-teal-700", neighbor: "bg-blue-50 text-blue-700", review: "bg-amber-50 text-amber-700" };',
  "recent activity colors",
);

if (!source.includes('No recent public activity yet.')) {
  replaceOnce(
    '<div className="flex flex-col">\n                  {[...(profile.badges.includes("newcomer") ? [{ type: "badge", text: "Earned the New Neighbor badge", time: profile.joinDate }] : []), ...profileRecentActivity].slice(0, 5).map((a, i) => {',
    '<div className="flex flex-col">\n                  {!profile.badges.includes("newcomer") && profileRecentActivity.length === 0 && (\n                    <p className="py-2 text-xs text-muted-foreground">No recent public activity yet.</p>\n                  )}\n                  {[...(profile.badges.includes("newcomer") ? [{ type: "badge", text: "Earned the New Neighbor badge", time: profile.joinDate }] : []), ...profileRecentActivity].slice(0, 5).map((a, i) => {',
    "recent activity empty state",
  );
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Kept Recent Activity concise, loaded public activity, and kept actual posts in the Posts tab only.");
} else {
  console.log("Neighborly recent activity summary already applied.");
}
