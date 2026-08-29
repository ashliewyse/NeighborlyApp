import React, { useEffect, useState } from "react";
import { ShieldAlert, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BlockedMemberRow {
  blocked_id: string;
  blocked_name: string;
  created_at: string;
}

export function BlockedMembersSettings() {
  const [rows, setRows] = useState<BlockedMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBlocks() {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("user_blocks")
      .select("blocked_id, blocked_name, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });
    if (loadError) {
      console.error("Could not load blocked members", loadError);
      setError("Blocked members could not be loaded.");
      setRows([]);
    } else {
      setRows((data || []) as BlockedMemberRow[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadBlocks(); }, []);

  async function unblock(row: BlockedMemberRow) {
    if (busyId) return;
    const confirmed = window.confirm(`Unblock ${row.blocked_name}? You may see each other's public activity again and direct messaging will be available.`);
    if (!confirmed) return;
    setBusyId(row.blocked_id);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again before changing blocked members.");
      setBusyId(null);
      return;
    }
    const { error: deleteError } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", row.blocked_id);
    if (deleteError) {
      console.error("Could not unblock member", deleteError);
      setError("That member could not be unblocked. Please try again.");
    } else {
      setRows((current) => current.filter((item) => item.blocked_id !== row.blocked_id));
    }
    setBusyId(null);
  }

  return (
    <section className="bg-white rounded-xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2"><ShieldAlert size={17} className="text-primary" /><h2 className="font-semibold">Blocked members</h2></div>
      <p className="text-sm text-muted-foreground">People you block cannot interact with you through Neighborly profiles, posts, comments, friend/follow connections, or direct messages. They are not notified when you block or unblock them.</p>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading blocked members…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">You have not blocked anyone.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.blocked_id} className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{row.blocked_name || "Blocked member"}</p>
                <p className="text-xs text-muted-foreground">Blocked {new Date(row.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => { void unblock(row); }} disabled={busyId === row.blocked_id} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><UserX size={14} /> Unblock</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
