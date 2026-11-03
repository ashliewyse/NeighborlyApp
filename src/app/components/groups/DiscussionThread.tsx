import { useEffect, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  requireCurrentMember,
  throwIfError,
  type Discussion,
} from "./group-api";

export function DiscussionThread({
  post,
  userId,
  canManage,
  onRemoved,
}: {
  post: Discussion;
  userId: string;
  canManage: boolean;
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false),
    [rows, setRows] = useState<Discussion[]>([]),
    [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [limit, setLimit] = useState(20),
    [hasMore, setHasMore] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("community_group_replies")
          .select(
            "id,post_id,author_id,content,created_at,author:profiles(full_name,avatar_url)",
          )
          .eq("post_id", post.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit + 1);
        throwIfError(error);
        if (active) {
          setRows(
            (data || []).slice(0, limit).reverse() as unknown as Discussion[],
          );
          setHasMore((data || []).length > limit);
        }
      } catch {
        if (active) setError("Replies could not be loaded. Try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, post, limit, revision]);
  async function reply(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requireCurrentMember(userId);
      const { error } = await supabase
        .from("community_group_replies")
        .insert({ post_id: post.id, author_id: userId, content: draft.trim() });
      throwIfError(error);
      setDraft("");
      setNotice("Reply saved.");
      setLimit((old) => old + 1);
      setRevision((old) => old + 1);
    } catch (cause: any) {
      setError(`Reply was not saved. ${cause.message || "Please try again."}`);
    } finally {
      setBusy(false);
    }
  }
  async function remove(
    table: "community_group_posts" | "community_group_replies",
    id: string,
  ) {
    if (
      busy ||
      !window.confirm(
        table === "community_group_posts"
          ? "Remove this discussion and its replies?"
          : "Remove this reply?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await requireCurrentMember(userId);
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .select("id");
      throwIfError(error);
      if (!data?.length)
        throw new Error("It may already be removed, or your access changed.");
      if (table === "community_group_posts") onRemoved();
      else {
        setRows((old) => old.filter((row) => row.id !== id));
        setRevision((old) => old + 1);
      }
    } catch (cause: any) {
      setError(`Could not remove this item. ${cause.message}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">
            {post.author?.full_name || "Neighbor"}
          </p>
          <time className="text-xs text-slate-500" dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleString()}
          </time>
        </div>
        {(post.author_id === userId || canManage) && (
          <button
            aria-label="Remove discussion"
            disabled={busy}
            onClick={() => void remove("community_group_posts", post.id)}
            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
        {post.content}
      </p>
      <button
        onClick={() => setOpen(!open)}
        className="mt-4 flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-purple-700"
        aria-expanded={open}
      >
        <MessageCircle size={17} />
        {open ? "Hide replies" : "Replies / Reply"}
      </button>
      {open && (
        <div className="mt-2 border-t pt-4">
          {rows.map((row) => (
            <div key={row.id} className="mb-3 rounded-xl bg-purple-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">
                  {row.author?.full_name || "Neighbor"}
                </p>
                {(row.author_id === userId || canManage) && (
                  <button
                    aria-label="Remove reply"
                    disabled={busy}
                    onClick={() =>
                      void remove("community_group_replies", row.id)
                    }
                    className="p-1 text-slate-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                {row.content}
              </p>
              <time className="text-[11px] text-slate-500">
                {new Date(row.created_at).toLocaleString()}
              </time>
            </div>
          ))}
          {loading && (
            <p role="status" className="py-2 text-sm text-slate-600">
              Loading replies…
            </p>
          )}
          {hasMore && (
            <button
              onClick={() => setLimit((old) => old + 20)}
              disabled={loading}
              className="mb-3 text-sm font-semibold text-purple-700"
            >
              Load earlier replies
            </button>
          )}
          <form onSubmit={reply}>
            <label className="block text-sm font-semibold">
              Your reply
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                rows={2}
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal"
                placeholder="Add to the conversation…"
              />
            </label>
            <button
              disabled={busy || !draft.trim()}
              className="mt-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Reply"}
            </button>
          </form>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}{" "}
          {open && (
            <button
              onClick={() => setRevision((old) => old + 1)}
              className="underline"
            >
              Refresh replies
            </button>
          )}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
    </article>
  );
}
