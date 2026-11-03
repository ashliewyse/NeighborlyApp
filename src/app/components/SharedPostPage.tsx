import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/auth/AuthProvider";
import { UUID_PATTERN } from "@/lib/sharing.mjs";
import { ShareButton } from "./ShareButton";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { requireCurrentMember, throwIfError } from "./groups/group-api";

export function SharedPostRoute() {
  const { postId = "" } = useParams();
  const { user } = useAuth();
  return <SharedPostPage key={`${postId}:${user?.id}`} postId={postId} />;
}
export function SharedPostPage({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null),
    [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState(""),
    [notice, setNotice] = useState("");
  const [limit, setLimit] = useState(30),
    [hasMore, setHasMore] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    if (!UUID_PATTERN.test(postId)) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id,author_id,content,image_url,created_at,city")
          .eq("id", postId)
          .maybeSingle();
        throwIfError(error);
        if (!active) return;
        if (!data) {
          setPost(null);
          setComments([]);
          return;
        }
        const [profile, business] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.author_id)
            .maybeSingle(),
          supabase
            .from("business_profiles")
            .select("business_name")
            .eq("user_id", data.author_id)
            .maybeSingle(),
        ]);
        throwIfError(profile.error);
        throwIfError(business.error);
        if (!active) return;
        setPost({
          ...data,
          author: {
            full_name:
              business.data?.business_name ||
              profile.data?.full_name ||
              "Neighbor",
          },
        });
        const result = await supabase
          .from("post_comments")
          .select(
            "id,author_id,body,image_path,created_at,author:profiles!post_comments_author_id_fkey(full_name)",
          )
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit + 1);
        throwIfError(result.error);
        if (active) {
          setComments((result.data || []).slice(0, limit).reverse());
          setHasMore((result.data || []).length > limit);
        }
      } catch {
        if (active)
          setError("This post could not be loaded. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [postId, user?.id, limit, version]);
  async function comment(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !draft.trim() || !user) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requireCurrentMember(user.id);
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: user.id, body: draft.trim() });
      throwIfError(error);
      setDraft("");
      setNotice("Comment saved.");
      setLimit((old) => old + 1);
      setVersion((old) => old + 1);
    } catch (cause: any) {
      setError(
        `Comment was not saved. ${cause.message || "Please try again."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-[100dvh] bg-purple-50 px-4 py-7 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-purple-800"
        >
          <ArrowLeft size={17} />
          Back to Neighborly
        </Link>
        {loading ? (
          <p role="status" className="py-12 text-center">
            Loading post…
          </p>
        ) : post ? (
          <article className="mt-5 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-bold">
                  {post.author?.full_name || "Neighbor"}
                </h1>
                <p className="text-xs text-slate-500">
                  {post.city} · {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
              <ShareButton kind="post" itemId={post.id} />
            </div>
            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">
              {post.content}
            </p>
            {post.image_url && (
              <ImageWithFallback
                src={post.image_url}
                alt="Image attached to the post"
                className="mt-4 max-h-[32rem] w-full rounded-xl object-contain"
              />
            )}
            <h2 className="mt-6 border-t pt-5 font-bold">Comments</h2>
            <div className="mt-4 space-y-3">
              {comments.map((row) => (
                <div key={row.id} className="rounded-xl bg-purple-50 p-3">
                  <p className="text-sm font-bold">
                    {row.author?.full_name || "Neighbor"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                    {row.body}
                  </p>
                  {row.image_path && (
                    <ImageWithFallback
                      src={
                        supabase.storage
                          .from("neighborly-media")
                          .getPublicUrl(row.image_path).data.publicUrl
                      }
                      alt="Image attached to a comment"
                      className="mt-2 max-h-60 rounded-lg object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setLimit((old) => old + 30)}
                className="mt-3 text-sm font-bold text-purple-700"
              >
                Load earlier comments
              </button>
            )}
            <form onSubmit={comment} className="mt-5">
              <label className="block text-sm font-bold">
                Add a comment
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="mt-2 w-full rounded-xl border p-3 font-normal"
                />
              </label>
              <button
                disabled={busy || !draft.trim()}
                className="mt-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Post comment"}
              </button>
            </form>
          </article>
        ) : (
          <section className="mt-5 rounded-2xl bg-white p-6">
            <h1 className="text-xl font-bold">
              {error ? "Unable to load post" : "Post unavailable"}
            </h1>
            <p className="mt-2 text-sm">
              {error ||
                "It may have been removed, or your account may not have access to it."}
            </p>
          </section>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}{" "}
            <button
              className="font-bold underline"
              onClick={() => setVersion((old) => old + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm text-emerald-800">
            {notice}
          </p>
        )}
      </div>
    </main>
  );
}
