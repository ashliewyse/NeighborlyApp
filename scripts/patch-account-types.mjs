import fs from 'node:fs';

const file = 'src/app/components/AuthView.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
  '    bio: m.bio || "",\n    theme: m.theme || "classic-blue",\n    updated_at: new Date().toISOString(),\n  });\n}',
  `    bio: m.bio || "",\n    theme: m.theme || "classic-blue",\n    account_type: m.account_type || "personal",\n    updated_at: new Date().toISOString(),\n  });\n\n  if (m.account_type === "business" && m.business_name) {\n    await supabase.from("business_profiles").upsert({\n      user_id: user.id,\n      business_name: m.business_name || "",\n      category: m.business_category || "Local Business",\n      owner_name: m.full_name || "",\n      description: m.business_description || "",\n      city: m.city || "",\n      zip_code: m.zip_code || "",\n      neighborhood: m.neighborhood || "",\n      phone: m.business_phone || "",\n      website: m.business_website || "",\n      theme: m.theme || "classic-blue",\n      updated_at: new Date().toISOString(),\n    }, { onConflict: "user_id" });\n  }\n}`,
  'sync account and business profile',
);

replaceOnce(
  '  const [fullName, setFullName] = useState("");\n',
  `  const [accountType, setAccountType] = useState<"personal" | "business" | "">("");\n  const [fullName, setFullName] = useState("");\n  const [businessName, setBusinessName] = useState("");\n  const [businessCategory, setBusinessCategory] = useState("");\n  const [businessPhone, setBusinessPhone] = useState("");\n  const [businessWebsite, setBusinessWebsite] = useState("");\n  const [businessDescription, setBusinessDescription] = useState("");\n`,
  'account type state',
);

replaceOnce(
  '          full_name: fullName.trim(),\n          city: city.trim(),',
  `          account_type: accountType || "personal",\n          full_name: fullName.trim(),\n          business_name: accountType === "business" ? businessName.trim() : "",\n          business_category: accountType === "business" ? businessCategory.trim() : "",\n          business_phone: accountType === "business" ? businessPhone.trim() : "",\n          business_website: accountType === "business" ? businessWebsite.trim() : "",\n          business_description: accountType === "business" ? businessDescription.trim() : "",\n          city: city.trim(),`,
  'signup metadata',
);

replaceOnce(
  '          ) : step === 1 ? (\n            <>\n              <div>\n                <label className={labelClass}>Full Name</label>',
  `          ) : step === 1 ? (\n            <>\n              <div>\n                <label className={labelClass}>Account Type</label>\n                <p className="text-xs text-muted-foreground mb-2">Choose how you want to use Neighborly.</p>\n                <div className="grid grid-cols-2 gap-3">\n                  <button type="button" onClick={() => setAccountType("personal")} className={\`rounded-xl border p-4 text-left transition-all \${accountType === "personal" ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border hover:border-blue-300"}\`}>\n                    <div className="text-2xl mb-1">👤</div><div className="font-semibold text-sm">Personal Account</div><div className="text-xs text-muted-foreground mt-1">Connect, post, help neighbors, and build your profile.</div>\n                  </button>\n                  <button type="button" onClick={() => setAccountType("business")} className={\`rounded-xl border p-4 text-left transition-all \${accountType === "business" ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border hover:border-blue-300"}\`}>\n                    <div className="text-2xl mb-1">🏪</div><div className="font-semibold text-sm">Local Business</div><div className="text-xs text-muted-foreground mt-1">Create a business profile and connect with local customers.</div>\n                  </button>\n                </div>\n              </div>\n              <div>\n                <label className={labelClass}>{accountType === "business" ? "Owner / Contact Name" : "Full Name"}</label>`,
  'account type selector UI',
);

replaceOnce(
  '                if (!fullName.trim() || !email.trim() || password.length < 8 || password !== confirmPassword) {\n                  setError("Enter your name and email, use an 8+ character password, and make sure both passwords match.");',
  '                if (!accountType || !fullName.trim() || !email.trim() || password.length < 8 || password !== confirmPassword) {\n                  setError("Choose Personal or Local Business, enter your name and email, use an 8+ character password, and make sure both passwords match.");',
  'account type validation',
);

replaceOnce(
  '          ) : (\n            <>\n              <div className="grid sm:grid-cols-2 gap-3">',
  `          ) : (\n            <>\n              {accountType === "business" && (\n                <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">\n                  <div><label className={labelClass}>Business Name</label><input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Beachside Cleaners" /></div>\n                  <div><label className={labelClass}>Business Category</label><input className={inputClass} value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} placeholder="Home Services, Cleaning, Lawn Care…" /></div>\n                  <div className="grid sm:grid-cols-2 gap-3">\n                    <div><label className={labelClass}>Phone <span className="normal-case font-normal">(optional)</span></label><input className={inputClass} value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="(219) 555-0123" /></div>\n                    <div><label className={labelClass}>Website <span className="normal-case font-normal">(optional)</span></label><input className={inputClass} value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="yourbusiness.com" /></div>\n                  </div>\n                  <div><label className={labelClass}>About Your Business <span className="normal-case font-normal">(optional)</span></label><textarea className={\`\${inputClass} min-h-20 resize-none\`} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Tell neighbors what your business does…" maxLength={500} /></div>\n                </div>\n              )}\n              <div className="grid sm:grid-cols-2 gap-3">`,
  'business profile fields',
);

replaceOnce(
  '                <button disabled={busy} onClick={handleSignUp} className="flex-1 bg-blue-600',
  '                <button disabled={busy || (accountType === "business" && (!businessName.trim() || !businessCategory.trim()))} onClick={handleSignUp} className="flex-1 bg-blue-600',
  'business required fields',
);

fs.writeFileSync(file, s);
console.log('Patched registration with Personal and Local Business account types.');
