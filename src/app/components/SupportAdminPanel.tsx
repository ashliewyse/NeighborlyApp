import { useCallback, useEffect, useState } from "react";
import { BookOpen, ExternalLink, LifeBuoy, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SupportFaq } from "@/app/components/HelpCenter";

type SupportStatus = "new" | "in_progress" | "resolved";
type SupportRequest = {
  id: string;
  sender_name: string;
  contact_email: string;
  category: string;
  subject: string;
  message: string;
  status: SupportStatus;
  admin_response: string | null;
  created_at: string;
};

const statuses: { value: SupportStatus | "all"; label: string }[] = [
  { value: "all", label: "All requests" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export function SupportAdminPanel() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [faqEditing, setFaqEditing] = useState("");
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "", sort_order: 60, published: true });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const [requestResult, faqResult] = await Promise.all([
      supabase.from("support_requests").select("id, sender_name, contact_email, category, subject, message, status, admin_response, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("support_faqs").select("id, question, answer, sort_order, published").order("sort_order", { ascending: true }),
    ]);
    if (requestResult.error || faqResult.error) {
      setError("Some support information could not be loaded. Check your connection and refresh.");
      console.error("Could not load support dashboard", requestResult.error || faqResult.error);
    }
    if (!requestResult.error) setRequests((requestResult.data || []) as SupportRequest[]);
    if (!faqResult.error) setFaqs((faqResult.data || []) as SupportFaq[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function changeStatus(item: SupportRequest, status: SupportStatus) {
    if (busy) return;
    setBusy(item.id);
    setError("");
    const { error: updateError } = await supabase.from("support_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", item.id).select("id").single();
    if (updateError) setError("Could not update this support request.");
    else setRequests((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
    setBusy("");
  }

  async function saveResponse(item: SupportRequest) {
    if (busy) return;
    setBusy(item.id);
    setError("");
    const response = (responses[item.id] ?? item.admin_response ?? "").trim();
    const status: SupportStatus = item.status === "new" ? "in_progress" : item.status;
    const { error: updateError } = await supabase.from("support_requests")
      .update({ admin_response: response || null, status, updated_at: new Date().toISOString() })
      .eq("id", item.id).select("id").single();
    if (updateError) setError("Could not save this reply draft.");
    else {
      setRequests((current) => current.map((row) => row.id === item.id ? { ...row, admin_response: response || null, status } : row));
      setNotice("Reply draft saved. Use Reply by email to send it to the member.");
    }
    setBusy("");
  }

  function editFaq(faq?: SupportFaq) {
    setNotice("");
    setFaqEditing(faq?.id || "new");
    setFaqDraft(faq ? { question: faq.question, answer: faq.answer, sort_order: faq.sort_order, published: faq.published } : { question: "", answer: "", sort_order: (faqs.length + 1) * 10, published: true });
  }

  async function saveFaq() {
    if (busy || faqDraft.question.trim().length < 5 || faqDraft.answer.trim().length < 5) return;
    setBusy("faq");
    setError("");
    const values = { question: faqDraft.question.trim(), answer: faqDraft.answer.trim(), sort_order: faqDraft.sort_order, published: faqDraft.published };
    const result = faqEditing === "new"
      ? await supabase.from("support_faqs").insert(values).select("id, question, answer, sort_order, published").single()
      : await supabase.from("support_faqs").update({ ...values, updated_at: new Date().toISOString() }).eq("id", faqEditing).select("id, question, answer, sort_order, published").single();
    if (result.error) {
      console.error("Could not save FAQ", result.error);
      setError("The FAQ could not be saved.");
    } else {
      setFaqEditing("");
      setNotice("FAQ saved. Published questions appear in the public Help Center.");
      void refresh();
    }
    setBusy("");
  }

  const visible = requests.filter((item) => filter === "all" || item.status === filter);
  const newCount = requests.filter((item) => item.status === "new").length;
  const safetyCount = requests.filter((item) => item.category === "safety" && item.status !== "resolved").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-purple-950"><LifeBuoy size={22} /> Help & Support Requests</h2>
            <p className="mt-2 text-sm text-slate-600">Messages from the public Help Center, including people who cannot sign in. Requests and email addresses are private to administrators.</p>
          </div>
          <button onClick={() => { void refresh(); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"><RefreshCw size={15} /> Refresh</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-semibold uppercase text-amber-900">New requests</p><p className="mt-1 text-2xl font-bold text-amber-900">{newCount}</p></div>
          <div className="rounded-xl bg-purple-50 p-3"><p className="text-xs font-semibold uppercase text-purple-900">In progress</p><p className="mt-1 text-2xl font-bold text-purple-900">{requests.filter((item) => item.status === "in_progress").length}</p></div>
          <div className="rounded-xl bg-red-50 p-3"><p className="text-xs font-semibold uppercase text-red-900">Unresolved safety</p><p className="mt-1 text-2xl font-bold text-red-900">{safetyCount}</p></div>
        </div>
        <div className="mt-5">
          <label htmlFor="support-status-filter" className="mr-3 text-sm font-semibold text-slate-700">Filter:</label>
          <select id="support-status-filter" value={filter} onChange={(event) => setFilter(event.target.value as SupportStatus | "all")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {statuses.map((entry) => <option value={entry.value} key={entry.value}>{entry.label}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {loading ? <p className="mt-5 text-sm text-slate-600">Loading support requests…</p> : visible.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No support requests in this category yet.</p> : (
          <div className="mt-5 space-y-4">
            {visible.map((item) => (
              <article key={item.id} className={"rounded-xl border p-4 " + (item.category === "safety" && item.status !== "resolved" ? "border-red-300 bg-red-50/30" : item.status === "new" ? "border-amber-200" : "border-slate-200")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{item.subject}</h3>
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">{item.status.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.sender_name} · {item.category} · {new Date(item.created_at).toLocaleString()}</p>
                <a className="mt-2 inline-block break-all text-sm font-semibold text-blue-700 underline" href={"mailto:" + item.contact_email}>{item.contact_email}</a>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.message}</p>
                <label className="mt-4 block text-xs font-bold text-slate-700">Your reply draft
                  <textarea rows={3} maxLength={5000} value={responses[item.id] ?? item.admin_response ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal" placeholder="Write a helpful reply..." />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button disabled={busy === item.id} onClick={() => { void saveResponse(item); }} className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-50">Save reply draft</button>
                  <a href={"mailto:" + encodeURIComponent(item.contact_email) + "?subject=" + encodeURIComponent("Re: Neighborly support - " + item.subject) + "&body=" + encodeURIComponent(responses[item.id] ?? item.admin_response ?? "")} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><ExternalLink size={13} /> Reply by email</a>
                  {item.status !== "resolved" ? <button disabled={busy === item.id} onClick={() => { void changeStatus(item, item.status === "new" ? "in_progress" : "resolved"); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{item.status === "new" ? "Mark in progress" : "Mark resolved"}</button> : <button disabled={busy === item.id} onClick={() => { void changeStatus(item, "in_progress"); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Reopen</button>}
                </div>
                <p className="mt-2 text-xs text-slate-500">Reply by email opens your mail app; saving a draft does not send an email.</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-xl font-bold text-purple-950"><BookOpen size={21} /> FAQ Management</h2><p className="mt-1 text-sm text-slate-600">Edit questions that appear on the public Help Center.</p></div>
          <button onClick={() => editFaq()} className="inline-flex items-center gap-1 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"><Plus size={16} /> Add question</button>
        </div>
        <div className="mt-4 space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{faq.question}</p><p className="mt-0.5 text-xs text-slate-600">{faq.published ? "Published" : "Unpublished"} · Order {faq.sort_order}</p></div>
              <button onClick={() => editFaq(faq)} className="rounded-lg border border-purple-200 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50">Edit</button>
            </div>
          ))}
        </div>
        {faqEditing && (
          <div className="mt-5 space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <h3 className="font-semibold text-purple-950">{faqEditing === "new" ? "Add FAQ" : "Edit FAQ"}</h3>
            <label className="block text-sm font-semibold">Question
              <input value={faqDraft.question} maxLength={200} onChange={(event) => setFaqDraft((s) => ({ ...s, question: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Answer
              <textarea value={faqDraft.answer} maxLength={5000} rows={4} onChange={(event) => setFaqDraft((s) => ({ ...s, answer: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 font-normal" />
            </label>
            <div className="flex flex-wrap items-center gap-5">
              <label className="text-sm font-semibold">Display order <input type="number" value={faqDraft.sort_order} min={0} max={9999} onChange={(event) => setFaqDraft((s) => ({ ...s, sort_order: Number(event.target.value) }))} className="ml-2 w-20 rounded-lg border bg-white p-2 font-normal" /></label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={faqDraft.published} onChange={(event) => setFaqDraft((s) => ({ ...s, published: event.target.checked }))} /> Published</label>
            </div>
            <div className="flex gap-2">
              <button disabled={busy === "faq" || faqDraft.question.trim().length < 5 || faqDraft.answer.trim().length < 5} onClick={() => { void saveFaq(); }} className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save FAQ</button>
              <button onClick={() => setFaqEditing("")} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        )}
        <a href="/help" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 underline">View public Help Center <ExternalLink size={14} /></a>
      </section>
    </div>
  );
}
