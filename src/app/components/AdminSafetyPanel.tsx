import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Flag, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
type ReportReason =
  | "spam_scam"
  | "harassment_bullying"
  | "hate_threats"
  | "false_misleading"
  | "inappropriate"
  | "privacy"
  | "other";

interface ReportRow {
  id: string;
  post_id: string | null;
  reporter_id: string;
  reported_user_id: string | null;
  reason: ReportReason;
  details: string | null;
  post_excerpt: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface BlockRow {
  blocker_id: string;
  blocked_id: string;
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

function shortId(id?: string | null) {
  return id ? `${id.slice(0, 8)}…` : "Unknown member";
}

export function AdminSafetyPanel() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [reportResult, blockResult] = await Promise.all([
        supabase
          .from("post_reports")
          .select("id, post_id, reporter_id, reported_user_id, reason, details, post_excerpt, status, reviewed_by, reviewed_at, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (cancelled) return;
      if (reportResult.error || blockResult.error) {
        console.error("Could not load Neighborly safety activity", reportResult.error || blockResult.error);
        setError("Safety activity could not be loaded. Please refresh.");
        setLoading(false);
        return;
      }

      const nextReports = (reportResult.data || []) as ReportRow[];
      const nextBlocks = (blockResult.data || []) as BlockRow[];
      setReports(nextReports);
      setBlocks(nextBlocks);

      const ids = new Set<string>();
      nextReports.forEach((report) => {
        ids.add(report.reporter_id);
        if (report.reported_user_id) ids.add(report.reported_user_id);
      });
      nextBlocks.forEach((block) => {
        ids.add(block.blocker_id);
        ids.add(block.blocked_id);
      });

      const idList = [...ids];
      if (idList.length) {
        const [profileResult, businessResult] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", idList),
          supabase.from("business_profiles").select("user_id, business_name").in("user_id", idList),
        ]);
        if (!cancelled) {
          const nextNames: Record<string, string> = {};
          (profileResult.data || []).forEach((profile: any) => {
            nextNames[profile.id] = profile.full_name || "Member";
          });
          (businessResult.data || []).forEach((business: any) => {
            if (business.business_name) nextNames[business.user_id] = business.business_name;
          });
          setNames(nextNames);
        }
      } else {
        setNames({});
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const openCount = useMemo(
    () => reports.filter((report) => report.status === "open" || report.status === "reviewing").length,
    [reports],
  );

  async function setReportStatus(report: ReportRow, status: Exclude<ReportStatus, "open">) {
    if (busyId) return;
    setBusyId(report.id);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again before reviewing reports.");
      setBusyId(null);
      return;
    }
    const reviewedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("post_reports")
      .update({ status, reviewed_by: user.id, reviewed_at: reviewedAt })
      .eq("id", report.id)
      .select("id")
      .single();
    if (updateError) {
      console.error("Could not update post report", updateError);
      setError("That report could not be updated.");
    } else {
      setReports((current) => current.map((item) => item.id === report.id
        ? { ...item, status, reviewed_by: user.id, reviewed_at: reviewedAt }
        : item));
    }
    setBusyId(null);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold text-red-900"><ShieldAlert size={18} /> Safety & Moderation</div>
          <p className="mt-1 text-xs leading-relaxed text-red-800">Post reports and member blocks are private admin information. A blocked member is not notified that someone blocked them.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm">{openCount} need review</span>
          <button onClick={() => setRefreshKey((value) => value + 1)} className="rounded-lg bg-white p-2 text-red-700 shadow-sm hover:bg-red-100" aria-label="Refresh safety activity"><RefreshCw size={16} /></button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{error}</p>}

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Flag size={17} /> Post reports</h2>
        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No posts have been reported.</div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const reporterName = names[report.reporter_id] || shortId(report.reporter_id);
              const reportedName = report.reported_user_id ? names[report.reported_user_id] || shortId(report.reported_user_id) : "Deleted member";
              return (
                <article key={report.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase text-red-700">{REASON_LABELS[report.reason]}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${report.status === "resolved" ? "bg-emerald-100 text-emerald-700" : report.status === "dismissed" ? "bg-slate-100 text-slate-600" : report.status === "reviewing" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{report.status}</span>
                      </div>
                      <p className="mt-2 text-sm"><strong>{reporterName}</strong> reported a post by <strong>{reportedName}</strong>.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reported {new Date(report.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {report.post_excerpt && (
                    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saved post excerpt</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">{report.post_excerpt}</p>
                    </div>
                  )}
                  {report.details && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Reporter details</p>
                      <p className="whitespace-pre-wrap text-sm text-amber-950">{report.details}</p>
                    </div>
                  )}

                  {(report.status === "open" || report.status === "reviewing") && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      {report.status === "open" && (
                        <button onClick={() => { void setReportStatus(report, "reviewing"); }} disabled={busyId === report.id} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Eye size={14} /> Mark reviewing</button>
                      )}
                      <button onClick={() => { void setReportStatus(report, "resolved"); }} disabled={busyId === report.id} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={14} /> Resolve</button>
                      <button onClick={() => { void setReportStatus(report, "dismissed"); }} disabled={busyId === report.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><XCircle size={14} /> Dismiss</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><ShieldAlert size={17} /> Recent member blocks</h2>
        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading blocks…</div>
        ) : blocks.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No members have blocked another member.</div>
        ) : (
          <div className="space-y-2">
            {blocks.map((block) => (
              <article key={`${block.blocker_id}-${block.blocked_id}`} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm"><strong>{names[block.blocker_id] || shortId(block.blocker_id)}</strong> blocked <strong>{names[block.blocked_id] || shortId(block.blocked_id)}</strong>.</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(block.created_at).toLocaleString()} · The blocked member was not notified.</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
