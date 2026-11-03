import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Users } from "lucide-react";
import { loadGroupInvites, type GroupInvite } from "./group-api";

export function useGroupInvitations(userId?: string, open = false) {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    if (!userId) {
      setInvites([]);
      setError("");
      return;
    }
    try {
      const rows = await loadGroupInvites(userId);
      if (current === sequence.current) {
        setInvites(rows);
        setError("");
      }
    } catch {
      if (current === sequence.current)
        setError("Group invitations could not be loaded.");
    }
  }, [userId]);
  useEffect(() => {
    setInvites([]);
    setError("");
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => {
      sequence.current++;
      window.clearInterval(timer);
    };
  }, [refresh, open]);
  return { invites, error, refresh };
}

export function GroupInvitationList({
  invites,
  error,
  onRetry,
}: {
  invites: GroupInvite[];
  error: string;
  onRetry: () => void;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="border-b bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          {error}{" "}
          <button className="font-bold underline" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      {invites.map((invite) => (
        <Link
          key={invite.id}
          to={`/groups/${invite.group_id}`}
          className="flex items-start gap-3 border-b bg-purple-50 px-4 py-3 text-sm hover:bg-purple-100"
        >
          <Users size={19} className="mt-1 shrink-0 text-purple-700" />
          <span>
            <strong>{invite.inviter?.full_name || "A neighbor"}</strong> invited
            you to <strong>{invite.group?.name || "a community group"}</strong>.
            <span className="mt-1 block text-xs font-semibold text-purple-700">
              View invitation
            </span>
          </span>
        </Link>
      ))}
    </>
  );
}
