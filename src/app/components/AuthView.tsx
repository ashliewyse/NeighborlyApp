import React, { useEffect, useState } from "react";
import { ChevronLeft, CheckCircle2, Eye, EyeOff, KeyRound, MapPin, Palette, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { CommunityGuidelines } from "@/app/components/CommunityGuidelines";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";
import { supabase } from "@/lib/supabase";

type AuthMode = "signin" | "signup";
type AuthScreen = "form" | "forgot" | "recovery";
type AuthOperation = "sign-in" | "sign-up" | "password-reset" | "password-update";

type AuthErrorLike = {
  code?: string;
  message?: string;
};

const PROFILE_THEME_OPTIONS = [
  { id: "classic-blue", label: "Classic Blue", swatch: "bg-blue-600", cover: "from-blue-700 to-sky-400", button: "bg-blue-600", soft: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { id: "purple", label: "Purple", swatch: "bg-purple-600", cover: "from-purple-800 to-fuchsia-500", button: "bg-purple-600", soft: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  { id: "teal", label: "Teal", swatch: "bg-teal-600", cover: "from-teal-700 to-cyan-400", button: "bg-teal-600", soft: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
] as const;

interface AuthViewProps {
  mode: AuthMode;
  initialScreen?: AuthScreen;
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: () => void;
  previewMode?: boolean;
}

const PREVIEW_EMAIL = "preview@neighborly.test";
const PREVIEW_PASSWORD = "NeighborlyDemo123!";

function getFriendlyAuthError(error: AuthErrorLike | null, operation: AuthOperation) {
  const code = error?.code?.toLowerCase() || "";
  const message = error?.message?.toLowerCase() || "";

  if (code === "over_email_send_rate_limit" || message.includes("email rate limit")) {
    return operation === "password-reset"
      ? "Neighborly's password-reset email service is temporarily busy. Please wait a little while before requesting another link."
      : "Neighborly couldn't send another confirmation email right now. If you already submitted your access request, it is still saved. Check your inbox and spam folder for the first confirmation email, then wait about a minute before trying again.";
  }

  if (code === "email_address_not_authorized" || message.includes("email address not authorized")) {
    return "Neighborly couldn't deliver a confirmation email to that address. Please try again shortly or contact Neighborly for help.";
  }

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "That email and password combination wasn't recognized. Check your information or reset your password.";
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox and spam folder for the Neighborly email.";
  }

  if (code === "user_already_exists" || message.includes("already registered")) {
    return "An account already exists for that email. Try signing in or use Forgot password.";
  }

  const fallbackByOperation: Record<AuthOperation, string> = {
    "sign-in": "We couldn't sign you in. Please check your information and try again.",
    "sign-up": "We couldn't submit your access request. Please try again.",
    "password-reset": "We couldn't send a password-reset email. Please try again.",
    "password-update": "We couldn't update your password. Please try again.",
  };

  return error?.message || fallbackByOperation[operation];
}

async function syncProfileFromMetadata(user: any) {
  if (!user?.id) return;
  const m = user.user_metadata || {};
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: m.full_name || "",
    city: m.city || "",
    zip_code: m.zip_code || "",
    neighborhood: m.neighborhood || "",
    bio: m.bio || "",
    theme: m.theme || "classic-blue",
    account_type: m.account_type || "personal",
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  if (m.account_type === "business" && m.business_name) {
    const { error: businessError } = await supabase.from("business_profiles").upsert({
      user_id: user.id,
      business_name: m.business_name || "",
      category: m.business_category || "Local Business",
      owner_name: m.full_name || "",
      description: m.business_description || "",
      city: m.city || "",
      zip_code: m.zip_code || "",
      neighborhood: m.neighborhood || "",
      phone: m.business_phone || "",
      website: m.business_website || "",
      theme: m.theme || "classic-blue",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (businessError) throw businessError;
  }
}

export function AuthView({ mode, initialScreen = "form", onSwitchMode, onSuccess, previewMode = false }: AuthViewProps) {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen);
  const [step, setStep] = useState(1);
  const [previewComplete, setPreviewComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);

  const [accountType, setAccountType] = useState<"personal" | "business" | "">("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [email, setEmail] = useState(previewMode ? PREVIEW_EMAIL : "");
  const [password, setPassword] = useState(previewMode ? PREVIEW_PASSWORD : "");
  const [confirmPassword, setConfirmPassword] = useState(previewMode ? PREVIEW_PASSWORD : "");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<(typeof PROFILE_THEME_OPTIONS)[number]["id"]>("classic-blue");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    if (previewMode) return;

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session?.user || initialScreen === "recovery") return;
      try {
        await syncProfileFromMetadata(data.session.user);
        if (active) onSuccess();
      } catch (profileError: any) {
        if (active) setError(profileError?.message || "We could not load your profile.");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setScreen("recovery");
        setError("");
        setNotice("");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [initialScreen, onSuccess, previewMode]);

  function resetMessages() {
    setError("");
    setNotice("");
  }

  async function handleSignIn() {
    resetMessages();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError || !data.user) {
      setError(getFriendlyAuthError(signInError, "sign-in"));
      return;
    }
    try {
      await syncProfileFromMetadata(data.user);
      onSuccess();
    } catch (profileError: any) {
      setError(profileError?.message || "You are signed in, but your profile could not be loaded.");
    }
  }

  async function handleSignUp() {
    resetMessages();
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Your passwords don't match.");
      return;
    }
    if (!agreedToGuidelines) {
      setError("Please read and agree to the Neighborly Community Guidelines before requesting access.");
      return;
    }

    if (previewMode) {
      setPreviewComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile")}`,
        data: {
          account_type: accountType || "personal",
          full_name: fullName.trim(),
          business_name: accountType === "business" ? businessName.trim() : "",
          business_category: accountType === "business" ? businessCategory.trim() : "",
          business_phone: accountType === "business" ? businessPhone.trim() : "",
          business_website: accountType === "business" ? businessWebsite.trim() : "",
          business_description: accountType === "business" ? businessDescription.trim() : "",
          city: city.trim(),
          zip_code: zipCode.trim(),
          neighborhood: neighborhood.trim(),
          bio: bio.trim(),
          theme,
          community_guidelines_version: "2026-08-28",
          community_guidelines_agreed_at: new Date().toISOString(),
        },
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(getFriendlyAuthError(signUpError, "sign-up"));
      return;
    }

    if (data.session?.user) {
      try {
        await syncProfileFromMetadata(data.session.user);
        onSuccess();
      } catch (profileError: any) {
        setError(profileError?.message || "Your account was created, but your profile could not be loaded.");
      }
      return;
    }

    setNotice("Access request submitted. Check your email to verify your address, then sign in to see your approval status.");
    setStep(1);
    setAgreedToGuidelines(false);
  }

  async function handleForgotPassword() {
    resetMessages();
    if (!email.trim()) {
      setError("Enter the email you registered with.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError(getFriendlyAuthError(resetError, "password-reset"));
      return;
    }
    setNotice("If that email is registered, a secure password-reset link is on the way.");
  }

  async function handleUpdatePassword() {
    resetMessages();
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Your new passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError(getFriendlyAuthError(updateError, "password-update"));
      return;
    }
    setNotice("Password updated. You're signed in.");
    setTimeout(onSuccess, 600);
  }

  const inputClass = "w-full bg-muted rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20";
  const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1";
  const selectedTheme = PROFILE_THEME_OPTIONS.find((option) => option.id === theme) || PROFILE_THEME_OPTIONS[0];
  const previewName = accountType === "business" ? businessName.trim() || "Your Business" : fullName.trim() || "Your Name";
  const previewLocation = [neighborhood.trim(), city.trim()].filter(Boolean).join(", ") || "Your neighborhood";
  const previewBio = accountType === "business"
    ? businessDescription.trim() || "A short description of your business will appear here."
    : bio.trim() || "A short introduction will help neighbors get to know you.";
  const previewInitials = previewName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "N";

  function previewOtherAccountType() {
    setAccountType(accountType === "business" ? "personal" : "business");
    setStep(1);
    setPreviewComplete(false);
    setAgreedToGuidelines(false);
    resetMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-slate-950 flex items-center justify-center p-4 font-['DM_Sans',sans-serif]">
      <div className={`${mode === "signup" && screen === "form" && step === 2 && !previewComplete ? "max-w-2xl" : "max-w-lg"} w-full bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xl transition-[max-width]`}>
        <Link to="/" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline">
          <ChevronLeft size={14} /> {previewMode ? "Exit sign-up preview" : "Back to the Neighborly welcome page"}
        </Link>
        <div className="text-center mb-6">
          <div className="w-36 mx-auto mb-4">
            <ImageWithFallback src={neighborlyLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
          </div>
          <h1 className="font-['Playfair_Display',serif] font-bold text-2xl text-foreground">
            {previewComplete ? `${accountType === "business" ? "Business" : "Personal"} preview complete` : previewMode ? "Preview the Neighborly sign-up" : screen === "forgot" ? "Reset your password" : screen === "recovery" ? "Choose a new password" : mode === "signin" ? "Welcome back to Neighborly" : "Join the Neighborly beta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {previewComplete ? "You reached the end of this walkthrough without creating an account." : previewMode ? "Try every step exactly as a new neighbor would see it." : screen === "forgot" ? "We'll email a secure reset link to your registered address." : screen === "recovery" ? "Create a new password for your Neighborly account." : mode === "signin" ? "Sign in to connect with your local community or check your approval status." : "Create your profile and request access. You can change your profile details later."}
          </p>
        </div>

        {previewMode && !previewComplete && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950">
            <strong>Safe preview:</strong> nothing you enter here will be saved. The demo email cannot create an account, send email, or make a profile.
          </div>
        )}

        {mode === "signup" && screen === "form" && !previewComplete && (
          <div className="mb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
              <span className={step >= 1 ? "text-blue-600" : ""}>1 Create Login</span>
              <div className="h-px flex-1 bg-border" />
              <span className={step >= 2 ? "text-blue-600" : ""}>2 Build Profile</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: step === 1 ? "50%" : "100%" }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {previewComplete ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 size={42} className="mx-auto text-emerald-600" />
                <h2 className="mt-3 text-lg font-bold text-emerald-950">Nothing was saved</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900">No Neighborly login, Supabase user, access request, or profile was created.</p>
              </div>
              <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm">
                <p><span className="font-semibold">Path previewed:</span> {accountType === "business" ? "Local Business" : "Personal Account"}</p>
                <p className="mt-2"><span className="font-semibold">Profile color:</span> {selectedTheme.label}</p>
                <p className="mt-2"><span className="font-semibold">Demo email:</span> {PREVIEW_EMAIL}</p>
              </div>
              <button onClick={previewOtherAccountType} className="w-full rounded-lg bg-purple-700 py-3 text-sm font-semibold text-white hover:bg-purple-800">
                Preview the {accountType === "business" ? "Personal" : "Business"} Sign-Up
              </button>
              <Link to="/" className="w-full rounded-lg border border-border py-3 text-center text-sm font-semibold text-slate-700 hover:bg-muted">
                Return to Neighborly
              </Link>
            </>
          ) : screen === "recovery" ? (
            <>
              <div>
                <label className={labelClass}>New Password</label>
                <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input className={inputClass} type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Repeat your new password" />
              </div>
              <button disabled={busy} onClick={handleUpdatePassword} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Updating…" : "Update Password"}
              </button>
            </>
          ) : screen === "forgot" ? (
            <>
              <div>
                <label className={labelClass}>Registered Email</label>
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button disabled={busy} onClick={handleForgotPassword} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Sending…" : "Send Reset Link"}
              </button>
              <button onClick={() => { setScreen("form"); resetMessages(); }} className="text-sm text-blue-600 font-medium flex items-center justify-center gap-1">
                <ChevronLeft size={14} /> Back to sign in
              </button>
            </>
          ) : mode === "signin" ? (
            <>
              <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm leading-5 text-purple-950">
                Approved members can enter Neighborly here. If you recently requested access, sign in to check your approval status.
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input className={`${inputClass} pr-10`} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Show or hide password">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button onClick={() => { setScreen("forgot"); resetMessages(); }} className="text-xs text-blue-600 font-medium hover:underline mt-2 flex items-center gap-1">
                  <KeyRound size={12} /> Forgot password?
                </button>
              </div>
              <button disabled={busy} onClick={handleSignIn} className="w-full mt-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Signing in…" : "Sign In"}
              </button>
            </>
          ) : step === 1 ? (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-950">
                {previewMode ? "Walk through the same choices a new neighbor sees. The fixed demo login below is only for this preview." : "Requesting access takes about two minutes. After submitting, verify your email and sign in to see when your account is approved."}
              </div>
              <div>
                <label className={labelClass}>Account Type</label>
                <p className="text-xs text-muted-foreground mb-2">Choose how you want to use Neighborly.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setAccountType("personal")} className={`rounded-xl border p-4 text-left transition-all ${accountType === "personal" ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border hover:border-blue-300"}`}>
                    <div className="text-2xl mb-1">👤</div><div className="font-semibold text-sm">Personal Account</div><div className="text-xs text-muted-foreground mt-1">Connect, post, help neighbors, and build your profile.</div>
                  </button>
                  <button type="button" onClick={() => setAccountType("business")} className={`rounded-xl border p-4 text-left transition-all ${accountType === "business" ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border hover:border-blue-300"}`}>
                    <div className="text-2xl mb-1">🏪</div><div className="font-semibold text-sm">Local Business</div><div className="text-xs text-muted-foreground mt-1">Create a business profile and connect with local customers.</div>
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>{accountType === "business" ? "Owner / Contact Name" : "Full Name"}</label>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maria Santos" autoComplete="name" />
              </div>
              <div>
                <label className={labelClass}>{previewMode ? "Demo Email" : "Email"}</label>
                <input className={`${inputClass} ${previewMode ? "cursor-not-allowed bg-slate-100 text-slate-600" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" readOnly={previewMode} aria-readonly={previewMode} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Password</label>
                  <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" autoComplete="new-password" />
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
                </div>
              </div>
              <button onClick={() => {
                resetMessages();
                if (!accountType || !fullName.trim() || !email.trim() || password.length < 8 || password !== confirmPassword) {
                  setError("Choose Personal or Local Business, enter your name and email, use an 8+ character password, and make sure both passwords match.");
                  return;
                }
                setStep(2);
              }} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
                Continue: Build My Profile
              </button>
            </>
          ) : (
            <>
              {accountType === "business" && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
                  <div><label className={labelClass}>Business Name</label><input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Beachside Cleaners" /></div>
                  <div><label className={labelClass}>Business Category</label><input className={inputClass} value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} placeholder="Home Services, Cleaning, Lawn Care…" /></div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className={labelClass}>Phone <span className="normal-case font-normal">(optional)</span></label><input className={inputClass} value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="(219) 555-0123" /></div>
                    <div><label className={labelClass}>Website <span className="normal-case font-normal">(optional)</span></label><input className={inputClass} value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="yourbusiness.com" /></div>
                  </div>
                  <div><label className={labelClass}>About Your Business <span className="normal-case font-normal">(optional)</span></label><textarea className={`${inputClass} min-h-20 resize-none`} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Tell neighbors what your business does…" maxLength={500} /></div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City / Town</label>
                  <div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-muted-foreground" /><input className={`${inputClass} pl-9`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Michigan City" /></div>
                </div>
                <div>
                  <label className={labelClass}>ZIP Code</label>
                  <input className={inputClass} value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="46360" inputMode="numeric" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Neighborhood <span className="normal-case font-normal">(optional)</span></label>
                <input className={inputClass} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Long Beach, Trail Creek, downtown…" />
              </div>
              <div>
                <label className={labelClass}>About Me <span className="normal-case font-normal">(optional)</span></label>
                <textarea className={`${inputClass} min-h-24 resize-none`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell your neighbors a little about yourself…" maxLength={300} />
                <p className="text-[11px] text-muted-foreground text-right mt-1">{bio.length}/300</p>
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-2">
                  <Palette size={18} className="mt-0.5 flex-shrink-0 text-purple-700" />
                  <div>
                    <label className={labelClass}>Choose Your Profile Color</label>
                    <p className="text-xs leading-5 text-muted-foreground">Select a color to see exactly how it will look. You can change it later in Settings.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-1">
                    {PROFILE_THEME_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={theme === option.id}
                        onClick={() => setTheme(option.id)}
                        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-xs font-semibold transition-all ${theme === option.id ? "border-slate-800 ring-2 ring-slate-800/15" : "border-border text-muted-foreground hover:border-slate-400"}`}
                      >
                        <span className={`h-4 w-4 rounded-full ${option.swatch}`} aria-hidden="true" />
                        <span className="flex-1">{option.label}</span>
                        {theme === option.id ? <CheckCircle2 size={14} className={option.text} aria-hidden="true" /> : null}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-live="polite" aria-label={`${selectedTheme.label} profile preview`}>
                    <div className={`h-16 bg-gradient-to-r ${selectedTheme.cover} p-2.5 text-right`}>
                      <span className="rounded-full bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Live Preview</span>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="-mt-7 flex items-end justify-between gap-3">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-white ${selectedTheme.button} text-sm font-bold text-white shadow-sm`}>{previewInitials}</div>
                        <span className={`mb-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white ${selectedTheme.button}`}>Message</span>
                      </div>
                      <p className="mt-2 truncate text-sm font-bold text-slate-900">{previewName}</p>
                      <p className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${selectedTheme.text}`}><MapPin size={11} /> {previewLocation}</p>
                      <p className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-4 text-slate-700 ${selectedTheme.soft} ${selectedTheme.border}`}>{previewBio}</p>
                    </div>
                  </div>
                </div>
              </div>

              <details className="rounded-xl border border-border bg-muted/20 p-4">
                <summary className="cursor-pointer font-semibold text-sm text-blue-700">Read Community Guidelines & how badges work</summary>
                <div className="mt-4 max-h-96 overflow-y-auto pr-1">
                  <CommunityGuidelines compact />
                </div>
              </details>

              <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToGuidelines}
                  onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-blue-300"
                />
                <span className="text-sm text-blue-950">
                  I have read and agree to Neighborly's Community Guidelines, including the rules for respectful behavior, reporting, and how badges work.
                </span>
              </label>

              <div className="flex gap-2">
                <button onClick={() => { setStep(1); resetMessages(); }} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium">Back</button>
                <button disabled={busy || !agreedToGuidelines || (accountType === "business" && (!businessName.trim() || !businessCategory.trim()))} onClick={handleSignUp} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? "Submitting request…" : previewMode ? "Complete Safe Preview" : "Send Access Request"}</button>
              </div>
            </>
          )}

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2.5 text-sm">{error}</div>}
          {notice && <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2.5 text-sm flex gap-2"><CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />{notice}</div>}

          {screen === "form" && !previewMode && (
            <div className="text-center mt-2">
              {mode === "signin" ? (
                <p className="text-sm text-muted-foreground">New to Neighborly? <button onClick={() => { onSwitchMode("signup"); setStep(1); resetMessages(); }} className="text-blue-600 font-medium hover:underline">Request beta access</button></p>
              ) : (
                <p className="text-sm text-muted-foreground">Already registered or waiting for approval? <button onClick={() => { onSwitchMode("signin"); setStep(1); resetMessages(); }} className="text-blue-600 font-medium hover:underline">Sign in</button></p>
              )}
            </div>
          )}

          <div className="mt-2 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{previewMode ? "Preview entries stay in this browser tab only and are discarded when you leave." : "Your password is handled by secure authentication. Neighborly never stores a plain-text copy of it."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
