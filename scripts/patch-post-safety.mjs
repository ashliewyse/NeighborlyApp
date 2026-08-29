import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

const safetyImport = 'import { AdminSafetyPanel } from "@/app/components/AdminSafetyPanel";';
if (!source.includes(safetyImport)) {
  const anchor = 'import { SettingsView } from "@/app/components/SettingsView";';
  if (!source.includes(anchor)) throw new Error("Could not find SettingsView import anchor.");
  source = source.replace(anchor, `${anchor}\n${safetyImport}`);
}

const postMenuStart = source.indexOf("function PostOwnerMenu({");
const postMenuEnd = source.indexOf("\nfunction EditPostDialog({", postMenuStart);
if (postMenuStart < 0 || postMenuEnd < 0) throw new Error("Could not find PostOwnerMenu block.");

const postSafetyMenu = `function PostOwnerMenu({
  post,
  currentUserId,
  busy,
  onEdit,
  onDelete,
}: {
  post: Post;
  currentUserId?: string;
  busy?: boolean;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam_scam");
  const [reportDetails, setReportDetails] = useState("");
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  if (!post.databaseId || !currentUserId) return null;

  const isOwner = post.authorId === currentUserId;
  const canBlock = !isOwner && !!post.authorId && !post.isAdminPost;
  const reportReasons = [
    ["spam_scam", "Spam or scam"],
    ["harassment_bullying", "Harassment or bullying"],
    ["hate_threats", "Hate, threats, or violence"],
    ["false_misleading", "False or misleading information"],
    ["inappropriate", "Inappropriate content"],
    ["privacy", "Privacy concern"],
    ["other", "Other"],
  ] as const;

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (safetyBusy) return;
    setSafetyBusy(true);
    setSafetyError(null);
    setSafetyMessage(null);
    const { error } = await supabase.from("post_reports").insert({
      post_id: post.databaseId,
      reporter_id: currentUserId,
      reported_user_id: post.authorId || null,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
    setSafetyBusy(false);
    if (error) {
      if (error.code === "23505") setSafetyMessage("You already reported this post. Neighborly Admin has the report.");
      else {
        console.error("Could not report post", error);
        setSafetyError("The report could not be sent. Please try again.");
      }
      return;
    }
    setSafetyMessage("Report sent to Neighborly Admin. Thank you for helping keep Neighborly safe.");
    setReportDetails("");
  }

  async function blockPostAuthor() {
    if (!post.authorId || !canBlock || safetyBusy) return;
    const confirmed = window.confirm(
      "Block " + post.author + "? You will no longer see each other's profiles, posts, comments, or direct messages. Neighborly Admin will be notified.",
    );
    if (!confirmed) return;
    setOpen(false);
    setSafetyBusy(true);
    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: currentUserId,
      blocked_id: post.authorId,
    });
    setSafetyBusy(false);
    if (error && error.code !== "23505") {
      console.error("Could not block member", error);
      window.alert("That member could not be blocked. Please try again.");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setOpen((current) => !current)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors"
          aria-label="Post options"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busy || safetyBusy}
        >
          <MoreHorizontal size={17} />
        </button>
        {open && (
          <>
            <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close post options" />
            <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl" role="menu">
              {isOwner ? (
                <>
                  <button
                    onClick={() => { setOpen(false); onEdit(post); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    role="menuitem"
                  >
                    <Pencil size={14} /> Edit post
                  </button>
                  <button
                    onClick={() => { setOpen(false); onDelete(post); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    role="menuitem"
                  >
                    <Trash2 size={14} /> Delete post
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setOpen(false); setSafetyError(null); setSafetyMessage(null); setReportOpen(true); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    role="menuitem"
                  >
                    <Flag size={14} className="text-amber-600" /> Report post
                  </button>
                  {canBlock && (
                    <button
                      onClick={() => { void blockPostAuthor(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      role="menuitem"
                    >
                      <ShieldAlert size={14} /> Block {post.author}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {reportOpen && (
        <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen && !safetyBusy) setReportOpen(false); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] max-h-[90dvh] w-[min(34rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl" aria-describedby={undefined}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <Dialog.Title className="flex items-center gap-2 text-lg font-semibold"><Flag size={18} className="text-amber-600" /> Report post</Dialog.Title>
                <Dialog.Close disabled={safetyBusy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50" aria-label="Close report"><X size={16} /></Dialog.Close>
              </div>
              <form onSubmit={(event) => { void submitReport(event); }} className="space-y-4 p-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Reporting sends this post to Neighborly Admin for review. The person who posted it is not told who submitted the report.
                </div>
                <div>
                  <label htmlFor={"report-reason-" + post.databaseId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why are you reporting this?</label>
                  <select id={"report-reason-" + post.databaseId} value={reportReason} onChange={(event) => setReportReason(event.target.value)} disabled={safetyBusy} className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30 disabled:opacity-50">
                    {reportReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={"report-details-" + post.databaseId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional details <span className="font-normal normal-case">(optional)</span></label>
                  <textarea id={"report-details-" + post.databaseId} rows={4} maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} disabled={safetyBusy} placeholder="Tell Neighborly Admin what happened." className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30 disabled:opacity-50" />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">{reportDetails.length}/1000</p>
                </div>
                {safetyError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{safetyError}</p>}
                {safetyMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{safetyMessage}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setReportOpen(false)} disabled={safetyBusy} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">Close</button>
                  {!safetyMessage && <button type="submit" disabled={safetyBusy} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{safetyBusy ? "Sending report…" : "Send report"}</button>}
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}
`;

