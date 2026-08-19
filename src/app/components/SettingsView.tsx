import React, { useEffect, useState } from "react";
import { ChevronLeft, KeyRound, Mail, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SettingsView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const current = data.user?.email || "";
      setEmail(current);
      setNewEmail(current);
    });
  }, []);

  async function updateEmail() {
    setMessage(null); setError(null);
    if (!newEmail.trim() || newEmail.trim() === email) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setMessage("Email update requested. Check your email for the confirmation link.");
  }

  async function updatePassword() {
    setMessage(null); setError(null);
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setPassword(""); setConfirmPassword(""); setMessage("Your password has been updated.");
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-10">
      <div className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Back"><ChevronLeft size={20} /></button>
          <div><h1 className="font-['Playfair_Display',serif] font-bold text-lg">Settings</h1><p className="text-xs text-muted-foreground">Manage your Neighborly account</p></div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {(message || error) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>{error || message}</div>}
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4"><Mail size={16} className="text-primary" /><h2 className="font-semibold">Email address</h2></div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Email</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <p className="text-xs text-muted-foreground mt-2">Changing your email may require confirmation from the new address.</p>
          <button onClick={updateEmail} disabled={busy || !newEmail.trim() || newEmail.trim() === email} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">Update Email</button>
        </section>
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4"><KeyRound size={16} className="text-primary" /><h2 className="font-semibold">Password</h2></div>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">New password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Confirm password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
          </div>
          <button onClick={updatePassword} disabled={busy || !password || !confirmPassword} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">Update Password</button>
        </section>
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2"><ShieldCheck size={16} className="text-primary" /><h2 className="font-semibold">Account</h2></div>
          <p className="text-sm text-muted-foreground mb-4">Signing out ends your current Neighborly session on this device.</p>
          <button onClick={signOut} disabled={busy} className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-40"><LogOut size={15} /> Sign Out</button>
        </section>
      </div>
    </div>
  );
}
