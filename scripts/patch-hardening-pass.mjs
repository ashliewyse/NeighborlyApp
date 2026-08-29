import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Could not find ${label}.`);
  source = source.replace(needle, replacement);
}

const moderatorImport = 'import { ModeratorDashboard } from "@/app/components/ModeratorDashboard";';
const safetyReportImport = 'import { SafetyReportButton } from "@/app/components/SafetyReportButton";';
const memberManagementImport = 'import { AdminMemberManagement } from "@/app/components/AdminMemberManagement";';
if (!source.includes(safetyReportImport) || !source.includes(memberManagementImport)) {
  if (!source.includes(moderatorImport)) throw new Error("Could not find ModeratorDashboard import anchor.");
  const additions = [
    source.includes(safetyReportImport) ? null : safetyReportImport,
    source.includes(memberManagementImport) ? null : memberManagementImport,
  ].filter(Boolean).join("\n");
  source = source.replace(moderatorImport, `${moderatorImport}\n${additions}`);
}

const legacyReportInsert = `    const { error } = await supabase.from("post_reports").insert({\n      post_id: post.databaseId,\n      reporter_id: currentUserId,\n      reported_user_id: post.authorId || null,\n      reason: reportReason,\n      details: reportDetails.trim() || null,\n    });`;
const safetyReportInsert = `    const { error } = await supabase.from("safety_reports").insert({\n      target_type: "post",\n      post_id: post.databaseId,\n      reason: reportReason,\n      details: reportDetails.trim() || null,\n    });`;
if (source.includes(legacyReportInsert)) source = source.replace(legacyReportInsert, safetyReportInsert);
else if (!source.includes(safetyReportInsert)) throw new Error("Could not switch post reporting to safety_reports.");
source = source.replace("You already reported this post. Neighborly Admin has the report.", "You already reported this post. Neighborly's safety team has the report.");
source = source.replace("Report sent to Neighborly Admin. Thank you for helping keep Neighborly safe.", "Report sent to Neighborly's safety team. Thank you for helping keep Neighborly safe.");
source = source.replace("Reporting sends this post to Neighborly Admin for review. The person who posted it is not told who submitted the report.", "Reporting sends this post to Neighborly's safety team for review. The person who posted it is not told who submitted the report.");
source = source.replace("Tell Neighborly Admin what happened.", "Tell the safety team what happened.");

const adminSignature = `function AdminDashboard({\n  onBack,\n  onPreviewSignup,\n  defaultCity,\n  defaultNeighborhood,\n  onPostCreated,\n}: {\n  onBack: () => void;\n  onPreviewSignup: () => void;\n  defaultCity: string;\n  defaultNeighborhood: string;\n  onPostCreated: (post: Post) => void;\n}) {`;
const adminSignatureWithProfile = `function AdminDashboard({\n  onBack,\n  onPreviewSignup,\n  defaultCity,\n  defaultNeighborhood,\n  onPostCreated,\n  onProfileOpen,\n}: {\n  onBack: () => void;\n  onPreviewSignup: () => void;\n  defaultCity: string;\n  defaultNeighborhood: string;\n  onPostCreated: (post: Post) => void;\n  onProfileOpen: (name: string, userId: string) => void;\n}) {`;
replaceOnce(adminSignature, adminSignatureWithProfile, "AdminDashboard profile callback signature");

replaceOnce(
  'const [tab, setTab] = useState<"access" | "posts" | "safety" | "feedback" | "advertising">("access");',
  'const [tab, setTab] = useState<"access" | "members" | "posts" | "safety" | "feedback" | "advertising">("access");',
  "expanded admin tab state",
);

if (source.includes('sm:grid-cols-5" aria-label="Admin sections"')) {
  source = source.replace('sm:grid-cols-5" aria-label="Admin sections"', 'sm:grid-cols-6" aria-label="Admin sections"');
}

const accessNav = '            { id: "access" as const, label: `Access${pendingAccessRequests.length ? ` (${pendingAccessRequests.length})` : ""}`, icon: <UserCheck size={16} /> },';
const membersNav = '            { id: "members" as const, label: "Members", icon: <Users size={16} /> },';
if (!source.includes(membersNav)) {
  if (!source.includes(accessNav)) throw new Error("Could not find admin access nav item.");
  source = source.replace(accessNav, `${accessNav}\n${membersNav}`);
}

const accessPanelAnchor = '        {tab === "access" && (';
const membersPanel = '        {tab === "members" && <AdminMemberManagement onProfileOpen={onProfileOpen} />}\n\n';
if (!source.includes(membersPanel.trim())) {
  const index = source.indexOf(accessPanelAnchor);
  if (index < 0) throw new Error("Could not find admin access panel anchor.");
  source = source.slice(0, index) + membersPanel + source.slice(index);
}

source = source.replace('        {tab === "safety" && <AdminSafetyPanel />}', '        {tab === "safety" && <AdminSafetyPanel onProfileOpen={onProfileOpen} />}');

const adminFunction = `  function goToAdmin() {\n    if (!isSiteAdmin) return;\n    setView({ page: "admin" });\n    navigate("/admin");\n  }`;
const adminWithStaffProfile = `${adminFunction}\n  function openProfileFromStaff(name: string, userId: string) {\n    navigate("/", { replace: true });\n    void goToUser(name, userId);\n  }`;
replaceOnce(adminFunction, adminWithStaffProfile, "staff profile opener");

source = source.replace(
  'return <ModeratorDashboard onBack={goToFeed} />;',
  'return <ModeratorDashboard onBack={goToFeed} onProfileOpen={openProfileFromStaff} />;',
);

const adminRenderPostCreatedEnd = `      onPostCreated={(post) => {\n        setPosts((current) => [post, ...current]);\n        if (post.category === "forsale") setClassifiedPosts((current) => [post, ...current]);\n      }}\n    />`;
const adminRenderWithProfile = `      onPostCreated={(post) => {\n        setPosts((current) => [post, ...current]);\n        if (post.category === "forsale") setClassifiedPosts((current) => [post, ...current]);\n      }}\n      onProfileOpen={openProfileFromStaff}\n    />`;
replaceOnce(adminRenderPostCreatedEnd, adminRenderWithProfile, "AdminDashboard render callback");

const businessMessageBlock = `                {!isOwnProfile && biz.ownerId && (\n                  <button\n                    onClick={() => onMessage?.({ id: biz.ownerId!, name: biz.name, avatarUrl: logoUrl, accountType: "business" })}\n                    className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors font-['DM_Sans',sans-serif]"\n                  >\n                    <MessageSquare size={13} /> Message\n                  </button>\n                )}`;
const businessSafetyBlock = `${businessMessageBlock}\n                {!isOwnProfile && biz.ownerId && (\n                  <SafetyReportButton\n                    targetType="business"\n                    targetId={biz.ownerId}\n                    label="Report"\n                    className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 border border-red-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"\n                  />\n                )}`;
replaceOnce(businessMessageBlock, businessSafetyBlock, "business report button");

const userConnection = '{profile.id && <ProfileConnectionActions targetId={profile.id} targetName={profile.name} followButtonClass={T.btn} />}';
const userConnectionWithReport = `${userConnection}\n                  {profile.id && (\n                    <SafetyReportButton\n                      targetType="profile"\n                      targetId={profile.id}\n                      label="Report"\n                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"\n                    />\n                  )}`;
replaceOnce(userConnection, userConnectionWithReport, "profile report button");

const commentImageEnd = `                            {c.image && (\n                              <ExpandablePhoto\n                                src={c.image}\n                                alt={\`Photo shared by ${c.author}\`}\n                                buttonClassName="mt-2 block w-full max-w-lg cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted"\n                                imageClassName="max-h-80 w-full object-cover"\n                              />\n                            )}`;
const commentImageWithReport = `${commentImageEnd}\n                            {c.databaseId && c.authorId !== currentProfile?.id && (\n                              <div className="mt-2">\n                                <SafetyReportButton targetType="comment" targetId={c.databaseId} label="Report" compact />\n                              </div>\n                            )}`;
replaceOnce(commentImageEnd, commentImageWithReport, "comment report button");

const messageTimestamp = `<p className={\`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}\`}>{formatMessageTime(message.created_at)}</p>`;
const messageTimestampWithReport = `${messageTimestamp}\n                                  {!mine && (\n                                    <div className="mt-1.5">\n                                      <SafetyReportButton targetType="message" targetId={message.id} label="Report" compact />\n                                    </div>\n                                  )}`;
replaceOnce(messageTimestamp, messageTimestampWithReport, "message report button");

const notificationIcon = '{notification.type === "post_reported" ? <Flag size={15} /> : notification.type === "user_blocked" ? <ShieldAlert size={15} /> : notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}';
const expandedNotificationIcon = '{notification.type === "post_reported" || notification.type === "safety_reported" ? <Flag size={15} /> : notification.type === "user_blocked" || notification.type === "moderation_warning" || notification.type === "moderation_action" ? <ShieldAlert size={15} /> : notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}';
if (source.includes(notificationIcon)) source = source.replace(notificationIcon, expandedNotificationIcon);

const attentionPromise = `      const [accessResult, feedbackResult, advertisingResult] = await Promise.all([\n        supabase.from("member_access").select("user_id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),\n        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),\n      ]);`;
const attentionPromiseWithSafety = `      const [accessResult, feedbackResult, advertisingResult, safetyResult] = await Promise.all([\n        supabase.from("member_access").select("user_id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),\n        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),\n        supabase.from("safety_reports").select("id", { count: "exact", head: true }).in("status", ["open", "escalated"]),\n      ]);`;
if (source.includes(attentionPromise)) source = source.replace(attentionPromise, attentionPromiseWithSafety);
source = source.replace(
  'if (!accessResult.error && !feedbackResult.error && !advertisingResult.error) {\n        setAdminAttentionCount((accessResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0));',
  'if (!accessResult.error && !feedbackResult.error && !advertisingResult.error && !safetyResult.error) {\n        setAdminAttentionCount((accessResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0) + (safetyResult.count || 0));',
);

fs.writeFileSync(appPath, source);
console.log("Applied Neighborly member management, expanded reporting, and staff moderation wiring.");
