import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StaffCapabilities = {
  is_admin: boolean;
  is_moderator: boolean;
  can_review_reports: boolean;
  can_view_blocks: boolean;
  can_remove_posts: boolean;
  can_remove_comments: boolean;
  can_warn_members: boolean;
};

type StaffMemberRow = {
  user_id: string;
  display_name: string;
  account_type: "personal" | "business";
  city: string | null;
  neighborhood: string | null;
  enforcement_state: "active" | "warned" | "suspended" | "banned";
  warning_count: number;
  open_report_count: number;
  is_admin: boolean;
  is_moderator: boolean;
};

type StaffActionRow = {
  action_id: string;
  target_user_id: string | null;
  target_name: string;
  action_type: string;
  note: string | null;
  created_at: string;
};

const EMPTY_CAPABILITIES: StaffCapabilities = {
  is_admin: false,
  is_moderator: false,
  can_review_reports: false,
  can_view_blocks: false,
  can_remove_posts: false,
  can_remove_comments: false,
  can_warn_members: false,
};

const ACTION_LABELS: Record<string, string> = {
  report_reviewing: "Marked a report reviewing",
  report_escalated: "Escalated a report",
  report_resolved: "Resolved a report",
  report_dismissed: "Dismissed a report",
  hide_post: "Hid a reported post",
  hide_comment: "Hid a reported comment",
  warn_member: "Warned a member",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action.replaceAll("_", " ");
}

function stateClasses(state: StaffMemberRow["enforcement_state"]) {
  if (state === "banned") return "bg-red-100 text-red-700";
  if (state === "suspended") return "bg-orange-100 text-orange-700";
  if (state === "warned") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

export function ModeratorMemberTools({
  onProfileOpen,
}: {
  onProfileOpen?: (name: string, userId: string) => void;
}) {
  const [capabilities, setCapabilities] = useState<StaffCapabilities>(EMPTY_CAPABILITIES);
  const [capabilitiesReady, setCapabilitiesReady] = useState(false);
  const [members, setMembers] = useState<StaffMemberRow[]>([]);
  const [actions, setActions] = useState<StaffActionRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase.rpc("my_staff_capabilities"),
      supabase.rpc("staff_my_recent_actions", { p_limit: 25 }),
    ]).then(([capabilityResult, actionResult]) => {
      if (cancelled) return;
      if (capabilityResult.error) {
        console.error("Could not load moderator permissions", capabilityResult.error);
        setCapabilities(EMPTY_CAPABILITIES);
        setError("Your moderator permissions could not be loaded.");
      } else {
        setCapabilities(((capabilityResult.data || [])[0] || EMPTY_CAPABILITIES) as StaffCapabilities);
      }
      if (actionResult.error) {
        console.error("Could not load moderator activity", actionResult.error);
      } else {
        setActions((actionResult.data || []) as StaffActionRow[]);
      }
      setCapabilitiesReady(true);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (!capabilitiesReady) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      const { data, error: memberError } = await supabase.rpc("staff_member_directory", {
        p_search: query.trim() || null,
      });
      if (cancelled) return;
      if (memberError) {
        console.error("Could not search members", memberError);
        setMembers([]);
        setError("Member search could not be loaded. Please refresh.");
      } else {
        setMembers((data || []) as StaffMemberRow[]);
      }
      setLoading(false);
    }, query ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [capabilitiesReady, query, refreshKey]);

  const permissionItems = useMemo(() => [
    ["Review safety reports", capabilities.can_review_reports],
    ["View member blocks", capabilities.can_view_blocks],
    ["Hide reported posts", capabilities.can_remove_posts],
    ["Hide reported comments", capabilities.can_remove_comments],
    ["Warn members", capabilities.can_warn_members],
  ] as const, [capabilities]);

  async function warnMember(member: StaffMemberRow) {
    if (!capabilities.can_warn_members || member.is_admin || busyId) return;
    const message = window.prompt(
      `Warning shown to ${member.display_name}:`,
      "Please review Neighborly Community Guidelines and keep future interactions respectful and safe.",
    );
    if (message === null) return;

    setBusyId(member.user_id);
    setError(null);
    setNotice(null);
    const { error: warningError } = await supabase.rpc("moderation_warn_member", {
      p_user_id: member.user_id,
      p_note: message.trim() || null,
    });
    if (warningError) {
      console.error("Could not warn member", warningError);
      setError(warningError.message || "That warning could not be sent.");
    } else {
      setNotice(`Warning sent to ${member.display_name}.`);
      setRefreshKey((value) => value + 1);
    }
    setBusyId(null);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-purple-950">
              <ShieldCheck size={18} /> Moderator tools
            </div>
            <p className="mt-1 text-xs leading-relaxed text-purple-800">
              Search approved Neighborly members, open their profiles, and use the actions your administrator assigned to you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-100"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {permissionItems.map(([label, enabled]) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-medium">
              {enabled ? <CheckCircle2 size={15} className="text-emerald-600" /> : <XCircle size={15} className="text-slate-400" />}
              <span className={enabled ? "text-slate-800" : "text-slate-500"}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky top-16 z-20 rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Search size={16} className="flex-shrink-0 text-purple-600" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member, business, city, or neighborhood…"
            aria-label="Search Neighborly members"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="rounded-lg px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50">
              Clear
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {loading ? "Searching members…" : query.trim() ? `${members.length} matching member${members.length === 1 ? "" : "s"}` : `${members.length} approved members loaded`}
        </p>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><UserRound size={17} /> Member search</h2>
        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No members match that search.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {members.map((member) => {
              const warningDisabled = !capabilities.can_warn_members || member.is_admin || ["suspended", "banned"].includes(member.enforcement_state);
              return (
                <article key={member.user_id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{member.display_name}</h3>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">{member.account_type}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${stateClasses(member.enforcement_state)}`}>{member.enforcement_state}</span>
                        {member.is_admin ? <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase text-purple-700">Admin</span> : null}
                        {member.is_moderator ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase text-amber-800">Moderator</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{[member.neighborhood, member.city].filter(Boolean).join(" · ") || "Location not set"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Warnings: {member.warning_count} · Open safety reports: {member.open_report_count}</p>
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                      {onProfileOpen ? (
                        <button
                          type="button"
                          onClick={() => onProfileOpen(member.display_name, member.user_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                        >
                          <UserRound size={14} /> View profile
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={warningDisabled || busyId === member.user_id}
                        onClick={() => { void warnMember(member); }}
                        title={member.is_admin ? "Administrator accounts cannot be warned" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ShieldAlert size={14} /> Warn member
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2"><History size={17} className="text-purple-700" /><h2 className="font-semibold">My recent moderation activity</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Only your own moderator actions are shown here.</p>
        <div className="mt-3 space-y-2">
          {actions.length === 0 ? (
            <p className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">You have not taken any moderation actions yet.</p>
          ) : actions.map((action) => (
            <div key={action.action_id} className="rounded-xl border border-border px-3 py-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p><strong>{actionLabel(action.action_type)}</strong>{action.target_user_id ? <> · {action.target_name}</> : null}</p>
                <p className="text-xs text-muted-foreground">{new Date(action.created_at).toLocaleString()}</p>
              </div>
              {action.note ? <p className="mt-1 text-xs text-muted-foreground">{action.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
