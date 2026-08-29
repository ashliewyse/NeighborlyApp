import React, { useState } from "react";
import { Flag, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "@/lib/supabase";

type ReportTarget = "post" | "comment" | "profile" | "business" | "message";

type Props = {
  targetType: ReportTarget;
  targetId: string;
  label?: string;
  className?: string;
  compact?: boolean;
};

const REASONS = [
  ["spam_scam", "Spam or scam"],
  ["harassment_bullying", "Harassment or bullying"],
  ["hate_threats", "Hate, threats, or violence"],
  ["false_misleading", "False or misleading information"],
  ["inappropriate", "Inappropriate content"],
  ["privacy", "Privacy concern"],
  ["other", "Other"],
] as const;

const LABELS: Record<ReportTarget, string> = {
  post: "post",
  comment: "comment",
  profile: "profile",
  business: "business",
  message: "message",
};

export function SafetyReportButton({ targetType, targetId, label, className = "", compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam_scam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !targetId) return;
    setBusy(true);
    setError(null);

    const payload: Record<string, unknown> = {
      target_type: targetType,
      reason,
      details: details.trim() || null,
    };
    if (targetType === "post") payload.post_id = targetId;
    else if (targetType === "comment") payload.comment_id = targetId;
    else if (targetType === "message") payload.message_id = targetId;
    else payload.reported_user_id = targetId;

    const { error: insertError } = await supabase.from("safety_reports").insert(payload);
    setBusy(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setSuccess(true);
        setError(null);
      } else {
        console.error("Could not submit safety report", insertError);
        setError(insertError.message?.includes("Report limit reached")
          ? "You have submitted several reports recently. Please wait a little while and try again."
          : `That ${LABELS[targetType]} could not be reported. Please try again.`);
      }
      return;
    }

    setSuccess(true);
    setDetails("");
  }

  function resetAndClose() {
    if (busy) return;
    setOpen(false);
    window.setTimeout(() => {
      setSuccess(false);
      setError(null);
      setDetails("");
      setReason("spam_scam");
    }, 150);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null); setSuccess(false); }}
        className={className || (compact
          ? "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
          : "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700")}
        aria-label={label || `Report ${LABELS[targetType]}`}
      >
        <Flag size={compact ? 12 : 15} /> {label || `Report ${LABELS[targetType]}`}
      </button>

      <Dialog.Root open={open} onOpenChange={(next) => { if (!next) resetAndClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[min(34rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl" aria-describedby={undefined}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <Flag size={18} className="text-red-600" /> Report {LABELS[targetType]}
              </Dialog.Title>
              <button type="button" onClick={resetAndClose} disabled={busy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50" aria-label="Close report">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(event) => { void submit(event); }} className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
                This sends the {LABELS[targetType]} to Neighborly's safety team for review. The person you report is not told who submitted the report.
              </div>

              {!success ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why are you reporting this?</label>
                    <select value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30 disabled:opacity-50">
                      {REASONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional details <span className="font-normal normal-case">(optional)</span></label>
                    <textarea rows={4} maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} disabled={busy} placeholder="Tell the safety team what happened." className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30 disabled:opacity-50" />
                    <p className="mt-1 text-right text-[11px] text-muted-foreground">{details.length}/1000</p>
                  </div>
                  {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={resetAndClose} disabled={busy} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={busy} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy ? "Sending…" : "Send report"}</button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Report received. Thank you for helping keep Neighborly safe.</p>
                  <button type="button" onClick={resetAndClose} className="w-full rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800">Done</button>
                </div>
              )}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
