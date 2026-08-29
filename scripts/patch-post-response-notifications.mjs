import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Neighborly response notification patch failed: could not find ${label}.`);
  source = source.replace(needle, replacement);
  changed = true;
}

if (!source.includes('notification.type === "post_comment" || notification.type === "thread_comment"')) {
  replaceOnce(
`    if (notification.subjectUserId) {
      void goToUser(
        notification.title === "New Local Business" ? "Local Business" : "Neighbor",
        notification.subjectUserId,
        { preferBusiness: notification.title === "New Local Business" },
      );
      return;
    }
    goToFeed();`,
`    if ((notification.type === "post_comment" || notification.type === "thread_comment") && notification.postId) {
      setActiveLocation("All Areas");
      setActiveTab("all");
      const matchingPost = posts.find((post) => post.databaseId === notification.postId);
      if (matchingPost) setExpandedPost(matchingPost.id);
      goToFeed();
      return;
    }

    if (notification.subjectUserId) {
      void goToUser(
        notification.title === "New Local Business" ? "Local Business" : "Neighbor",
        notification.subjectUserId,
        { preferBusiness: notification.title === "New Local Business" },
      );
      return;
    }
    goToFeed();`,
    "comment notification navigation",
  );
}

if (!source.includes("neighborly-notifications-${currentProfile.id}")) {
  replaceOnce(
`  useEffect(() => {
    if (!authReady || !currentProfile?.id || !notifOpen) return;
    void refreshNeighborlyNotifications();
  }, [authReady, currentProfile?.id, notifOpen]);`,
`  useEffect(() => {
    if (!authReady || !currentProfile?.id || !notifOpen) return;
    void refreshNeighborlyNotifications();
  }, [authReady, currentProfile?.id, notifOpen]);

  useEffect(() => {
    if (!authReady || !currentProfile?.id) return;

    const channel = supabase
      .channel(\`neighborly-notifications-\${currentProfile.id}\`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: \`user_id=eq.\${currentProfile.id}\`,
        },
        () => { void refreshNeighborlyNotifications(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [authReady, currentProfile?.id]);`,
    "notification realtime subscription",
  );
}

replaceOnce(
  '{notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}',
  '{notification.type === "post_comment" || notification.type === "thread_comment" ? <MessageCircle size={15} /> : notification.title === "New Local Business" ? <Briefcase size={15} /> : <Leaf size={15} />}',
  "response notification icon",
);

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied Neighborly post response notifications.");
} else {
  console.log("Neighborly post response notifications already applied.");
}
