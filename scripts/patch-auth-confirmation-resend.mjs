import fs from "node:fs";

const authViewPath = new URL("../src/app/components/AuthView.tsx", import.meta.url);
let source = fs.readFileSync(authViewPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Confirmation resend patch failed: ${label}`);
  source = source.replace(needle, replacement);
}

replaceOnce(
  '    return "Please confirm your email address before signing in. Check your inbox and spam folder for the Neighborly email.";',
  '    return "Your email still needs to be confirmed. If your confirmation link expired, send a fresh one below.";',
  "email-not-confirmed message not found",
);

replaceOnce(
  '  const [notice, setNotice] = useState("");\n  const [showPassword, setShowPassword] = useState(false);',
  '  const [notice, setNotice] = useState("");\n  const [confirmationResendAvailable, setConfirmationResendAvailable] = useState(false);\n  const [resendCooldown, setResendCooldown] = useState(0);\n  const [showPassword, setShowPassword] = useState(false);',
  "auth message state not found",
);

replaceOnce(
  '  }, [initialScreen, onSuccess, previewMode]);\n\n  function resetMessages() {',
  `  }, [initialScreen, onSuccess, previewMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function resetMessages() {`,
  "auth effect anchor not found",
);

replaceOnce(
  '  function resetMessages() {\n    setError("");\n    setNotice("");\n  }',
  '  function resetMessages() {\n    setError("");\n    setNotice("");\n    setConfirmationResendAvailable(false);\n  }',
  "resetMessages not found",
);

replaceOnce(
  `    if (signInError || !data.user) {
      setError(getFriendlyAuthError(signInError, "sign-in"));
      return;
    }`,
  `    if (signInError || !data.user) {
      const code = signInError?.code?.toLowerCase() || "";
      const message = signInError?.message?.toLowerCase() || "";
      setConfirmationResendAvailable(code === "email_not_confirmed" || message.includes("email not confirmed"));
      setError(getFriendlyAuthError(signInError, "sign-in"));
      return;
    }
    setConfirmationResendAvailable(false);`,
  "sign-in error block not found",
);

const forgotAnchor = '  async function handleForgotPassword() {';
if (!source.includes('async function handleResendConfirmation()')) {
  if (!source.includes(forgotAnchor)) throw new Error("Confirmation resend patch failed: forgot-password handler anchor not found.");
  const resendHandler = `  async function handleResendConfirmation() {
    if (!email.trim() || resendCooldown > 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: \`${'${getAuthRedirectOrigin()}'}\/auth\/callback?next=${'${encodeURIComponent("/profile")}'}\`,
      },
    });
    setBusy(false);

    if (resendError) {
      setError(getFriendlyAuthError(resendError, "sign-up"));
      return;
    }

    setConfirmationResendAvailable(true);
    setResendCooldown(60);
    setNotice("A fresh confirmation email is on the way. Use the newest Neighborly link; older confirmation links may no longer work.");
  }

`;
  source = source.replace(forgotAnchor, `${resendHandler}${forgotAnchor}`);
}

const signInButton = `              <button disabled={busy} onClick={handleSignIn} className="w-full mt-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Signing in…" : "Sign In"}
              </button>`;
const signInButtonWithResend = `${signInButton}
              {confirmationResendAvailable && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Need a new confirmation link?</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">If the first link expired, Neighborly can send a fresh one to the email above.</p>
                  <button
                    type="button"
                    disabled={busy || resendCooldown > 0}
                    onClick={handleResendConfirmation}
                    className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? \`Send again in \${resendCooldown}s\` : "Send a new confirmation email"}
                  </button>
                </div>
              )}`;
replaceOnce(signInButton, signInButtonWithResend, "sign-in button not found");

const required = [
  "async function handleResendConfirmation()",
  'type: "signup"',
  "Send a new confirmation email",
  "resendCooldown",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Confirmation resend patch verification failed: ${marker}`);
}

fs.writeFileSync(authViewPath, source);
console.log("Added Neighborly confirmation-link resend recovery with a short cooldown.");
