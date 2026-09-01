import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPin, Merge, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AreaReviewRow = {
  id: string;
  user_id: string;
  user_name: string;
  area_type: "city" | "neighborhood";
  city: string;
  entered_name: string;
  existing_name: string;
  similarity_score: number;
  status: "pending" | "keep_separate" | "merged";
  created_at: string;
};

export function AreaReviewPanel() {
  const [rows, setRows] = useState<AreaReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("area_review_requests")
      .select("id,user_id,user_name,area_type,city,entered_name,existing_name,similarity_score,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (loadError) {
      setError("Could not load possible duplicate areas.");
      setRows([]);
    } else {
      setRows((data || []) as AreaReviewRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function resolve(row: AreaReviewRow, status: "keep_separate" | "merged") {
    setBusyId(row.id);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("area_review_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: authData.user?.id || null,
      })
      .eq("id", row.id)
      .eq("status", "pending");

    if (updateError) {
      setError("That area review could not be updated. Please try again.");
      setBusyId(null);
      return;
    }

    setRows((current) => current.filter((candidate) => candidate.id !== row.id));
    setBusyId(null);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-purple-700" />
              <h2 className="font-semibold">Area & neighborhood review</h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              Neighborly automatically uses an existing city or neighborhood when the spelling matches. Names that are only similar are held here for you to review so accidental duplicates do not quietly build up.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadRows()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">Checking for possible duplicate areas…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
          <p className="mt-2 font-semibold text-emerald-950">No possible duplicate areas to review</p>
          <p className="mt-1 text-sm text-emerald-800">New cities and neighborhoods can continue being added automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const percent = Math.round(Number(row.similarity_score || 0) * 100);
            return (
              <article key={row.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700"><AlertTriangle size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">Possible duplicate {row.area_type}</h3>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{percent}% similar</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted by {row.user_name || "a Neighborly member"}{row.area_type === "neighborhood" && row.city ? ` in ${row.city}` : ""}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">New entry</p>
                        <p className="mt-1 break-words font-semibold text-amber-950">{row.entered_name}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Already exists</p>
                        <p className="mt-1 break-words font-semibold text-emerald-950">{row.existing_name}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void resolve(row, "merged")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50"
                      >
                        <Merge size={14} /> Use existing “{row.existing_name}”
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void resolve(row, "keep_separate")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                      >
                        Keep as a separate {row.area_type}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
