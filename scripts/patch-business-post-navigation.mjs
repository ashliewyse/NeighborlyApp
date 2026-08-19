import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

// Navigation-only follow-up: business-authored posts must open the saved business profile,
// not the owner's personal profile. Post/photo persistence is intentionally untouched.
const marker = '  async function goToUser(name: string, authorId?: string) {\n';
if (!s.includes(marker)) throw new Error('Business navigation patch: goToUser not found');

const replacement = `  async function goToUser(name: string, authorId?: string) {\n    // If this author owns a saved business profile and the displayed post name matches\n    // that business, route to the business view before attempting a personal profile.\n    if (authorId) {\n      const { data: businessRow } = await supabase\n        .from("business_profiles")\n        .select("*")\n        .eq("user_id", authorId)\n        .maybeSingle();\n\n      if (businessRow?.business_name && businessRow.business_name.trim().toLowerCase() === name.trim().toLowerCase()) {\n        const businessId = BUSINESSES.find((b) => b.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;\n        if (businessId) {\n          setView({ page: "business", id: businessId });\n          return;\n        }\n\n        // The signed-in business profile is already hydrated from business_profiles by the\n        // existing current-business loader. Use its established business route.\n        const { data: { user: signedInUser } } = await supabase.auth.getUser();\n        if (signedInUser?.id === authorId) {\n          setView({ page: "business", id: 999 });\n          return;\n        }\n      }\n    }\n`;

s = s.replace(marker, replacement);
fs.writeFileSync(file, s);
console.log('Patched business post navigation without changing post/photo persistence.');
