import React, { useEffect, useState } from "react";
import { ChevronLeft, KeyRound, Mail, LogOut, ShieldCheck, UserRound, Building2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AccountType = "personal" | "business";

type ProfileForm = {
  fullName: string;
  city: string;
  zipCode: string;
  neighborhood: string;
  bio: string;
  theme: string;
  businessName: string;
  category: string;
  phone: string;
  website: string;
  description: string;
  services: string;
};

const emptyProfile: ProfileForm = {
  fullName: "", city: "", zipCode: "", neighborhood: "", bio: "", theme: "classic-blue",
  businessName: "", category: "", phone: "", website: "", description: "", services: "",
};

export function SettingsView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);

  useEffect(() => {
    void loadAccount();
  }, []);

  async function loadAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = user.email || "";
    setEmail(current);
    setNewEmail(current);

    const { data: person } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const metadata = user.user_metadata || {};
    const type: AccountType = (person?.account_type || metadata.account_type) === "business" ? "business" : "personal";
    setAccountType(type);

    let business: any = null;
    if (type === "business") {
      const { data } = await supabase.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle();
      business = data;
    }

    setProfile({
      fullName: person?.full_name || metadata.full_name || "",
      city: person?.city || metadata.city || "",
      zipCode: person?.zip_code || metadata.zip_code || "",
      neighborhood: person?.neighborhood || metadata.neighborhood || "",
      bio: person?.bio || metadata.bio || "",
      theme: business?.theme || person?.theme || metadata.theme || "classic-blue",
      businessName: business?.business_name || metadata.business_name || "",
      category: business?.category || metadata.business_category || "",
      phone: business?.phone || metadata.business_phone || "",
      website: business?.website || metadata.business_website || "",
      description: business?.description || metadata.business_description || "",
      services: Array.isArray(business?.services) ? business.services.join(", ") : (business?.services || ""),
    });
  }

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function saveProfile() {
    setMessage(null); setError(null); setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setError("Please sign in again."); return; }

    const personUpdate = {
      full_name: profile.fullName.trim(),
      city: profile.city.trim(),
      zip_code: profile.zipCode.trim(),
      neighborhood: profile.neighborhood.trim(),
      bio: profile.bio.trim(),
      theme: profile.theme,
      updated_at: new Date().toISOString(),
    };
    const { error: personError } = await supabase.from("profiles").update(personUpdate).eq("id", user.id);
    if (personError) { setBusy(false); setError(personError.message); return; }

    if (accountType === "business") {
      const services = profile.services.split(",").map((s) => s.trim()).filter(Boolean);
      const { error: businessError } = await supabase.from("business_profiles").upsert({
        user_id: user.id,
        business_name: profile.businessName.trim(),
        category: profile.category.trim(),
        owner_name: profile.fullName.trim(),
        description: profile.description.trim(),
        city: profile.city.trim(),
        zip_code: profile.zipCode.trim(),
        neighborhood: profile.neighborhood.trim(),
        phone: profile.phone.trim(),
        website: profile.website.trim(),
        services,
        theme: profile.theme,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (businessError) { setBusy(false); setError(businessError.message); return; }
    }

    await supabase.auth.updateUser({ data: {
      full_name: profile.fullName.trim(), city: profile.city.trim(), zip_code: profile.zipCode.trim(),
      neighborhood: profile.neighborhood.trim(), bio: profile.bio.trim(), theme: profile.theme,
      ...(accountType === "business" ? {
        business_name: profile.businessName.trim(), business_category: profile.category.trim(),
        business_phone: profile.phone.trim(), business_website: profile.website.trim(),
        business_description: profile.description.trim(),
      } : {}),
    }});

    setBusy(false); setEditingProfile(false); setMessage("Your profile has been updated.");
  }

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

  async function signOut() { setBusy(true); await supabase.auth.signOut(); setBusy(false); }

  const input = "w-full min-w-0 bg-muted rounded-lg px-3 py-2.5 text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20";
  const label = "text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1";

  if (editingProfile) {
    return (
      <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-10 overflow-x-hidden">
        <div className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => setEditingProfile(false)} className="p-1 text-muted-foreground" aria-label="Back to settings"><ChevronLeft size={20} /></button>
            <div className="min-w-0"><h1 className="font-['Playfair_Display',serif] font-bold text-lg truncate">Update Profile</h1><p className="text-xs text-muted-foreground truncate">Only you can change this information</p></div>
          </div>
        </div>
        <main className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-4">
          {(message || error) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>{error || message}</div>}
          <section className="bg-white rounded-xl border border-border p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">{accountType === "business" ? <Building2 size={18} /> : <UserRound size={18} />}<h2 className="font-semibold">{accountType === "business" ? "Business profile" : "Personal profile"}</h2></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className={label}>{accountType === "business" ? "Owner / Contact Name" : "Full Name"}</label><input className={input} value={profile.fullName} onChange={(e) => setField("fullName", e.target.value)} /></div>
              {accountType === "business" && <><div><label className={label}>Business Name</label><input className={input} value={profile.businessName} onChange={(e) => setField("businessName", e.target.value)} /></div><div><label className={label}>Category</label><input className={input} value={profile.category} onChange={(e) => setField("category", e.target.value)} /></div></>}
              <div><label className={label}>City</label><input className={input} value={profile.city} onChange={(e) => setField("city", e.target.value)} /></div>
              <div><label className={label}>ZIP Code</label><input className={input} value={profile.zipCode} onChange={(e) => setField("zipCode", e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Neighborhood</label><input className={input} value={profile.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} /></div>
              {accountType === "business" ? <>
                <div><label className={label}>Phone</label><input type="tel" className={input} value={profile.phone} onChange={(e) => setField("phone", e.target.value)} /></div>
                <div><label className={label}>Website</label><input className={input} value={profile.website} onChange={(e) => setField("website", e.target.value)} /></div>
                <div className="sm:col-span-2"><label className={label}>About Business</label><textarea className={`${input} min-h-28 resize-y`} value={profile.description} onChange={(e) => setField("description", e.target.value)} /></div>
                <div className="sm:col-span-2"><label className={label}>Services</label><input className={input} value={profile.services} onChange={(e) => setField("services", e.target.value)} placeholder="Cleaning, Lawn Care, Painting" /><p className="text-xs text-muted-foreground mt-1">Separate services with commas.</p></div>
              </> : <div className="sm:col-span-2"><label className={label}>About Me</label><textarea className={`${input} min-h-28 resize-y`} value={profile.bio} onChange={(e) => setField("bio", e.target.value)} /></div>}
              <div className="sm:col-span-2"><label className={label}>Profile Color</label><select className={input} value={profile.theme} onChange={(e) => setField("theme", e.target.value)}><option value="classic-blue">Classic Blue</option><option value="purple">Purple</option><option value="teal">Teal</option><option value="green">Green</option><option value="rose">Rose</option><option value="sunset">Sunset</option></select></div>
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setEditingProfile(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border bg-white text-sm font-medium">Cancel</button>
              <button onClick={saveProfile} disabled={busy} className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"><Save size={16} /> Save Profile</button>
            </div>
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Badges, ratings, and reviews are not editable here. Neighborly controls those system/community fields.</section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-10 overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-white border-b border-border shadow-sm"><div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3"><button onClick={onBack} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Back"><ChevronLeft size={20} /></button><div className="min-w-0"><h1 className="font-['Playfair_Display',serif] font-bold text-lg">Settings</h1><p className="text-xs text-muted-foreground truncate">Manage your Neighborly account</p></div></div></div>
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-4">
        {(message || error) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>{error || message}</div>}
        <section className="bg-white rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2"><UserRound size={17} className="text-primary" /><h2 className="font-semibold">Profile</h2></div>
          <p className="text-sm text-muted-foreground">Update your about information, contact details, and profile color. Badges and reviews are protected.</p>
          <button onClick={() => setEditingProfile(true)} className="mt-4 w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">Update Profile</button>
        </section>
        <section className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="flex items-center gap-2 mb-4"><Mail size={16} className="text-primary" /><h2 className="font-semibold">Email address</h2></div><label className={label}>Email</label><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={input} /><p className="text-xs text-muted-foreground mt-2">Changing your email may require confirmation from the new address.</p><button onClick={updateEmail} disabled={busy || !newEmail.trim() || newEmail.trim() === email} className="mt-3 w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40">Update Email</button></section>
        <section className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="flex items-center gap-2 mb-4"><KeyRound size={16} className="text-primary" /><h2 className="font-semibold">Password</h2></div><div className="space-y-3"><div><label className={label}>New password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={input} /></div><div><label className={label}>Confirm password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={input} /></div></div><button onClick={updatePassword} disabled={busy || !password || !confirmPassword} className="mt-3 w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40">Update Password</button></section>
        <section className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="flex items-center gap-2 mb-2"><ShieldCheck size={16} className="text-primary" /><h2 className="font-semibold">Account</h2></div><p className="text-sm text-muted-foreground mb-4">Signing out ends your current Neighborly session on this device.</p><button onClick={signOut} disabled={busy} className="w-full sm:w-auto flex items-center justify-center gap-2 border border-red-200 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-40"><LogOut size={15} /> Sign Out</button></section>
      </div>
    </div>
  );
}
