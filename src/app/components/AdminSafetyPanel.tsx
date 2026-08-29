import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Flag,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserX,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ReportStatus = "open" | "reviewing" | "escalated" | "resolved" | "dismissed";
type ReportReason =
  | "spam_scam"
  | "harassment_bullying"
  | "hate_threats"
  | "false_misleading"
  | "inappropriate"
  | "privacy"
  | "other";
type ReportTarget = "post" | "comment" | "profile" | "business" | "message";

type StaffCapabilities = {
  is_admin: boolean;
  is_moderator: boolean;
  can_review_reports: boolean;
  can_view_blocks: boolean;
  can_remove_posts: boolean;
  can_remove_comments: boolean;
  can_warn_members: boolean;
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

interface ReportRow {
  report_id: string;
  target_type: ReportTarget;
  reporter_id: string;
  reporter_name: string;
  reported_user_id: string | null;
  reported_name: string;
  reason: ReportReason;
  details: string | null;
  target_excerpt: string | null;
  status: ReportStatus;
  post_id: string | null;
  comment_id: string | null;
  message_id: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface BlockRow {
  blocker_id: string;
  blocker_name: string;
  blocked_id: string;
  blocked_name: string;
  created_at: string;
}

const REASON_LABELS: Record<ReportReason, string> = {
  spam_scam: "Spam or scam",
  harassment_bullying: "Harassment or bullying",
  hate_threats: "Hate, threats, or violence",
  false_misleading: "False or misleading information",
  inappropriate: "Inappropriate content",
  privacy: "Privacy concern",
  other: "Other",
};

const TARGET_LABELS: Record<ReportTarget, string> = {
  post: "Post",
  comment: "Comment",
  profile: "Profile",
  business: "Business",
  message: "Message",
};

function statusClasses(status: ReportStatus) {
  if (status === "resolved") return "bg-emerald-100 text-emerald-700";
  if (status === "dismissed") return "bg-slate-100 text-slate-600";
  if (status === "reviewing") return "bg-blue-100 text-blue-700";
  if (status === "escalated") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export function AdminSafetyPanel({
  onProfileOpen,
}: {
  onProfileOpen?: (name: string, userId: string) => void;
}) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [capabilities, setCapabilities] = useState<StaffCapabilities>(EMPTY_CAPABILITIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const capabilityResult = await supabase.rpc("my_staff_capabilities");
      if (cancelled) return;
      if (capabilityResult.error) {
        console.error("Could not load moderator permissions", capabilityResult.error);
        setCapabilities(EMPTY_CAPABILITIES);
        setReports([]);
        setBlocks([]);
        setError("Your moderation permissions could not be loaded. Please refresh.");
        setLoading(false);
        return;
      }

      const nextCapabilities = ((capabilityResult.data || [])[0] || EMPTY_CAPABILITIES) as StaffCapabilities;
      setCapabilities(nextCapabilities);

      const [reportResult, blockResult] = await Promise.all([
        nextCapabilities.can_review_reports
          ? supabase.rpc("staff_safety_reports")
          : Promise.resolve({ data: [], error: null }),
        nextCapabilities.can_view_blocks
          ? supabase.rpc("staff_recent_blocks")
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (cancelled) return;
      if (reportResult.error || blockResult.error) {
        console.error("Could not load Neighborly safety activity", reportResult.error || blockResult.error);
        setError("Safety activity could not be loaded. Please refresh.");
        setLoading(false);
        return;
      }

      setReports((reportResult.data || []) as ReportRow[]);
      setBlocks((blockResult.data || []) as BlockRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const openCount = useMemo(
    () => reports.filter((report) => ["open", "reviewing", "escalated"].includes(report.status)).length,
    [reports],
  );

  async function runReportAction(report: ReportRow, action: () => Promise<{ error: any }>, fallback: string) {
    if (busyId) return;
    setBusyId(report.report_id);
    setError(null);
    const result = await action();
    if (result.error) {
      console.error(fallback, result.error);
      setError(fallback);
    } else {
      setRefreshKey((value) => value + 1);
    }
    setBusyId(null);
  }

  function setReportStatus(report: ReportRow, status: Exclude<ReportStatus, "open">) {
    if (!capabilities.can_review_reports) return;
    void runReportAction(
      report,
      () => supabase.rpc("moderation_set_report_status", { p_report_id: report.report_id, p_status: status, p_note: null }),
      "That report could not be updated.",
    );
  }

  function warnMember(report: ReportRow) {
    if (!capabilities.can_warn_members || !report.reported_user_id) return;
    const note = window.prompt(
      `Warning for ${report.reported_name}:`,
      "Please review Neighborly Community Guidelines and keep future interactions respectful and safe.",
    );
    if (note === null) return;
    void runReportAction(
      report,
      () => supabase.rpc("moderation_warn_reported_member", { p_report_id: report.report_id, p_note: note.trim() || null }),
      "That member could not be warned.",
    );
  }

  function hideReportedContent(report: ReportRow) {
    const allowed = report.target_type === "post"
      ? capabilities.can_remove_posts
      : report.target_type === "comment"
        ? capabilities.can_remove_comments
        : false;
    if (!allowed) return;

    const label = report.target_type === "post" ? "post" : "comment";
    if (!window.confirm(`Hide this reported ${label}? It will disappear for regular members but stay in the moderation record.`)) return;
    const note = window.prompt("Optional moderation note:", `Hidden after reviewing a reported ${label}.`);
    if (note === null) return;
    const rpcName = report.target_type === "post" ? "moderation_hide_reported_post" : "moderation_hide_reported_comment";
    void runReportAction(
      report,
      () => supabase.rpc(rpcName, { p_report_id: report.report_id, p_note: note.trim() || null }),
      `That ${label} could not be hidden.`,
    );
  }

  const canHide = (report: ReportRow) =>
    (report.target_type === "post" && capabilities.can_remove_posts)
    || (report.target_type === "comment" && capabilities.can_remove_comments);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold text-red-900"><ShieldAlert size={18} /> Safety & Moderation</div>
          <p className="mt-1 text-xs leading-relaxed text-red-800">
            Reports can cover posts, comments, profiles, businesses, and private messages that a participant chooses to report. Your available actions match your assigned staff permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {capabilities.can_review_reports ? <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm">{openCount} need review</span> : null}
          <button onClick={() => setRefreshKey((value) => value + 1)} className="rounded-lg bg-white p-2 text-red-700 shadow-sm hover:bg-red-100" aria-label="Refresh safety activity"><RefreshCw size={16} /></button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{error}</p>}

      {capabilities.can_review_reports ? (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Flag size={17} /> Safety reports</h2>
          {loading ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">There are no safety reports right now.</div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article key={report.report_id} className={`rounded-2xl bg-white p-5 shadow-sm ${report.status === "escalated" ? "ring-2 ring-red-300" : ""}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase text-purple-700">{TARGET_LABELS[report.target_type]}</span>
                        <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase text-red-700">{REASON_LABELS[report.reason]}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusClasses(report.status)}`}>{report.status}</span>
                      </div>
                      <p className="mt-2 text-sm"><strong>{report.reporter_name}</strong> reported {report.target_type === "profile" || report.target_type === "business" ? "" : "content from "}<strong>{report.reported_name}</strong>.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reported {new Date(report.created_at).toLocaleString()}</p>
                    </div>
                    {onProfileOpen && report.reported_user_id ? (
                      <button type="button" onClick={() => onProfileOpen(report.reported_name, report.reported_user_id!)} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50">
                        <UserRound size={14} /> View member
                      </button>
                    ) : null}
                  </div>

                  {report.target_excerpt && (
                    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saved {TARGET_LABELS[report.target_type].toLowerCase()} snapshot</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">{report.target_excerpt}</p>
                    </div>
                  )}
                  {report.details && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Reporter details</p>
                      <p className="whitespace-pre-wrap text-sm text-amber-950">{report.details}</p>
                    </div>
                  )}

                  {!["resolved", "dismissed"].includes(report.status) && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      {report.status === "open" && (
                        <button onClick={() => setReportStatus(report, "reviewing")} disabled={busyId === report.report_id} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Eye size={14} /> Reviewing</button>
                      )}
                      {report.status !== "escalated" && (
                        <button onClick={() => setReportStatus(report, "escalated")} disabled={busyId === report.report_id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><AlertTriangle size={14} /> Escalate</button>
                      )}
                      {capabilities.can_warn_members && report.reported_user_id ? (
                        <button onClick={() => warnMember(report)} disabled={busyId === report.report_id} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"><ShieldCheck size={14} /> Warn member</button>
                      ) : null}
                      {canHide(report) ? (
                        <button onClick={() => hideReportedContent(report)} disabled={busyId === report.report_id} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"><UserX size={14} /> Hide {report.target_type}</button>
                      ) : null}
                      <button onClick={() => setReportStatus(report, "resolved")} disabled={busyId === report.report_id} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={14} /> Resolve</button>
                      <button onClick={() => setReportStatus(report, "dismissed")} disabled={busyId === report.report_id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><XCircle size={14} /> Dismiss</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        !loading && <div className="rounded-xl bg-white p-6 text-sm text-muted-foreground">Your moderator role does not include report review access.</div>
      )}

      {capabilities.can_view_blocks ? (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><ShieldAlert size={17} /> Recent member blocks</h2>
          {loading ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading blocks…</div>
          ) : blocks.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No members have blocked another member.</div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <article key={`${block.blocker_id}-${block.blocked_id}-${block.created_at}`} className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm"><strong>{block.blocker_name}</strong> blocked <strong>{block.blocked_name}</strong>.</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(block.created_at).toLocaleString()} · The blocked member was not notified.</p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
