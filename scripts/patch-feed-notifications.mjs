import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, "../src/app/App.tsx");
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) {
    throw new Error(`Neighborly patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

// Feed should always open on All Areas. A member can still switch to any city/neighborhood afterward.
replaceOnce(
  '    setActiveLocation(defaultLocation);',
  '    setActiveLocation("All Areas");',
  "profile-based feed default",
);

if (!source.includes("interface NeighborlyNotification")) {
  replaceOnce(
`interface PendingFriendRequest {
  id: string;
  requesterId: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}
`,
`interface PendingFriendRequest {
  id: string;
  requesterId: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

interface NeighborlyNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  subjectUserId?: string | null;
  postId?: string | null;
  readAt?: string | null;
  createdAt: string;
}
`,
    "notification type",
  );
}

if (!source.includes("neighborlyNotifications, setNeighborlyNotifications")) {
  replaceOnce(
`  const [pendingFriendRequests, setPendingFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [friendRequestBusy, setFriendRequestBusy] = useState<string | null>(null);`,
`  const [pendingFriendRequests, setPendingFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [neighborlyNotifications, setNeighborlyNotifications] = useState<NeighborlyNotification[]>([]);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const unreadNeighborlyNotificationCount = neighborlyNotifications.filter((notification) => !notification.readAt).length;
  const totalNotificationCount = pendingFriendRequests.length + unreadNeighborlyNotificationCount;
  const [friendRequestBusy, setFriendRequestBusy] = useState<string | null>(null);`,
    "notification state",
  );
}

if (!source.includes("async function refreshNeighborlyNotifications()")) {
  replaceOnce(
`  async function refreshFriendRequests() {`,
`  async function refreshNeighborlyNotifications() {
    const userId = currentProfile?.id;
    if (!userId) {
      setNeighborlyNotifications([]);
      setNotificationError(null);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, subject_user_id, post_id, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("Could not load Neighborly notifications", error);
      setNotificationError("Neighborly updates could not be loaded.");
      return;
    }

    setNotificationError(null);
    setNeighborlyNotifications((data || []).map((notification: any) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      subjectUserId: notification.subject_user_id,
      postId: notification.post_id,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    })));
  }

  async function openNeighborlyNotification(notification: NeighborlyNotification) {
    setNotifOpen(false);
    if (!notification.readAt && currentProfile?.id) {
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("id", notification.id)
        .eq("user_id", currentProfile.id);
      if (!error) {
        setNeighborlyNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, readAt } : item,
        ));
      }
    }

    if (notification.subjectUserId) {
      void goToUser(
        notification.title === "New Local Business" ? "Local Business" : "Neighbor",
        notification.subjectUserId,
        { preferBusiness: notification.title === "New Local Business" },
      );
      return;
    }
    goToFeed();
  }

  async function refreshFriendRequests() {`,
    "notification loader",
  );
}

if (!source.includes("void refreshNeighborlyNotifications();\n    void refreshFriendRequests();")) {
  replaceOnce(
`  useEffect(() => {
    if (!authReady || !currentProfile?.id) return;
    void refreshFriendRequests();
  }, [authReady, currentProfile?.id]);`,
`  useEffect(() => {
    if (!authReady || !currentProfile?.id) return;
    void refreshNeighborlyNotifications();
    void refreshFriendRequests();
  }, [authReady, currentProfile?.id]);

  useEffect(() => {
    if (!authReady || !currentProfile?.id || !notifOpen) return;
    void refreshNeighborlyNotifications();
  }, [authReady, currentProfile?.id, notifOpen]);`,
    "notification refresh effects",
  );
}

replaceOnce(
`              {pendingFriendRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {pendingFriendRequests.length > 99 ? "99+" : pendingFriendRequests.length}
                </span>
              )}`,
`              {totalNotificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {totalNotificationCount > 99 ? "99+" : totalNotificationCount}
                </span>
              )}`,
  "notification badge count",
);

if (!source.includes("neighborlyNotifications.map((notification)")) {
  replaceOnce(
`            {pendingFriendRequests.length === 0 ? (`,
`            {notificationError && <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">{notificationError}</p>}
            {neighborlyNotifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => { void openNeighborlyNotification(notification); }}
                className={\`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/60 ${notification.readAt ? "bg-white" : "bg-blue-50/60"}\`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    {notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{notification.title}</p>
                      {!notification.readAt && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatMessageTime(notification.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
            {pendingFriendRequests.length === 0 && neighborlyNotifications.length === 0 ? (`,
    "notification panel items",
  );
}

replaceOnce(
  "Friend requests will appear here.",
  "Friend requests and Neighborly updates will appear here.",
  "notification empty-state text",
);

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied Neighborly feed and notification enhancements.");
} else {
  console.log("Neighborly feed and notification enhancements already applied.");
}
