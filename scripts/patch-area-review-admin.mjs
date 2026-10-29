import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Area review admin patch failed: ${label}`);
  source = source.replace(needle, replacement);
}

const memberImport = 'import { AdminMemberManagement } from "@/app/components/AdminMemberManagement";';
const areaImport = 'import { AreaReviewPanel } from "@/app/components/AreaReviewPanel";';
if (!source.includes(areaImport)) {
  if (!source.includes(memberImport)) throw new Error("Area review admin patch failed: AdminMemberManagement import not found.");
  source = source.replace(memberImport, `${memberImport}\n${areaImport}`);
}

const supportTabState = 'const [tab, setTab] = useState<"support" | "members" | "posts" | "safety" | "feedback" | "advertising">("support");';
const supportTabWithAreas = 'const [tab, setTab] = useState<"support" | "members" | "areas" | "posts" | "safety" | "feedback" | "advertising">("support");';
if (source.includes(supportTabState)) source = source.replace(supportTabState, supportTabWithAreas);
else if (!source.includes(supportTabWithAreas)) replaceOnce(
  'const [tab, setTab] = useState<"access" | "members" | "posts" | "safety" | "feedback" | "advertising">("access");',
  'const [tab, setTab] = useState<"access" | "members" | "areas" | "posts" | "safety" | "feedback" | "advertising">("access");',
  "admin tab state not found",
);

source = source.replace('sm:grid-cols-6" aria-label="Admin sections"', 'sm:grid-cols-7" aria-label="Admin sections"');

const membersNav = '            { id: "members" as const, label: "Members", icon: <Users size={16} /> },';
const areasNav = '            { id: "areas" as const, label: "Areas", icon: <MapPinned size={16} /> },';
if (!source.includes(areasNav)) {
  if (!source.includes(membersNav)) throw new Error("Area review admin patch failed: Members nav item not found.");
  source = source.replace(membersNav, `${membersNav}\n${areasNav}`);
}

const membersPanel = '        {tab === "members" && <AdminMemberManagement onProfileOpen={onProfileOpen} />}';
const areasPanel = '        {tab === "areas" && <AreaReviewPanel />}';
if (!source.includes(areasPanel)) {
  if (!source.includes(membersPanel)) throw new Error("Area review admin patch failed: Members panel not found.");
  source = source.replace(membersPanel, `${membersPanel}\n\n${areasPanel}`);
}

const attentionWithSafety = `      const [accessResult, feedbackResult, advertisingResult, safetyResult] = await Promise.all([\n        supabase.from("member_access").select("user_id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),\n        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("safety_reports").select("id", { count: "exact", head: true }).in("status", ["open", "escalated"]),\n      ]);`;
const attentionWithAreas = `      const [accessResult, feedbackResult, advertisingResult, safetyResult, areaResult] = await Promise.all([\n        supabase.from("member_access").select("user_id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),\n        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("safety_reports").select("id", { count: "exact", head: true }).in("status", ["open", "escalated"]),\n        supabase.from("area_review_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),\n      ]);`;
const supportAttention = `      const [supportResult, feedbackResult, advertisingResult] = await Promise.all([\n        supabase.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "new"),\n        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),\n        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),\n      ]);`;
const supportWithAreas = `      const [supportResult, feedbackResult, advertisingResult, safetyResult, areaResult] = await Promise.all([\n        supabase.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "new"),\n        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),\n        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("safety_reports").select("id", { count: "exact", head: true }).in("status", ["open", "escalated"]),\n        supabase.from("area_review_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),\n      ]);`;
if (source.includes(supportAttention)) {
  source = source.replace(supportAttention, supportWithAreas);
  replaceOnce(
    'if (!supportResult.error && !feedbackResult.error && !advertisingResult.error) {\n        setAdminAttentionCount((supportResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0));',
    'if (!supportResult.error && !feedbackResult.error && !advertisingResult.error && !safetyResult.error && !areaResult.error) {\n        setAdminAttentionCount((supportResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0) + (safetyResult.count || 0) + (areaResult.count || 0));',
    "support admin attention count",
  );
} else {
  replaceOnce(attentionWithSafety, attentionWithAreas, "admin attention query not found");
  replaceOnce(
    'if (!accessResult.error && !feedbackResult.error && !advertisingResult.error && !safetyResult.error) {\n        setAdminAttentionCount((accessResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0) + (safetyResult.count || 0));',
    'if (!accessResult.error && !feedbackResult.error && !advertisingResult.error && !safetyResult.error && !areaResult.error) {\n        setAdminAttentionCount((accessResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0) + (safetyResult.count || 0) + (areaResult.count || 0));',
    "admin attention count not found",
  );
}

if (!source.includes('tab === "areas" && <AreaReviewPanel />')) {
  throw new Error("Area review admin patch verification failed.");
}

fs.writeFileSync(appPath, source);
console.log("Added possible duplicate area reviews to the Neighborly admin dashboard.");
