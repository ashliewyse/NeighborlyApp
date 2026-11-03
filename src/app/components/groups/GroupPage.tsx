import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { UUID_PATTERN } from "@/lib/sharing.mjs";
import { ShareButton } from "../ShareButton";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { DiscussionThread } from "./DiscussionThread";
import {
  requireCurrentMember,
  throwIfError,
  type GroupInfo,
  type Discussion,
} from "./group-api";

export function GroupPageRoute() {
  const { groupId = "" } = useParams();
  const { user } = useAuth();
  return <GroupPage key={`${groupId}:${user?.id}`} groupId={groupId} />;
}

export function GroupPage({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const userId = user?.id || "";
  const [group, setGroup] = useState<GroupInfo | null>(null),
    [joined, setJoined] = useState(false),
    [admin, setAdmin] = useState(false);
  const [invite, setInvite] = useState<{ id: string } | null>(null),
    [posts, setPosts] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(""),
    [limit, setLimit] = useState(20),
    [hasMore, setHasMore] = useState(false);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const current = ++sequence.current;
    if (!userId || !UUID_PATTERN.test(groupId)) {
      setLoading(false);
      setGroup(null);
      return;
    }
    setError("");
    try {
      const [info, membership, invitation, staff] = await Promise.all([
        supabase
          .from("community_groups_directory")
          .select("id,name,description,emoji,city,created_by,member_count")
          .eq("id", groupId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("community_group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("community_group_invites")
          .select("id")
          .eq("group_id", groupId)
          .eq("invitee_id", userId)
          .eq("status", "pending")
          .maybeSingle(),
        supabase
          .from("site_admins")
          .select("enabled")
          .eq("user_id", userId)
          .eq("enabled", true)
          .maybeSingle(),
      ]);
      throwIfError(info.error);
      throwIfError(membership.error);
      throwIfError(invitation.error);
      if (current !== sequence.current) return;
      setGroup(info.data as GroupInfo | null);
      setJoined(!!membership.data);
      setInvite(invitation.data);
      setAdmin(!!staff.data?.enabled);
      if (!info.data || !membership.data) {
        setPosts([]);
        setHasMore(false);
        return;
      }
      const { data, error } = await supabase
        .from("community_group_posts")
        .select(
          "id,group_id,author_id,content,created_at,author:profiles(full_name,avatar_url)",
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);
      throwIfError(error);
      if (current !== sequence.current) return;
      setPosts((data || []).slice(0, limit) as unknown as Discussion[]);
      setHasMore((data || []).length > limit);
    } catch (cause: any) {
      if (current === sequence.current)
        setError(
          `The group could not be loaded. ${cause.message || "Please try again."}`,
        );
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [groupId, userId, limit]);
  useEffect(() => {
    void reload();
    return () => {
      sequence.current++;
    };
  }, [reload]);
  useEffect(() => {
    const timer = window.setInterval(() => void reload(), 30000);
    return () => clearInterval(timer);
  }, [reload]);

  async function changeMembership(action: "join" | "leave" | "decline") {
    if (busy) return;
    if (
      action === "leave" &&
      !window.confirm(
        "Leave this group? You will need to join again to read its discussions.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requireCurrentMember(userId);
      if (invite && (action === "join" || action === "decline")) {
        const { error } = await supabase.rpc("respond_to_group_invite", {
          p_invite_id: invite.id,
          p_accept: action === "join",
        });
        throwIfError(error);
      } else if (action === "join") {
        const { error } = await supabase
          .from("community_group_members")
          .insert({ group_id: groupId, user_id: userId });
        if (error?.code !== "23505") throwIfError(error);
      } else if (action === "leave") {
        const { error } = await supabase
          .from("community_group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", userId);
        throwIfError(error);
        setJoined(false);
        setPosts([]);
        setDraft("");
      }
      setNotice(
        action === "join"
          ? "You joined the group."
          : action === "leave"
            ? "You left the group."
            : "Invitation declined.",
      );
      await reload();
    } catch (cause: any) {
      setError(
        `That change was not saved. ${cause.message || "Please try again."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requireCurrentMember(userId);
      const { error } = await supabase
        .from("community_group_posts")
        .insert({
          group_id: groupId,
          author_id: userId,
          content: draft.trim(),
        });
      throwIfError(error);
      setDraft("");
      setNotice("Discussion posted.");
      await reload();
    } catch (cause: any) {
      setError(
        `Your discussion was not saved. ${cause.message || "Please try again."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-[100dvh] bg-purple-50 px-4 py-6 font-['DM_Sans',sans-serif] text-slate-900 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-purple-800"
        >
          <ArrowLeft size={17} />
          Back to Neighborly
        </Link>
        {loading ? (
          <p role="status" className="py-12 text-center">
            Loading group…
          </p>
        ) : !group ? (
          <section className="mt-5 rounded-2xl bg-white p-6">
            <h1 className="text-xl font-bold">
              {error ? "Unable to load this group" : "Group unavailable"}
            </h1>
            <p className="mt-2 text-sm">
              {error ||
                "This group may have been removed or is not available to your account."}
            </p>
            <button
              onClick={() => void reload()}
              className="mt-4 font-bold text-purple-700"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <header className="mt-5 rounded-3xl border border-purple-100 bg-white p-5 shadow-sm sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                Community group · {group.city}
              </p>
              <h1 className="mt-3 break-words font-['Playfair_Display',serif] text-2xl font-bold sm:text-3xl">
                <span aria-hidden="true">{group.emoji}</span> {group.name}
              </h1>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {group.description}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <Users size={16} />
                {group.member_count}{" "}
                {group.member_count === 1 ? "member" : "members"}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {joined ? (
                  <>
                    <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
                      Joined
                    </span>
                    <InviteMemberDialog groupId={groupId} userId={userId} />
                    <button
                      disabled={busy}
                      onClick={() => void changeMembership("leave")}
                      className="rounded-xl border px-4 py-2.5 text-sm text-slate-600 disabled:opacity-50"
                    >
                      Leave group
                    </button>
                  </>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => void changeMembership("join")}
                    className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Join group"}
                  </button>
                )}
                <ShareButton
                  kind="group"
                  itemId={groupId}
                  label="Share group"
                />
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Neighborly members can join. Discussions are visible to group
                members.
              </p>
            </header>
            {invite && (
              <section className="mt-4 rounded-2xl border border-purple-200 bg-white p-4">
                <p className="text-sm font-bold">
                  You have been invited to this group.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => void changeMembership("join")}
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white"
                  >
                    Accept invitation
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void changeMembership("decline")}
                    className="rounded-lg border px-4 py-2 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </section>
            )}
            {notice && (
              <p
                role="status"
                className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"
              >
                {notice}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"
              >
                {error}{" "}
                <button
                  onClick={() => void reload()}
                  className="font-bold underline"
                >
                  Retry
                </button>
              </p>
            )}
            <div className="mb-4 mt-7 flex items-center justify-between">
              <h2 className="text-xl font-bold">Discussion</h2>
              <button
                onClick={() => void reload()}
                className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm font-semibold text-purple-700"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
            {joined ? (
              <>
                <form
                  onSubmit={publish}
                  className="mb-5 rounded-2xl border border-purple-100 bg-white p-4"
                >
                  <label className="block text-sm font-bold">
                    Start a discussion
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      placeholder="Ask a question or share an update with your group…"
                      className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm font-normal"
                    />
                  </label>
                  <button
                    disabled={busy || !draft.trim()}
                    className="mt-3 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Post discussion"}
                  </button>
                </form>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <DiscussionThread
                      key={post.id}
                      post={post}
                      userId={userId}
                      canManage={admin || group.created_by === userId}
                      onRemoved={() => void reload()}
                    />
                  ))}
                </div>
                {!posts.length && !error && (
                  <p className="rounded-2xl border border-dashed border-purple-200 p-7 text-center text-sm text-slate-600">
                    No discussions yet. Start the first conversation.
                  </p>
                )}
                {hasMore && (
                  <button
                    onClick={() => setLimit((old) => old + 20)}
                    className="mx-auto mt-5 block rounded-xl border bg-white px-5 py-3 font-semibold text-purple-700"
                  >
                    Load more discussions
                  </button>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-purple-200 bg-white p-7 text-center text-sm text-slate-600">
                Join this group to read discussions, post and reply.
              </p>
            )}
            <p className="py-7 text-center text-xs text-slate-600">
              Need help or want to report a concern?{" "}
              <Link to="/help" className="font-bold text-purple-700 underline">
                Help & Support
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
