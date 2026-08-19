import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

const replacements = [
  [
    'const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);',
    'const { error } = await supabase.rpc("set_my_profile_media", { p_avatar_url: publicUrl, p_cover_url: null, p_theme: null });'
  ],
  [
    'const { error } = await supabase.from("profiles").update({ cover_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);',
    'const { error } = await supabase.rpc("set_my_profile_media", { p_avatar_url: null, p_cover_url: publicUrl, p_theme: null });'
  ],
  [
    'const { error } = await supabase.from("profiles").update({ theme: t, updated_at: new Date().toISOString() }).eq("id", user.id);',
    'const { error } = await supabase.rpc("set_my_profile_media", { p_avatar_url: null, p_cover_url: null, p_theme: t });'
  ]
];

for (const [from, to] of replacements) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${from.slice(0, 60)}`);
  s = s.replace(from, to);
}

fs.writeFileSync(file, s);
console.log('Patched personal profile media saves to use authenticated RPC.');
