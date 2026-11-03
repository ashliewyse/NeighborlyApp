import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requireCurrentMember, throwIfError } from "./group-api";

export function InviteMemberDialog({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const [rows, setRows] = useState<
      { id: string; full_name: string; city: string }[]
    >([]),
    [loading, setLoading] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [sent, setSent] = useState<Set<string>>(new Set());
  const request = useRef(0);
  useEffect(() => {
    const version = ++request.current;
    setRows([]);
    setError("");
    if (!open || search.trim().length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const term = search.trim().replace(/[\\%_]/g, "\\$&");
        const [people, members] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,full_name,city")
            .ilike("full_name", `%${term}%`)
            .neq("id", userId)
            .order("full_name")
            .limit(20),
          supabase
            .from("community_group_members")
            .select("user_id")
            .eq("group_id", groupId),
        ]);
        throwIfError(people.error);
        throwIfError(members.error);
        const joined = new Set((members.data || []).map((row) => row.user_id));
        if (version === request.current)
          setRows((people.data || []).filter((row) => !joined.has(row.id)));
      } catch {
        if (version === request.current)
          setError("Members could not be searched. Please try again.");
      } finally {
        if (version === request.current) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      request.current++;
    };
  }, [open, search, groupId, userId]);
  async function invite(recipient: string) {
    if (busy) return;
    setBusy(recipient);
    setError("");
    setNotice("");
    try {
      await requireCurrentMember(userId);
      const { error } = await supabase
        .from("community_group_invites")
        .insert({
          group_id: groupId,
          inviter_id: userId,
          invitee_id: recipient,
        });
      if (error?.code === "23505") {
        setNotice("That member has already been invited to this group.");
        setSent((old) => new Set([...old, recipient]));
        return;
      }
      throwIfError(error);
      setSent((old) => new Set([...old, recipient]));
      setNotice(
        "Invitation sent. They can accept or decline from Notifications.",
      );
    } catch (cause: any) {
      setError(
        `Invitation was not sent. ${cause.message || "Please try again."}`,
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-purple-800">
          <UserPlus size={17} />
          Invite a member
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] max-h-[85dvh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
          <div className="flex justify-between">
            <Dialog.Title className="text-lg font-bold">
              Invite a Neighborly member
            </Dialog.Title>
            <Dialog.Close aria-label="Close invitations" className="p-1">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            Search by name. Your invitation appears in their Notifications;
            joining is their choice.
          </Dialog.Description>
          <label className="mt-4 block text-sm font-semibold">
            Member name
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter at least 2 letters"
              className="mt-1 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          {loading ? (
            <p role="status" className="py-4 text-sm">
              Searching…
            </p>
          ) : search.trim().length >= 2 && !error && rows.length === 0 ? (
            <p className="py-4 text-sm text-slate-600">
              No matching members available to invite.
            </p>
          ) : null}
          <ul className="mt-3 divide-y">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {row.full_name || "Neighbor"}
                  </p>
                  <p className="text-xs text-slate-600">{row.city}</p>
                </div>
                <button
                  onClick={() => void invite(row.id)}
                  disabled={!!busy || sent.has(row.id)}
                  className="rounded-lg bg-purple-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {sent.has(row.id)
                    ? "Invited"
                    : busy === row.id
                      ? "Sending…"
                      : "Invite"}
                </button>
              </li>
            ))}
          </ul>
          {notice && (
            <p role="status" className="mt-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
