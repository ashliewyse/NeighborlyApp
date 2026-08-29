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
    throw new Error(`Neighborly comment likes patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

if (!source.includes("liked?: boolean;\n}")) {
  replaceOnce(
`  time: string;
  likes: number;
}`,
`  time: string;
  likes: number;
  liked?: boolean;
}`,
    "comment liked state",
  );
}

if (!source.includes("commentLikeBusyIds, setCommentLikeBusyIds")) {
  replaceOnce(
`  const [postLikeBusyIds, setPostLikeBusyIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");`,
`  const [postLikeBusyIds, setPostLikeBusyIds] = useState<Set<string>>(new Set());
  const [commentLikeBusyIds, setCommentLikeBusyIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");`,
    "comment like busy state",
  );
}

if (!source.includes("const commentLikeCountsByComment = new Map<string, number>();")) {
  replaceOnce(
`    const viewerId = viewerResult.data.user?.id || null;
    const likeCountsByPost = new Map<string, number>();
    const likedByViewer = new Set<string>();
    (likesResult.data || []).forEach((like: any) => {
      likeCountsByPost.set(like.post_id, (likeCountsByPost.get(like.post_id) || 0) + 1);
      if (viewerId && like.user_id === viewerId) likedByViewer.add(like.post_id);
    });

    const authorIds = [`,
`    const viewerId = viewerResult.data.user?.id || null;

    const commentIds = (commentsResult.data || []).map((comment: any) => comment.id);
    let commentLikeRows: any[] = [];
    if (commentIds.length) {
      const commentLikesResult = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      if (commentLikesResult.error) {
        console.error("Could not load comment likes", commentLikesResult.error);
      } else {
        commentLikeRows = commentLikesResult.data || [];
      }
    }

    const commentLikeCountsByComment = new Map<string, number>();
    const commentsLikedByViewer = new Set<string>();
    commentLikeRows.forEach((like: any) => {
      commentLikeCountsByComment.set(
        like.comment_id,
        (commentLikeCountsByComment.get(like.comment_id) || 0) + 1,
      );
      if (viewerId && like.user_id === viewerId) commentsLikedByViewer.add(like.comment_id);
    });

    const likeCountsByPost = new Map<string, number>();
    const likedByViewer = new Set<string>();
    (likesResult.data || []).forEach((like: any) => {
      likeCountsByPost.set(like.post_id, (likeCountsByPost.get(like.post_id) || 0) + 1);
      if (viewerId && like.user_id === viewerId) likedByViewer.add(like.post_id);
    });

    const authorIds = [`,
    "comment like loader",
  );
}

if (!source.includes("likes: commentLikeCountsByComment.get(comment.id) || 0")) {
  replaceOnce(
`        time: formatMessageTime(comment.created_at),
        likes: 0,
      };`,
`        time: formatMessageTime(comment.created_at),
        likes: commentLikeCountsByComment.get(comment.id) || 0,
        liked: commentsLikedByViewer.has(comment.id),
      };`,
    "loaded comment like state",
  );
}

if (!source.includes("async function toggleCommentLike(postId: number, commentId: number)")) {
  replaceOnce(
`  async function toggleLike(id: number) {`,
`  async function toggleCommentLike(postId: number, commentId: number) {
    const post = posts.find((candidate) => candidate.id === postId)
      || classifiedPosts.find((candidate) => candidate.id === postId);
    const comment = post?.comments.find((candidate) => candidate.id === commentId);
    if (!post || !comment) return;

    const updateLocalComment = (liked: boolean, likes: number) => {
      const updatePost = (candidate: Post) => {
        if (candidate.id !== postId && candidate.databaseId !== post.databaseId) return candidate;
        return {
          ...candidate,
          comments: candidate.comments.map((candidateComment) => {
            const sameComment = comment.databaseId
              ? candidateComment.databaseId === comment.databaseId
              : candidateComment.id === commentId;
            return sameComment ? { ...candidateComment, liked, likes } : candidateComment;
          }),
        };
      };
      setPosts((current) => current.map(updatePost));
      setClassifiedPosts((current) => current.map(updatePost));
    };

    const databaseId = comment.databaseId;
    const nextLiked = !Boolean(comment.liked);
    const nextLikes = Math.max(0, comment.likes + (nextLiked ? 1 : -1));

    if (!databaseId) {
      updateLocalComment(nextLiked, nextLikes);
      return;
    }
    if (commentLikeBusyIds.has(databaseId)) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      window.alert("Your session expired. Please sign in again before liking comments.");
      return;
    }

    setCommentLikeBusyIds((current) => {
      const next = new Set(current);
      next.add(databaseId);
      return next;
    });
    updateLocalComment(nextLiked, nextLikes);

    try {
      const { error } = nextLiked
        ? await supabase.from("comment_likes").insert({ comment_id: databaseId, user_id: user.id })
        : await supabase.from("comment_likes").delete().eq("comment_id", databaseId).eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Could not save comment like", error);
      updateLocalComment(Boolean(comment.liked), comment.likes);
      window.alert("That comment like could not be saved. Please try again.");
    } finally {
      setCommentLikeBusyIds((current) => {
        const next = new Set(current);
        next.delete(databaseId);
        return next;
      });
    }
  }

  async function toggleLike(id: number) {`,
    "comment like toggle",
  );
}

if (!source.includes("void toggleCommentLike(post.id, c.id)")) {
  replaceOnce(
`                            {c.databaseId && c.authorId !== currentProfile?.id && (
                              <div className="mt-2">
                                <SafetyReportButton targetType="comment" targetId={c.databaseId} label="Report" compact />
                              </div>
                            )}`,
`                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => { void toggleCommentLike(post.id, c.id); }}
                                disabled={Boolean(c.databaseId && commentLikeBusyIds.has(c.databaseId))}
                                className={\`inline-flex items-center gap-1 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-60 \${c.liked ? "text-blue-600" : "text-muted-foreground hover:text-blue-600"}\`}
                                aria-pressed={Boolean(c.liked)}
                                aria-label={(c.liked ? "Unlike " : "Like ") + c.author + "'s comment"}
                              >
                                <ThumbsUp size={12} className={c.liked ? "fill-current" : ""} />
                                {c.liked ? "Liked" : "Like"}
                                {c.likes > 0 && <span>{c.likes}</span>}
                              </button>
                              {c.databaseId && c.authorId !== currentProfile?.id && (
                                <SafetyReportButton targetType="comment" targetId={c.databaseId} label="Report" compact />
                              )}
                            </div>`,
    "comment like button",
  );
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied persistent Neighborly comment likes.");
} else {
  console.log("Persistent Neighborly comment likes already applied.");
}
