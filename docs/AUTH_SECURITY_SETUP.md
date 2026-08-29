# Neighborly Authentication Security Setup

This file documents authentication protections that depend on provider credentials or Supabase plan settings and therefore should not be hard-coded into the repository.

## Already in place

- Supabase Auth email/password authentication
- Email confirmation remains enabled
- Custom SMTP is configured with Neighborly's verified sending domain
- Invite-only member approval gate
- Friendly signup/reset email errors
- Minimum 8-character password check in the Neighborly UI
- Database access is protected with Row Level Security
- Suspended/banned members are denied community access by database authorization and shown a clear account-status screen

## CAPTCHA / bot protection

Supabase supports Cloudflare Turnstile and hCaptcha for sign-up, sign-in, and password reset.

Do not enable the Supabase CAPTCHA switch until the matching frontend widget/token is also configured. If Supabase requires a CAPTCHA token and the Neighborly frontend does not send one, authentication requests will fail.

Recommended future setup:

1. Create a Cloudflare Turnstile or hCaptcha site for `neighborshelpingneighbors.online`.
2. Keep the provider **secret key private**. Enter it directly in Supabase Dashboard; do not commit it to GitHub or paste it into chat/issues.
3. A provider site key is designed to be public and can be supplied to the frontend through a Vercel environment variable.
4. Add the provider widget to Neighborly sign-up/sign-in/password-reset screens.
5. Pass the returned `captchaToken` in the appropriate Supabase Auth request options.
6. Enable CAPTCHA in Supabase Auth > Bot and Abuse Protection.
7. Test sign-up, sign-in, and forgot-password on production before keeping the switch enabled.

Supabase documentation: https://supabase.com/docs/guides/auth/auth-captcha

## Leaked password protection

Supabase can reject passwords found in known breach lists through the HaveIBeenPwned Pwned Passwords service.

As of the current Supabase documentation, leaked-password protection is available on **Supabase Pro and above**. Do not upgrade the project or enable a paid feature without an explicit decision by the Neighborly owner.

Supabase documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Password requirements

Neighborly currently checks for at least 8 characters in the UI. Supabase recommends at least 8 characters and can also enforce required character classes at the Auth-project level.

Before public launch, review the Supabase Email provider password requirements and choose a project-level policy that matches the wording shown in Neighborly's signup/reset UI.

## Authentication email test

After any SMTP/Auth change, test all three flows with real inboxes:

- New personal signup and email confirmation
- New business signup and email confirmation
- Forgot Password / password reset

Also confirm confirmation and reset links return to the correct `neighborshelpingneighbors.online` routes.

## Secrets policy

Never commit or paste these values into source code, issues, screenshots, or chat:

- Resend API key / SMTP password
- CAPTCHA secret key
- Supabase service-role/secret key
- Vercel deployment secrets

Public browser values such as a Supabase publishable/anon key or CAPTCHA site key still should be managed deliberately through project environment configuration where appropriate.
