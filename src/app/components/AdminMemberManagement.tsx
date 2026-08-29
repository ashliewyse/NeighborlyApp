import React, { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MemberRow {
  user_id: string;
  display_name: string;
  email: string | null;
  account_type: "personal" | "business";
  city: string | null;
  neighborhood: string | null;
  access_status: "pending" | "approved" | "declined" | null;
  enforcement_state: "active" | "warned" | "suspended" | "banned";
  public_reason: string | null;
  warning_count: number;
  suspended_until: string | null;
  is_admin: boolean;
  is_moderator: boolean;
  can_review_reports: boolean;
  can_view_blocks: boolean;
  can_remove_posts: boolean;
  can_remove_comments: boolean;
  can_warn_members: boolean;
  open_report_count: number;
}

type PermissionKey =
  | "can_review_reports"
  | "can_view_blocks"
  | "can_remove_posts"
  | "can_remove_comments"
  | "can_warn_members";

type SafetyHistory = {
  reports: Array<{
    id: string;
    target_type: string;
    reason: string;
    status: string;
    reporter_name: string;
    target_excerpt: string | null;
    details: string | null;
    created_at: string;
    reviewed_at: string | null;
  }>;
  blocks: Array<{
    direction: "blocked_by_member" | "member_was_blocked";
    other_user_id: string;
    other_name: string;
    created_at: string;
  }>;
  actions: Array<{
    id: string;
    action_type: string;
    actor_name: string;
    note: string | null;
    created_at: string;
  }>;
};

type AuditRow = {
  action_id: string;
  actor_user_id: string;
  actor_name: string;
  target_user_id: string | null;
  target_name: string;
  action_type: string;
  note: string | null;
  created_at: string;
};

const PERMISSION_LABELS: Array<[PermissionKey, string]> = [
  ["can_review_reports", "Review reports"],
  ["can_view_blocks", "View block activity"],
  ["can_remove_posts", "Hide reported posts"],
  ["can_remove_comments", "Hide reported comments"],
  ["can_warn_members", "Warn members"],
];

const ACTION_LABELS: Record<string, string> = {
  report_reviewing: "Marked report reviewing",
  report_escalated: "Escalated report",
  report_resolved: "Resolved report",
  report_dismissed: "Dismissed report",
  hide_post: "Hid reported post",
  hide_comment: "Hid reported comment",
  restore_post: "Restored post",
  restore_comment: "Restored comment",
  warn_member: "Warned member",
  suspend_member: "Suspended member",
  ban_member: "Banned member",
  restore_member: "Restored member",
  grant_moderator: "Granted moderator access",
  revoke_moderator: "Removed moderator access",
  update_moderator_permissions: "Changed moderator permissions",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action.replaceAll("_", " ");
}

function enforcementClasses(state: MemberRow["enforcement_state"]) {
  if (state === "banned") return "bg-red-100 text-red-700";
  if (state === "suspended") return "bg-orange-100 text-orange-700";
  if (state === "warned") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function AdminMemberManagement({
  onProfileOpen,
}: {
  onProfileOpen?: (name: string, userId: string) => void;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);
  const [histories, setHistories] = useState<Record<string, SafetyHistory>>({});
  const [recentActions, setRecentActions] = useState<AuditRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      const [directoryResult, auditResult] = await Promise.all([
        supabase.rpc("admin_member_directory", { p_search: query.trim() || null }),
        supabase.rpc("admin_recent_moderation_actions", { p_limit: 30 }),
      ]);
      if (cancelled) return;
      if (directoryResult.error) {
        console.error("Could not load member directory", directoryResult.error);
        setMembers([]);
        setError("The member directory could not be loaded.");
      } else {
        setMembers((directoryResult.data || []) as MemberRow[]);
      }
      if (auditResult.error) {
        console.error("Could not load moderation audit log", auditResult.error);
      } else {
        setRecentActions((auditResult.data || []) as AuditRow[]);
      }
      setLoading(false);
    }, query ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, refreshKey]);

  const moderatorCount = useMemo(() => members.filter((member) => member.is_moderator).length, [members]);
  const restrictedCount = useMemo(() => members.filter((member) => ["suspended", "banned"].includes(member.enforcement_state)).length, [members]);

  async function saveModerator(member: MemberRow, enabled: boolean, changed?: Partial<Record<PermissionKey, boolean>>) {
    if (busyId) return;
    setBusyId(member.user_id);
    setError(null);
    const permissions = {
      can_review_reports: enabled ? (changed?.can_review_reports ?? member.can_review_reports ?? true) : member.can_review_reports,
      can_view_blocks: enabled ? (changed?.can_view_blocks ?? member.can_view_blocks ?? true) : member.can_view_blocks,
      can_remove_posts: enabled ? (changed?.can_remove_posts ?? member.can_remove_posts ?? true) : member.can_remove_posts,
      can_remove_comments: enabled ? (changed?.can_remove_comments ?? member.can_remove_comments ?? true) : member.can_remove_comments,
      can_warn_members: enabled ? (changed?.can_warn_members ?? member.can_warn_members ?? true) : member.can_warn_members,
    };

    if (enabled && !member.is_moderator) {
      permissions.can_review_reports = true;
      permissions.can_view_blocks = true;
      permissions.can_remove_posts = true;
      permissions.can_remove_comments = true;
      permissions.can_warn_members = true;
    }

    const { error: saveError } = await supabase.rpc("set_moderator_access", {
      p_user_id: member.user_id,
      p_enabled: enabled,
      p_can_review_reports: permissions.can_review_reports,
      p_can_view_blocks: permissions.can_view_blocks,
      p_can_remove_posts: permissions.can_remove_posts,
      p_can_remove_comments: permissions.can_remove_comments,
      p_can_warn_members: permissions.can_warn_members,
    });

    if (saveError) {
      console.error("Could not update moderator access", saveError);
      setError(saveError.message || "Moderator access could not be updated.");
    } else {
      setHistories((current) => {
        const next = { ...current };
        delete next[member.user_id];
        return next;
      });
      setRefreshKey((value) => value + 1);
    }
    setBusyId(null);
  }

  async function setMemberStatus(member: MemberRow, state: "active" | "warned" | "suspended" | "banned") {
    if (busyId || member.is_admin) return;

    let publicReason: string | null = null;
    let internalNote: string | null = null;
    let suspendedUntil: string | null = null;

    if (state === "active") {
      if (!window.confirm(`Restore ${member.display_name} to normal Neighborly access?`)) return;
      publicReason = "Your Neighborly account is active again.";
      internalNote = "Account restored by Neighborly Admin.";
    } else if (state === "warned") {
      const reason = window.prompt(
        `Warning shown to ${member.display_name}:`,
        "Please review Neighborly Community Guidelines and keep future interactions respectful and safe.",
      );
      if (reason === null) return;
      publicReason = reason.trim() || "Please review Neighborly Community Guidelines.";
      internalNote = window.prompt("Optional private admin note:", "")?.trim() || null;
    } else if (state === "suspended") {
      const reason = window.prompt(
        `Reason shown to ${member.display_name}:`,
        "Your Neighborly account has been temporarily suspended while a community safety concern is reviewed.",
      );
      if (reason === null) return;
      if (!window.confirm("Suspend this account for 7 days?")) return;
      publicReason = reason.trim() || "Your Neighborly account has been temporarily suspended.";
      internalNote = window.prompt("Optional private admin note:", "")?.trim() || null;
      suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      const reason = window.prompt(
        `Reason shown to ${member.display_name}:`,
        "Your Neighborly account has been restricted for violating Community Guidelines.",
      );
      if (reason === null) return;
      if (!window.confirm(`Ban ${member.display_name}? They will not be able to enter Neighborly until an administrator restores the account.`)) return;
      publicReason = reason.trim() || "Your Neighborly account has been restricted by an administrator.";
      internalNote = window.prompt("Optional private admin note:", "")?.trim() || null;
    }

    setBusyId(member.user_id);
    setError(null);
    const { error: statusError } = await supabase.rpc("admin_set_member_status", {
      p_user_id: member.user_id,
      p_state: state,
      p_public_reason: publicReason,
      p_internal_note: internalNote,
      p_suspended_until: suspendedUntil,
    });
    if (statusError) {
      console.error("Could not update member status", statusError);
      setError(statusError.message || "That member's account status could not be updated.");
    } else {
      setHistories((current) => {
        const next = { ...current };
        delete next[member.user_id];
        return next;
      });
      setRefreshKey((value) => value + 1);
    }
    setBusyId(null);
  }

  async function toggleSafetyHistory(member: MemberRow) {
    if (expandedMemberId === member.user_id) {
      setExpandedMemberId(null);
      return;
    }
    setExpandedMemberId(member.user_id);
    if (histories[member.user_id]) return;

    setHistoryBusyId(member.user_id);
    setError(null);
    const { data, error: historyError } = await supabase.rpc("admin_member_safety_summary", {
      p_user_id: member.user_id,
    });
    if (historyError) {
      console.error("Could not load member safety history", historyError);
      setError(`Safety history for ${member.display_name} could not be loaded.`);
    } else {
      const safeData = (data || { reports: [], blocks: [], actions: [] }) as SafetyHistory;
      setHistories((current) => ({ ...current, [member.user_id]: safeData }));
    }
    setHistoryBusyId(null);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-purple-950"><UserCog size={18} /> Members & Moderators</div>
            <p className="mt-1 text-xs leading-relaxed text-purple-800">Manage moderator permissions, warnings, temporary suspensions, bans, and member safety history without opening Supabase.</p>
          </div>
          <button type="button" onClick={() => { setHistories({}); setRefreshKey((value) => value + 1); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-100"><RefreshCw size={15} /> Refresh</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
          <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Moderators</p><p className="mt-1 text-xl font-bold text-purple-700">{moderatorCount}</p></div>
          <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Restricted</p><p className="mt-1 text-xl font-bold text-red-700">{restrictedCount}</p></div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">
        <Search size={16} className="text-muted-foreground" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, business, or email…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading members…</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No members match that search.</div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const busy = busyId === member.user_id;
            const historyOpen = expandedMemberId === member.user_id;
            const history = histories[member.user_id];
            return (
              <article key={member.user_id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{member.display_name}</h3>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">{member.account_type}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${enforcementClasses(member.enforcement_state)}`}>{member.enforcement_state}</span>
                      {member.is_admin && <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase text-purple-700">Admin</span>}
                      {member.is_moderator && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase text-amber-800">Moderator</span>}
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{member.email || "No email shown"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{[member.neighborhood, member.city].filter(Boolean).join(" · ") || "Location not set"} · Access: {member.access_status || "unknown"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Warnings: {member.warning_count} · Open safety reports: {member.open_report_count}</p>
                    {member.suspended_until && member.enforcement_state === "suspended" ? <p className="mt-1 text-xs font-medium text-orange-700">Suspended until {new Date(member.suspended_until).toLocaleString()}</p> : null}
                    {member.public_reason ? <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-foreground/75">{member.public_reason}</p> : null}
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    {onProfileOpen ? <button type="button" onClick={() => onProfileOpen(member.display_name, member.user_id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50">View profile</button> : null}
                    <button type="button" onClick={() => { void toggleSafetyHistory(member); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <History size={14} /> Safety history {historyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {!member.is_admin && member.access_status === "approved" ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold"><Shield size={16} className="text-amber-600" /> Moderator access</div>
                      <button type="button" disabled={busy} onClick={() => { void saveModerator(member, !member.is_moderator); }} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${member.is_moderator ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-amber-500 text-amber-950 hover:bg-amber-400"}`}>
                        {member.is_moderator ? "Remove moderator" : "Grant moderator"}
                      </button>
                    </div>
                    {member.is_moderator ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {PERMISSION_LABELS.map(([key, label]) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                            <input
                              type="checkbox"
                              checked={member[key]}
                              disabled={busy}
                              onChange={(event) => { void saveModerator(member, true, { [key]: event.target.checked }); }}
                              className="h-4 w-4"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!member.is_admin ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <button type="button" disabled={busy} onClick={() => { void setMemberStatus(member, "warned"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"><ShieldAlert size={14} /> Warn</button>
                    <button type="button" disabled={busy} onClick={() => { void setMemberStatus(member, "suspended"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"><Clock3 size={14} /> Suspend 7 days</button>
                    <button type="button" disabled={busy} onClick={() => { void setMemberStatus(member, "banned"); }} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"><Ban size={14} /> Ban</button>
                    {member.enforcement_state !== "active" ? <button type="button" disabled={busy} onClick={() => { void setMemberStatus(member, "active"); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={14} /> Restore access</button> : null}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-800"><ShieldCheck size={14} /> Administrator accounts are protected from moderator and enforcement controls here.</div>
                )}

                {historyOpen ? (
                  <div className="mt-4 border-t border-border pt-4">
                    {historyBusyId === member.user_id ? (
                      <p className="text-sm text-muted-foreground">Loading safety history…</p>
                    ) : history ? (
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-red-800">Reports against member ({history.reports.length})</h4>
                          <div className="mt-2 space-y-2">
                            {history.reports.length === 0 ? <p className="text-xs text-muted-foreground">No reports.</p> : history.reports.map((report) => (
                              <div key={report.id} className="rounded-lg bg-white p-2.5 text-xs">
                                <p className="font-semibold capitalize">{report.target_type} · {report.reason.replaceAll("_", " ")} · {report.status}</p>
                                <p className="mt-1 text-muted-foreground">Reported by {report.reporter_name} · {new Date(report.created_at).toLocaleString()}</p>
                                {report.target_excerpt ? <p className="mt-1 line-clamp-3 text-foreground/75">{report.target_excerpt}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-800">Block history ({history.blocks.length})</h4>
                          <div className="mt-2 space-y-2">
                            {history.blocks.length === 0 ? <p className="text-xs text-muted-foreground">No block history.</p> : history.blocks.map((block, index) => (
                              <div key={`${block.other_user_id}-${block.created_at}-${index}`} className="rounded-lg bg-white p-2.5 text-xs">
                                <p className="font-semibold">{block.direction === "blocked_by_member" ? `Blocked ${block.other_name}` : `Blocked by ${block.other_name}`}</p>
                                <p className="mt-1 text-muted-foreground">{new Date(block.created_at).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-800">Staff actions ({history.actions.length})</h4>
                          <div className="mt-2 space-y-2">
                            {history.actions.length === 0 ? <p className="text-xs text-muted-foreground">No staff actions.</p> : history.actions.map((action) => (
                              <div key={action.id} className="rounded-lg bg-white p-2.5 text-xs">
                                <p className="font-semibold">{actionLabel(action.action_type)}</p>
                                <p className="mt-1 text-muted-foreground">{action.actor_name} · {new Date(action.created_at).toLocaleString()}</p>
                                {action.note ? <p className="mt-1 text-foreground/75">{action.note}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No safety history loaded.</p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2"><History size={17} className="text-purple-700" /><h2 className="font-semibold">Recent moderation activity</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">A private audit trail of moderator and administrator safety actions.</p>
        <div className="mt-3 space-y-2">
          {recentActions.length === 0 ? <p className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">No moderation actions have been recorded yet.</p> : recentActions.map((action) => (
            <div key={action.action_id} className="rounded-xl border border-border px-3 py-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p><strong>{action.actor_name}</strong> · {actionLabel(action.action_type)}{action.target_user_id ? <> · <strong>{action.target_name}</strong></> : null}</p>
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
