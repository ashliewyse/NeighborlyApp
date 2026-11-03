import fs from "node:fs";
const appPath = new URL("../src/app/App.tsx", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");
function patch(before, after, label) {
  if (app.includes(after)) return;
  if (!app.includes(before))
    throw new Error(`Group sharing patch: missing ${label}`);
  app = app.replace(before, after);
}
patch(
  "export default function App() {",
  "export default function App() {\n  const { user: sharingUser } = useAuth();",
  "current user",
);
if (!app.includes("import { ShareButton }"))
  app =
    'import { ShareButton } from "@/app/components/ShareButton";\nimport { useGroupInvitations, GroupInvitationList } from "@/app/components/groups/GroupInvitations";\n' +
    app;
patch(
  "  const totalNotificationCount = pendingFriendRequests.length + unreadNeighborlyNotificationCount;",
  "  const groupInbox = useGroupInvitations(sharingUser?.id, notifOpen);\n  const totalNotificationCount = pendingFriendRequests.length + unreadNeighborlyNotificationCount + groupInbox.invites.length;",
  "invitation badge",
);
patch(
  "            {neighborlyNotifications.map((notification) => (",
  "            <GroupInvitationList invites={groupInbox.invites} error={groupInbox.error} onRetry={() => void groupInbox.refresh()} />\n            {neighborlyNotifications.map((notification) => (",
  "invitation panel",
);
patch(
  "{pendingFriendRequests.length === 0 && neighborlyNotifications.length === 0 ? (",
  "{pendingFriendRequests.length === 0 && neighborlyNotifications.length === 0 && groupInbox.invites.length === 0 && !groupInbox.error ? (",
  "empty notification state",
);
patch(
  '            <button onClick={goToOwnProfile} aria-label="View profile">',
  '            <ShareButton label="" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" />\n            <button onClick={goToOwnProfile} aria-label="View profile">',
  "website sharing",
);
patch(
  `                  <button className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:gap-1.5 sm:px-3 sm:text-sm">
                    <Share2 size={14} className="shrink-0" />
                    Share
                  </button>`,
  `                  {post.databaseId && <ShareButton kind="post" itemId={post.databaseId} className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:gap-1.5 sm:px-3 sm:text-sm" />}`,
  "post sharing",
);
if (!app.includes("import { Link as GroupLink }"))
  app = 'import { Link as GroupLink } from "react-router";\n' + app;
patch(
  '<p className="font-semibold text-sm text-foreground truncate">{g.name}</p>',
  '<GroupLink to={`/groups/${g.id}`} className="font-semibold text-sm text-foreground hover:underline">{g.name}</GroupLink>',
  "search result group links",
);
fs.writeFileSync(appPath, app);

const authPath = new URL("../src/app/components/AuthView.tsx", import.meta.url);
let auth = fs.readFileSync(authPath, "utf8");
if (!auth.includes("function getAuthReturnPath()")) {
  auth = 'import { safeReturnPath } from "@/lib/sharing.mjs";\n' + auth;
  auth = auth.replace(
    "const PREVIEW_EMAIL =",
    `function getAuthReturnPath() {
  return typeof window === "undefined" ? "/profile" : safeReturnPath(new URLSearchParams(window.location.search).get("next"), "/profile");
}

const PREVIEW_EMAIL =`,
  );
}
auth = auth.replaceAll(
  'encodeURIComponent("/profile")',
  "encodeURIComponent(getAuthReturnPath())",
);
fs.writeFileSync(authPath, auth);
console.log(
  "Applied group invitations, website/post sharing, and shared-link auth recovery.",
);