source = source.slice(0, postMenuStart) + postSafetyMenu + source.slice(postMenuEnd);

const oldTabState = 'const [tab, setTab] = useState<"access" | "posts" | "feedback" | "advertising">("access");';
const newTabState = 'const [tab, setTab] = useState<"access" | "posts" | "safety" | "feedback" | "advertising">("access");';
if (source.includes(oldTabState)) source = source.replace(oldTabState, newTabState);
else if (!source.includes(newTabState)) throw new Error("Could not patch admin tab state.");

const oldAdminNav = '<nav className="grid grid-cols-2 overflow-hidden rounded-xl bg-white p-1 shadow-sm sm:grid-cols-4" aria-label="Admin sections">';
const newAdminNav = '<nav className="grid grid-cols-2 overflow-hidden rounded-xl bg-white p-1 shadow-sm sm:grid-cols-5" aria-label="Admin sections">';
if (source.includes(oldAdminNav)) source = source.replace(oldAdminNav, newAdminNav);

const feedbackNavItem = '            { id: "feedback" as const, label: `Feedback${unreadFeedback ? ` (${unreadFeedback})` : ""}`, icon: <MessageSquare size={16} /> },';
const safetyNavItem = '            { id: "safety" as const, label: "Safety", icon: <ShieldAlert size={16} /> },';
if (!source.includes(safetyNavItem)) {
  if (!source.includes(feedbackNavItem)) throw new Error("Could not find admin feedback nav item.");
  source = source.replace(feedbackNavItem, `${safetyNavItem}\n${feedbackNavItem}`);
}

const feedbackPanelAnchor = '        {tab === "feedback" && (';
const safetyPanel = '        {tab === "safety" && <AdminSafetyPanel />}\n\n';
if (!source.includes(safetyPanel.trim())) {
  const anchorIndex = source.indexOf(feedbackPanelAnchor);
  if (anchorIndex < 0) throw new Error("Could not find admin feedback panel anchor.");
  source = source.slice(0, anchorIndex) + safetyPanel + source.slice(anchorIndex);
}

const oldNotificationIcon = '{notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}';
const newNotificationIcon = '{notification.type === "post_reported" ? <Flag size={15} /> : notification.type === "user_blocked" ? <ShieldAlert size={15} /> : notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}';
if (source.includes(oldNotificationIcon)) source = source.replace(oldNotificationIcon, newNotificationIcon);

fs.writeFileSync(appPath, source);
console.log("Applied Neighborly post reporting, blocking, and admin safety controls.");
