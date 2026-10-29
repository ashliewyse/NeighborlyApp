import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, LifeBuoy, Send, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";
import { supabase } from "@/lib/supabase";

export type SupportFaq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  published: boolean;
};

const FALLBACK_FAQS: SupportFaq[] = [
  { id: "install", question: "How do I install Neighborly?", answer: "Visit neighborshelpingneighbors.online/install from Safari on iPhone or Chrome on Android. Follow the instructions to add Neighborly to your home screen. It is not currently listed in the app stores.", sort_order: 10, published: true },
  { id: "login", question: "I cannot sign in or confirm my email. What should I do?", answer: "Double-check your email address and password. Use the password reset option on the sign-in page, or check your spam folder for the confirmation email. If you are still stuck, send a support request below.", sort_order: 20, published: true },
  { id: "badges", question: "What do Neighborly badges mean?", answer: "Badges help highlight community participation and other account or safety-related signals. A badge does not guarantee that someone is safe or that their services are certified. Always use your judgment when meeting or hiring someone.", sort_order: 30, published: true },
  { id: "ratings", question: "Can neighbors and businesses rate each other?", answer: "Neighborly offers community reviews and ratings to share feedback about local interactions. Keep reviews accurate, specific, and respectful. Businesses and neighbors should not use ratings to harass or pressure others.", sort_order: 40, published: true },
  { id: "report", question: "How do I report a problem or safety concern?", answer: "Use the report tools when available, or choose Safety concern in the support form below. Never share passwords or sensitive information. For an emergency or immediate danger, contact local emergency services instead.", sort_order: 50, published: true },
];

type SupportCategory = "login" | "installation" | "bug" | "safety" | "account" | "other";
const categoryOptions: { value: SupportCategory; label: string }[] = [
  { value: "login", label: "Sign-in or registration" },
  { value: "installation", label: "Installing Neighborly" },
  { value: "bug", label: "Something isn't working" },
  { value: "safety", label: "Safety or reporting a member" },
  { value: "account", label: "My account or profile" },
  { value: "other", label: "Another question" },
];

export function HelpCenter() {
  const [faqs, setFaqs] = useState<SupportFaq[]>(FALLBACK_FAQS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportCategory>("login");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot: hidden from real users.
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.from("support_faqs")
      .select("id, question, answer, sort_order, published")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (active && !loadError) setFaqs((data || []) as SupportFaq[]);
      });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (website.trim()) { setSent(true); return; }
    if (Date.now() - startedAt < 2000) {
      setError("Please check your message and try submitting again.");
      return;
    }
    setSubmitting(true);
    const { error: submitError } = await supabase.from("support_requests").insert({
      sender_name: name.trim(),
      contact_email: email.trim().toLowerCase(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (submitError) {
      console.error("Could not send a Neighborly support request", submitError);
      setError("Your request could not be sent right now. Please try again shortly.");
      return;
    }
    setSent(true);
    setSubject("");
    setMessage("");
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-purple-950 via-purple-900 to-slate-950 px-4 py-8 font-['DM_Sans',sans-serif] text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-purple-100 hover:text-white"><ArrowLeft size={16} /> Back to Neighborly</Link>
        <header className="mt-6 rounded-3xl bg-white p-6 text-center shadow-xl sm:p-9">
          <img src={neighborlyLogo} alt="Neighborly" className="mx-auto h-auto w-44 object-contain" />
          <h1 className="mt-4 font-['Playfair_Display',serif] text-3xl font-bold text-purple-950">Help & Support</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Having trouble installing, signing in, or using Neighborly? Check the answers below or contact the team. You do not need to sign in to ask for help.</p>
        </header>
        <section className="mt-5 rounded-3xl bg-white p-5 shadow-xl sm:p-7" aria-labelledby="faq-title">
          <h2 id="faq-title" className="flex items-center gap-2 text-xl font-bold text-purple-950"><BookOpen size={21} /> Frequently Asked Questions</h2>
          <div className="mt-5 space-y-3">
            {faqs.length === 0 ? <p className="text-sm text-slate-600">More help articles are coming soon. You can contact support below.</p> : faqs.map((faq) => (
              <details key={faq.id} className="group rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3">
                <summary className="cursor-pointer pr-2 text-sm font-semibold text-purple-950">{faq.question}</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="contact-support" className="mt-5 rounded-3xl bg-white p-5 shadow-xl sm:p-7" aria-labelledby="support-title">
          <h2 id="support-title" className="flex items-center gap-2 text-xl font-bold text-purple-950"><LifeBuoy size={21} /> Contact Neighborly Support</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Tell us what went wrong and include a working email so we can contact you. Do not include passwords, payment information, or other sensitive personal details.</p>
          {sent ? (
            <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
              <p className="font-bold">Your message has been submitted.</p>
              <p className="mt-2">Thank you for reaching out. The Neighborly team can review your request in the support dashboard.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-4 font-semibold text-emerald-800 underline">Send another request</button>
            </div>
          ) : (
            <form onSubmit={(event) => { void submit(event); }} className="mt-5 space-y-4" aria-busy={submitting}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-800">Your name
                  <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-purple-600" />
                </label>
                <label className="block text-sm font-semibold text-slate-800">Email for replies
                  <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-purple-600" />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-800">What do you need help with?
                <select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:border-purple-600">
                  {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-800">Subject
                <input required minLength={2} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A short description of the issue" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-purple-600" />
              </label>
              <label className="block text-sm font-semibold text-slate-800">Tell us what happened
                <textarea required minLength={5} maxLength={5000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What were you trying to do? What happened instead?" className="mt-1 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-purple-600" />
              </label>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
              </div>
              {category === "safety" && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><ShieldAlert size={18} className="mt-0.5 shrink-0" /> For immediate danger or an emergency, contact local emergency services first.</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 font-bold text-white hover:bg-purple-800 disabled:opacity-50"><Send size={17} /> {submitting ? "Sending…" : "Send Support Request"}</button>
            </form>
          )}
        </section>
        <p className="py-6 text-center text-xs text-purple-200">Neighborly · Neighbors Helping Neighbors</p>
      </div>
    </main>
  );
}
