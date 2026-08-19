import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function mustReplace(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

// Real profiles need their Supabase UUID so reviews and ownership resolve to the
// exact account instead of only matching a display name.
if (!s.includes('  userId?: string;\n  name: string;')) {
  mustReplace('interface UserProfile {\n  name: string;', 'interface UserProfile {\n  userId?: string;\n  name: string;', 'UserProfile userId');
}

// The signed-in personal profile is always owned by the authenticated user.
s = s.replace('    const profile: UserProfile = {\n      name:', '    const profile: UserProfile = {\n      userId: user.id,\n      name:');

// Profiles opened from the feed/search retain the target account UUID.
s = s.replace('      USER_PROFILES[resolvedName] = {\n      name: resolvedName,', '      USER_PROFILES[resolvedName] = {\n      userId: row.id,\n      name: resolvedName,');
s = s.replace('      USER_PROFILES[resolvedName] = {\n        name: resolvedName,', '      USER_PROFILES[resolvedName] = {\n        userId: row.id,\n        name: resolvedName,');

const start = s.indexOf('function UserProfileView(');
const end = s.indexOf('// ─── Search View', start);
if (start < 0 || end < 0) throw new Error('UserProfileView block not found');
let b = s.slice(start, end);

// State for saved reviews.
b = b.replace(
  '  const [reviewSubmitted, setReviewSubmitted] = useState(false);',
  '  const [reviewSubmitted, setReviewSubmitted] = useState(false);\n  const [reviewBusy, setReviewBusy] = useState(false);\n  const [reviewError, setReviewError] = useState<string | null>(null);',
);

// Load persisted reviews for a real Supabase profile. Demo fixture profiles keep
// their fixture reviews when no userId is available.
const themeEffect = '  useEffect(() => {\n    document.documentElement.style.setProperty("--scrollbar-thumb", T.scrollbarColor);';
if (!b.includes(themeEffect)) throw new Error('theme effect anchor not found');
const reviewLoader = `  useEffect(() => {\n    if (!profile.userId) return;\n    let active = true;\n    (async () => {\n      const { data: rows, error } = await supabase\n        .from("neighbor_reviews")\n        .select("id, reviewer_id, rating, body, created_at")\n        .eq("reviewee_id", profile.userId)\n        .order("created_at", { ascending: false });\n      if (!active) return;\n      if (error) { setReviewError(error.message); return; }\n      const reviewerIds = Array.from(new Set((rows || []).map((r: any) => r.reviewer_id)));\n      let names = new Map<string,string>();\n      if (reviewerIds.length) {\n        const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", reviewerIds);\n        names = new Map((people || []).map((p: any) => [p.id, p.full_name || "Neighbor"]));\n      }\n      setReviews((rows || []).map((r: any) => ({\n        id: Number(r.id),\n        author: names.get(r.reviewer_id) || "Neighbor",\n        authorBadges: [],\n        rating: Number(r.rating),\n        date: new Date(r.created_at).toLocaleDateString(),\n        body: r.body,\n        helpful: 0,\n      })));\n      const { data: { user } } = await supabase.auth.getUser();\n      if (user && (rows || []).some((r: any) => r.reviewer_id === user.id)) setReviewSubmitted(true);\n    })();\n    return () => { active = false; };\n  }, [profile.userId]);\n\n`;
b = b.replace(themeEffect, reviewLoader + themeEffect);

// Persist instead of only changing React state. One review per reviewer/profile;
// submitting again updates that review rather than creating duplicates.
const submitStart = b.indexOf('  function submitReview() {');
if (submitStart < 0) throw new Error('submitReview not found');
const submitEnd = b.indexOf('\n  }', submitStart);
if (submitEnd < 0) throw new Error('submitReview end not found');
const oldSubmit = b.slice(submitStart, submitEnd + 4);
const newSubmit = `  async function submitReview() {\n    if (!pickedStar || !reviewText.trim() || !profile.userId || isOwnProfile) return;\n    setReviewBusy(true); setReviewError(null);\n    try {\n      const { data: { user } } = await supabase.auth.getUser();\n      if (!user) throw new Error("You must be signed in to leave a review.");\n      if (user.id === profile.userId) throw new Error("You cannot review your own profile.");\n      const body = reviewText.trim();\n      const { data: saved, error } = await supabase.from("neighbor_reviews").upsert({\n        reviewer_id: user.id, reviewee_id: profile.userId, rating: pickedStar, body, updated_at: new Date().toISOString()\n      }, { onConflict: "reviewer_id,reviewee_id" }).select("id, created_at").single();\n      if (error) throw error;\n      const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();\n      setReviews((prev) => [\n        { id: Number(saved.id), author: me?.full_name || "You", authorBadges: [], rating: pickedStar, date: new Date(saved.created_at).toLocaleDateString(), body, helpful: 0 },\n        ...prev.filter((r) => r.id !== Number(saved.id)),\n      ]);\n      setReviewSubmitted(true); setPickedStar(0); setReviewText("");\n    } catch (e: any) { setReviewError(e?.message || "Could not save your review."); }\n    finally { setReviewBusy(false); }\n  }`;
b = b.replace(oldSubmit, newSubmit);

// Only the owner should even SEE cover editing. The persistence functions already
// reject non-owners; this fixes the misleading UI too.
const coverLabel = `        <label className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors backdrop-blur-sm">\n          <Camera size={13} /> Change Cover\n          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />\n        </label>`;
if (!b.includes(coverLabel)) throw new Error('Change Cover UI not found');
b = b.replace(coverLabel, `{isOwnProfile && (\n${coverLabel}\n        )}`);

// Photo uploads/add-more are also owner-only. Visitors can view the gallery but
// cannot modify it.
const uploadPhotos = `              <label className={\`flex items-center gap-1.5 \${T.btn} text-white text-xs font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors\`}>\n                <Plus size={13} /> Upload Photos\n                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />\n              </label>`;
if (b.includes(uploadPhotos)) b = b.replace(uploadPhotos, `{isOwnProfile && (\n${uploadPhotos}\n              )}`);
const addMore = `              <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors text-muted-foreground">\n                <Plus size={20} className="mb-1 opacity-50" />\n                <span className="text-xs">Add more</span>\n                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />\n              </label>`;
if (b.includes(addMore)) b = b.replace(addMore, `{isOwnProfile && (\n${addMore}\n              )}`);

// Owners do not review themselves. Visitors get the review form, persisted-error
// feedback, and a disabled state while Supabase saves it.
const formCardStart = '            <div className="bg-white rounded-xl border border-border p-5">\n              <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${T.accent}`}>\n                <MessageSquare size={14} /> Rate &amp; Review {profile.name.split(" ")[0]}';
const formPos = b.indexOf(formCardStart);
if (formPos >= 0) {
  const cardEndMarker = '            </div>\n\n            {reviews.map((r) => (';
  const cardEnd = b.indexOf(cardEndMarker, formPos);
  if (cardEnd < 0) throw new Error('review card end not found');
  let card = b.slice(formPos, cardEnd + '            </div>'.length);
  card = card.replace('disabled={!pickedStar || !reviewText.trim()}', 'disabled={!pickedStar || !reviewText.trim() || reviewBusy || !profile.userId}');
  card = card.replace('>\n                    Submit Review\n                  </button>', '>\n                    {reviewBusy ? "Saving…" : "Submit Review"}\n                  </button>');
  card = card.replace('              {reviewSubmitted ? (', '              {reviewError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</div>}\n              {reviewSubmitted ? (');
  b = b.slice(0, formPos) + `{!isOwnProfile && (\n${card}\n            )}` + b.slice(cardEnd + '            </div>'.length);
}

s = s.slice(0, start) + b + s.slice(end);
fs.writeFileSync(file, s);
console.log('Personal profile editing is owner-only and neighbor reviews persist in Supabase.');
