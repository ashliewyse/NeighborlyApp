import React, { useEffect, useState } from "react";
import { ChevronLeft, CheckCircle2, Eye, EyeOff, KeyRound, MapPin, ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";
import { supabase } from "@/lib/supabase";

type AuthMode = "signin" | "signup";
type AuthScreen = "form" | "forgot" | "recovery";

interface AuthViewProps {
  mode: AuthMode;
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: () => void;
}

async function syncProfileFromMetadata(user: any) {
  if (!user?.id) return;
  const m = user.user_metadata || {};
  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: m.full_name || "",
    city: m.city || "",
    zip_code: m.zip_code || "",
    neighborhood: m.neighborhood || "",
    bio: m.bio || "",
    theme: m.theme || "classic-blue",
    updated_at: new Date().toISOString(),
  });
}

export function AuthView({ mode, onSwitchMode, onSuccess }: AuthViewProps) {
  const [screen, setScreen] = useState<AuthScreen>("form");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState("classic-blue");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session?.user) return;
      await syncProfileFromMetadata(data.session.user);
      onSuccess();
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
  }, [onSuccess]);

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
      setError(signInError?.message || "We couldn't sign you in.");
      return;
    }
    await syncProfileFromMetadata(data.user);
    onSuccess();
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

    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          city: city.trim(),
          zip_code: zipCode.trim(),
          neighborhood: neighborhood.trim(),
          bio: bio.trim(),
          theme,
        },
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session?.user) {
      await syncProfileFromMetadata(data.session.user);
      onSuccess();
      return;
    }

    setNotice("Account created. Check your email to verify your address, then come back and sign in.");
    setStep(1);
  }

  async function handleForgotPassword() {
    resetMessages();
    if (!email.trim()) {
      setError("Enter the email you registered with.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (resetError) {
      setError(resetError.message);
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
      setError(updateError.message);
      return;
    }
    setNotice("Password updated. You're signed in.");
    setTimeout(onSuccess, 600);
  }

  const inputClass = "w-full bg-muted rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20";
  const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1";

  return (
    <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4 font-['DM_Sans',sans-serif]">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-36 mx-auto mb-4">
            <ImageWithFallback src={neighborlyLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
          </div>
          <h1 className="font-['Playfair_Display',serif] font-bold text-2xl text-foreground">
            {screen === "forgot" ? "Reset your password" : screen === "recovery" ? "Choose a new password" : mode === "signin" ? "Welcome back" : "Join your neighborhood"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {screen === "forgot" ? "We'll email a secure reset link to your registered address." : screen === "recovery" ? "Create a new password for your Neighborly account." : mode === "signin" ? "Sign in to your Neighborly account" : "Create your account and basic profile together"}
          </p>
        </div>

        {mode === "signup" && screen === "form" && (
          <div className="mb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
              <span className={step >= 1 ? "text-blue-600" : ""}>1 Account</span>
              <div className="h-px flex-1 bg-border" />
              <span className={step >= 2 ? "text-blue-600" : ""}>2 Profile</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: step === 1 ? "50%" : "100%" }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {screen === "recovery" ? (
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
              <div>
                <label className={labelClass}>Full Name</label>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maria Santos" autoComplete="name" />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
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
                if (!fullName.trim() || !email.trim() || password.length < 8 || password !== confirmPassword) {
                  setError("Enter your name and email, use an 8+ character password, and make sure both passwords match.");
                  return;
                }
                setStep(2);
              }} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
                Continue to Profile
              </button>
            </>
          ) : (
            <>
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
              <div>
                <label className={labelClass}>Profile Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: "classic-blue", label: "Classic Blue" }, { id: "purple", label: "Purple" }, { id: "teal", label: "Teal" }].map((t) => (
                    <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`rounded-lg border px-2 py-2 text-xs font-medium ${theme === t.id ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600" : "border-border text-muted-foreground"}`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStep(1); resetMessages(); }} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium">Back</button>
                <button disabled={busy} onClick={handleSignUp} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? "Creating account…" : "Create Account"}</button>
              </div>
            </>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2.5 text-sm">{error}</div>}
          {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2.5 text-sm flex gap-2"><CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />{notice}</div>}

          {screen === "form" && (
            <div className="text-center mt-2">
              {mode === "signin" ? (
                <p className="text-sm text-muted-foreground">Don't have an account? <button onClick={() => { onSwitchMode("signup"); setStep(1); resetMessages(); }} className="text-blue-600 font-medium hover:underline">Sign up</button></p>
              ) : (
                <p className="text-sm text-muted-foreground">Already registered? <button onClick={() => { onSwitchMode("signin"); setStep(1); resetMessages(); }} className="text-blue-600 font-medium hover:underline">Sign in</button></p>
              )}
            </div>
          )}

          <div className="mt-2 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>Your password is handled by secure authentication. Neighborly never stores a plain-text copy of it.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
