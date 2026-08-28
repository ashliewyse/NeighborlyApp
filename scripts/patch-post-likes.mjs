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
    throw new Error(`Neighborly likes patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

if (!source.includes("postLikeBusyIds, setPostLikeBusyIds")) {
  replaceOnce(
`  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");`,
`  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [postLikeBusyIds, setPostLikeBusyIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");`,
    "post like busy state",
  );
}

if (!source.includes("const likeCountsByPost = new Map<string, number>();")) {
  replaceOnce(
`    const postIds = pageRows.map((row: any) => row.id);
    const commentsResult = await supabase
      .from("post_comments")
      .select("id, post_id, author_id, body, image_path, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (commentsResult.error) {
      console.error("Could not load post comments", commentsResult.error);
      setMorePostsError("Comments could not be loaded. Please try again.");
      setLoadingMorePosts(false);
      return;
    }

    const authorIds = [`,
`    const postIds = pageRows.map((row: any) => row.id);
    const [commentsResult, likesResult, viewerResult] = await Promise.all([
      supabase
        .from("post_comments")
        .select("id, post_id, author_id, body, image_path, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds),
      supabase.auth.getUser(),
    ]);
    if (commentsResult.error || likesResult.error) {
      console.error("Could not load post activity", commentsResult.error || likesResult.error);
      setMorePostsError("Post activity could not be loaded. Please try again.");
      setLoadingMorePosts(false);
      return;
    }

    const viewerId = viewerResult.data.user?.id || null;
    const likeCountsByPost = new Map<string, number>();
    const likedByViewer = new Set<string>();
    (likesResult.data || []).forEach((like: any) => {
      likeCountsByPost.set(like.post_id, (likeCountsByPost.get(like.post_id) || 0) + 1);
      if (viewerId && like.user_id === viewerId) likedByViewer.add(like.post_id);
    });

    const authorIds = [`,
    "post activity loader",
  );
}

if (!source.includes("likes: likeCountsByPost.get(row.id) || 0")) {
  replaceOnce(
`        image: row.image_url || undefined,
        likes: 0,
        comments: commentsByPost.get(row.id) || [],
        bookmarked: false,
        liked: false,`,
`        image: row.image_url || undefined,
        likes: likeCountsByPost.get(row.id) || 0,
        comments: commentsByPost.get(row.id) || [],
        bookmarked: false,
        liked: likedByViewer.has(row.id),`,
    "loaded post like state",
  );
}

if (!source.includes("const databaseId = post.databaseId;\n    if (!databaseId)")) {
  replaceOnce(
`  function toggleLike(id: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p,
      ),
    );
  }`,
`  async function toggleLike(id: number) {
    const post = posts.find((candidate) => candidate.id === id);
    if (!post) return;

    const databaseId = post.databaseId;
    if (!databaseId) {
      setPosts((current) => current.map((candidate) =>
        candidate.id === id
          ? { ...candidate, liked: !candidate.liked, likes: Math.max(0, candidate.likes + (candidate.liked ? -1 : 1)) }
          : candidate,
      ));
      return;
    }
    if (postLikeBusyIds.has(databaseId)) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      window.alert("Your session expired. Please sign in again before liking posts.");
      return;
    }

    const nextLiked = !post.liked;
    const nextLikes = Math.max(0, post.likes + (nextLiked ? 1 : -1));
    const updateLikeState = (liked: boolean, likes: number) => {
      const updatePost = (candidate: Post) => candidate.databaseId === databaseId
        ? { ...candidate, liked, likes }
        : candidate;
      setPosts((current) => current.map(updatePost));
      setClassifiedPosts((current) => current.map(updatePost));
    };

    setPostLikeBusyIds((current) => {
      const next = new Set(current);
      next.add(databaseId);
      return next;
    });
    updateLikeState(nextLiked, nextLikes);

    try {
      const { error } = nextLiked
        ? await supabase.from("post_likes").insert({ post_id: databaseId, user_id: user.id })
        : await supabase.from("post_likes").delete().eq("post_id", databaseId).eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Could not save post like", error);
      updateLikeState(post.liked, post.likes);
      window.alert("That like could not be saved. Please try again.");
    } finally {
      setPostLikeBusyIds((current) => {
        const next = new Set(current);
        next.delete(databaseId);
        return next;
      });
    }
  }`,
    "post like toggle",
  );
}

if (!source.includes("disabled={Boolean(post.databaseId && postLikeBusyIds.has(post.databaseId))}")) {
  replaceOnce(
`                    onClick={() => toggleLike(post.id)}`,
`                    onClick={() => { void toggleLike(post.id); }}
                    disabled={Boolean(post.databaseId && postLikeBusyIds.has(post.databaseId))}`,
    "like button persistence hook",
  );
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied persistent Neighborly post likes.");
} else {
  console.log("Persistent Neighborly post likes already applied.");
}
