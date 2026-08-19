import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
`function BusinessProfileView({
  biz,
  onBack,
  onUserClick,
}: {
  biz: Business;
  onBack: () => void;
  onUserClick: (name: string) => void;
}) {`,
`function BusinessProfileView({
  biz,
  onBack,
  onUserClick,
  isOwnProfile = false,
}: {
  biz: Business;
  onBack: () => void;
  onUserClick: (name: string) => void;
  isOwnProfile?: boolean;
}) {`,
'business ownership prop');

replaceOnce(
`  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [reviewHelpful, setReviewHelpful] = useState<
    Record<number, boolean>
  >({});

  const visiblePhotos = photosExpanded
    ? biz.photos
    : biz.photos.slice(0, 4);`,
`  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [reviewHelpful, setReviewHelpful] = useState<Record<number, boolean>>({});
  const [businessPhotos, setBusinessPhotos] = useState(biz.photos);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnProfile) return;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const [{ data: businessRow }, { data: photos }, { data: profileRow }] = await Promise.all([
        supabase.from("business_profiles").select("logo_url, cover_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("profile_photos").select("image_url, caption").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setLogoUrl(businessRow?.logo_url || profileRow?.avatar_url || null);
      setCoverUrl(businessRow?.cover_url || null);
      if (photos) setBusinessPhotos(photos.map((p: any) => ({ url: p.image_url, alt: p.caption || "Business photo" })));
    })();
    return () => { active = false; };
  }, [isOwnProfile]);

  async function uploadBusinessFile(file: File, kind: "logo" | "cover" | "gallery") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be signed in to upload photos.");
    const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = user.id + "/business-" + kind + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
    const { error } = await supabase.storage.from("neighborly-media").upload(path, file, { contentType: file.type || "image/jpeg", cacheControl: "3600", upsert: false });
    if (error) throw error;
    return supabase.storage.from("neighborly-media").getPublicUrl(path).data.publicUrl;
  }

  async function saveBusinessImage(e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") {
    if (!isOwnProfile) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      const publicUrl = await uploadBusinessFile(file, kind);
      const update = kind === "logo" ? { logo_url: publicUrl } : { cover_url: publicUrl };
      const { error } = await supabase.from("business_profiles").update({ ...update, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (error) throw error;
      if (kind === "logo") {
        setLogoUrl(publicUrl);
        await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
      } else setCoverUrl(publicUrl);
    } catch (e: any) { setMediaError(e?.message || "Could not save business photo."); }
    finally { setMediaBusy(false); }
  }

  async function saveBusinessGallery(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isOwnProfile) return;
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      for (const photo of files) {
        const publicUrl = await uploadBusinessFile(photo, "gallery");
        const { error } = await supabase.from("profile_photos").insert({ user_id: user.id, image_url: publicUrl, caption: photo.name });
        if (error) throw error;
        setBusinessPhotos((prev) => [...prev, { url: publicUrl, alt: photo.name }]);
      }
    } catch (e: any) { setMediaError(e?.message || "Could not save business photos."); }
    finally { setMediaBusy(false); }
  }

  const visiblePhotos = photosExpanded ? businessPhotos : businessPhotos.slice(0, 4);`,
'business media state and persistence');

replaceOnce(
`          {/* Hero area */}
          <div className="pb-0">
            <div className="flex items-end gap-4 pb-4">`,
`          {/* Hero area */}
          <div className="pb-0">
            <div className="relative mb-4 h-36 sm:h-52 overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-cyan-500">
              {coverUrl && <img src={coverUrl} alt={biz.name + " cover"} className="h-full w-full object-cover" />}
              {isOwnProfile && <label className="absolute right-3 bottom-3 cursor-pointer rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold shadow"><Camera size={13} className="inline mr-1" />Change Cover<input type="file" accept="image/*" className="hidden" onChange={(e) => void saveBusinessImage(e, "cover")} /></label>}
            </div>
            {mediaError && isOwnProfile && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{mediaError}</div>}
            {mediaBusy && isOwnProfile && <div className="mb-3 text-xs text-muted-foreground">Saving photo…</div>}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 pb-4">`,
'business cover');

replaceOnce(
`              <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center text-primary flex-shrink-0">
                <Briefcase size={28} />
              </div>`,
`              <div className="relative w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" /> : <Briefcase size={28} />}
                {isOwnProfile && <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/55 py-1 text-center text-[10px] text-white">Edit<input type="file" accept="image/*" className="hidden" onChange={(e) => void saveBusinessImage(e, "logo")} /></label>}
              </div>`,
'business logo');

s = s.replace('className="flex gap-2 pb-1 flex-shrink-0"','className="flex w-full sm:w-auto gap-2 pb-1 flex-shrink-0"');
s = s.replace('className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg','className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg');
s = s.replace('className="flex items-center gap-1.5 border border-border bg-card px-4 py-2 rounded-lg','className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 border border-border bg-card px-4 py-2 rounded-lg');
s = s.replace('          <div className="flex border-t border-border">','          <div className="flex overflow-x-auto border-t border-border">');

replaceOnce(
`              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full flex items-center gap-1.5">
                <Camera size={11} /> {biz.photos.length} photos
              </span>`,
`              <div className="flex items-center gap-2">
                {isOwnProfile && <label className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Upload Photos<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void saveBusinessGallery(e)} /></label>}
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full flex items-center gap-1.5"><Camera size={11} /> {businessPhotos.length} photos</span>
              </div>`,
'business gallery upload');

s = s.replaceAll('biz.photos.length', 'businessPhotos.length');

fs.writeFileSync(file, s);
console.log('Patched persistent business cover, logo, and gallery media.');
