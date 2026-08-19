import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
  '  const [cropMode, setCropMode] = useState<"avatar" | "cover">("avatar");\n\n  const T = PROFILE_THEMES[theme];',
  `  const [cropMode, setCropMode] = useState<"avatar" | "cover">("avatar");\n  const [mediaBusy, setMediaBusy] = useState(false);\n  const [mediaError, setMediaError] = useState<string | null>(null);\n\n  const T = PROFILE_THEMES[theme];`,
  'media state',
);

replaceOnce(
  '  useEffect(() => {\n    document.documentElement.style.setProperty("--scrollbar-thumb", T.scrollbarColor);',
  `  useEffect(() => {\n    if (!isOwnProfile) return;\n    let active = true;\n    (async () => {\n      const { data: { user } } = await supabase.auth.getUser();\n      if (!user || !active) return;\n      const [{ data: row }, { data: photos }] = await Promise.all([\n        supabase.from("profiles").select("avatar_url, cover_url, theme").eq("id", user.id).maybeSingle(),\n        supabase.from("profile_photos").select("image_url, caption").eq("user_id", user.id).order("created_at", { ascending: true }),\n      ]);\n      if (!active) return;\n      if (row?.avatar_url) { setAvatarUrl(row.avatar_url); onAvatarChange?.(row.avatar_url); }\n      if (row?.cover_url) setCoverUrl(row.cover_url);\n      if (row?.theme && Object.prototype.hasOwnProperty.call(PROFILE_THEMES, row.theme)) setTheme(row.theme as ThemeName);\n      if (photos) setGallery(photos.map((p: any) => ({ url: p.image_url, alt: p.caption || "Profile photo" })));\n    })();\n    return () => { active = false; };\n  }, [isOwnProfile]);\n\n  useEffect(() => {\n    document.documentElement.style.setProperty("--scrollbar-thumb", T.scrollbarColor);`,
  'load persisted profile media',
);

replaceOnce(
  '  function applyAvatar(url: string) {\n    setAvatarUrl(url);\n    onAvatarChange?.(url);\n  }\n  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {\n    Array.from(e.target.files || []).forEach((f) => {\n      setGallery((prev) => [\n        ...prev,\n        { url: URL.createObjectURL(f), alt: f.name },\n      ]);\n    });\n  }',
  `  async function uploadMedia(blob: Blob, kind: "avatar" | "cover" | "gallery", originalName = "image.jpg") {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) throw new Error("You must be signed in to upload photos.");\n    const ext = (originalName.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";\n    const path = \`${user.id}/\${kind}/\${Date.now()}-\${Math.random().toString(36).slice(2)}.\${ext}\`;\n    const { error } = await supabase.storage.from("neighborly-media").upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "3600", upsert: false });\n    if (error) throw error;\n    return supabase.storage.from("neighborly-media").getPublicUrl(path).data.publicUrl;\n  }\n\n  async function applyAvatar(url: string) {\n    if (!isOwnProfile) return;\n    setMediaBusy(true); setMediaError(null);\n    try {\n      const blob = await fetch(url).then((r) => r.blob());\n      const publicUrl = await uploadMedia(blob, "avatar", "avatar.jpg");\n      const { data: { user } } = await supabase.auth.getUser();\n      if (!user) throw new Error("Not signed in");\n      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);\n      if (error) throw error;\n      setAvatarUrl(publicUrl); onAvatarChange?.(publicUrl);\n    } catch (e: any) { setMediaError(e?.message || "Could not save profile photo."); }\n    finally { setMediaBusy(false); }\n  }\n\n  async function applyCover(url: string) {\n    if (!isOwnProfile) return;\n    setMediaBusy(true); setMediaError(null);\n    try {\n      const blob = await fetch(url).then((r) => r.blob());\n      const publicUrl = await uploadMedia(blob, "cover", "cover.jpg");\n      const { data: { user } } = await supabase.auth.getUser();\n      if (!user) throw new Error("Not signed in");\n      const { error } = await supabase.from("profiles").update({ cover_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);\n      if (error) throw error;\n      setCoverUrl(publicUrl);\n    } catch (e: any) { setMediaError(e?.message || "Could not save cover photo."); }\n    finally { setMediaBusy(false); }\n  }\n\n  async function saveTheme(t: ThemeName) {\n    if (!isOwnProfile) return;\n    setTheme(t); setThemeOpen(false); setMediaError(null);\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) return;\n    const { error } = await supabase.from("profiles").update({ theme: t, updated_at: new Date().toISOString() }).eq("id", user.id);\n    if (error) setMediaError(error.message);\n  }\n\n  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {\n    if (!isOwnProfile) return;\n    const files = Array.from(e.target.files || []);\n    e.target.value = "";\n    if (!files.length) return;\n    setMediaBusy(true); setMediaError(null);\n    try {\n      const { data: { user } } = await supabase.auth.getUser();\n      if (!user) throw new Error("You must be signed in to upload photos.");\n      for (const f of files) {\n        const publicUrl = await uploadMedia(f, "gallery", f.name);\n        const { error } = await supabase.from("profile_photos").insert({ user_id: user.id, image_url: publicUrl, caption: f.name });\n        if (error) throw error;\n        setGallery((prev) => [...prev, { url: publicUrl, alt: f.name }]);\n      }\n    } catch (e: any) { setMediaError(e?.message || "Could not save profile photos."); }\n    finally { setMediaBusy(false); }\n  }`,
  'persist uploads',
);

replaceOnce(
  '            if (cropMode === "avatar") applyAvatar(url);\n            else setCoverUrl(url);',
  '            if (cropMode === "avatar") void applyAvatar(url);\n            else void applyCover(url);',
  'persist cropped avatar and cover',
);

replaceOnce(
  '                          onClick={() => { setTheme(t); setThemeOpen(false); }}',
  '                          onClick={() => { void saveTheme(t); }}',
  'persist theme',
);

replaceOnce(
  '      {/* Cover */}',
  '      {mediaError && isOwnProfile && <div className="mx-auto max-w-5xl px-4 pt-3"><div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{mediaError}</div></div>}\n      {mediaBusy && isOwnProfile && <div className="mx-auto max-w-5xl px-4 pt-3 text-xs text-muted-foreground">Saving photo…</div>}\n      {/* Cover */}',
  'media status',
);

fs.writeFileSync(file, s);
console.log('Patched persistent Supabase profile media uploads.');
