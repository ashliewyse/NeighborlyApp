import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
  'import { AuthView as SupabaseAuthView } from "@/app/components/AuthView";\n',
  'import { AuthView as SupabaseAuthView } from "@/app/components/AuthView";\nimport { SettingsView } from "@/app/components/SettingsView";\nimport { supabase } from "@/lib/supabase";\n',
  'settings + supabase import',
);

replaceOnce(
  '  | { page: "user"; name: string }\n  | { page: "auth"; mode: "signin" | "signup" }',
  '  | { page: "user"; name: string }\n  | { page: "me" }\n  | { page: "my-business" }\n  | { page: "settings" }\n  | { page: "auth"; mode: "signin" | "signup" }',
  'me/business/settings view type',
);

replaceOnce(
  '  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);\n',
  '  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);\n  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);\n  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);\n  const [currentAccountType, setCurrentAccountType] = useState<"personal" | "business">("personal");\n  const [authReady, setAuthReady] = useState(false);\n',
  'current account state',
);

replaceOnce(
  '  function toggleJoinGroup(id: number) {\n',
  `  async function loadCurrentProfile(goToProfile = false) {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) {\n      setCurrentProfile(null);\n      setCurrentBusiness(null);\n      setCurrentAccountType("personal");\n      setAuthReady(true);\n      return;\n    }\n\n    const { data: row } = await supabase\n      .from("profiles")\n      .select("*")\n      .eq("id", user.id)\n      .maybeSingle();\n\n    const m = user.user_metadata || {};\n    const accountType = (row?.account_type || m.account_type) === "business" ? "business" : "personal";\n    setCurrentAccountType(accountType);\n\n    const created = row?.created_at ? new Date(row.created_at) : new Date(user.created_at);\n    const profile: UserProfile = {\n      name: row?.full_name || m.full_name || user.email?.split("@")[0] || "Neighbor",\n      neighborhood: row?.neighborhood || m.neighborhood || row?.city || m.city || "Your neighborhood",\n      city: row?.city || m.city || "Michigan City",\n      joinDate: created.toLocaleDateString(undefined, { month: "long", year: "numeric" }),\n      bio: row?.bio || m.bio || "",\n      badges: ["newcomer"],\n      posts: 0, neighbors: 0, helpfulVotes: 0, recsGiven: 0, rating: 0, ratingCount: 0,\n      neighborReviews: [], galleryPhotos: [], recentActivity: [],\n    };\n\n    setCurrentProfile(profile);\n    setMyAvatarUrl(row?.avatar_url || null);\n\n    if (accountType === "business") {\n      const { data: businessRow } = await supabase\n        .from("business_profiles")\n        .select("*")\n        .eq("user_id", user.id)\n        .maybeSingle();\n      const services = Array.isArray(businessRow?.services) ? businessRow.services : typeof businessRow?.services === "string" && businessRow.services.trim() ? businessRow.services.split(",").map((v: string) => v.trim()).filter(Boolean) : [];\n      setCurrentBusiness({\n        id: -1,\n        name: businessRow?.business_name || m.business_name || profile.name,\n        category: businessRow?.category || m.business_category || "Local Business",\n        city: businessRow?.city || row?.city || m.city || "Michigan City",\n        rating: 0, reviewCount: 0, badges: [],\n        description: businessRow?.description || m.business_description || "",\n        services, photos: [], phone: businessRow?.phone || m.business_phone || "", email: user.email || "",\n        website: businessRow?.website || m.business_website || "",\n        address: [businessRow?.neighborhood || row?.neighborhood || m.neighborhood, businessRow?.city || row?.city || m.city, businessRow?.zip_code || row?.zip_code || m.zip_code].filter(Boolean).join(", "),\n        hours: [], founded: String(created.getFullYear()), owner: businessRow?.owner_name || profile.name, reviews: [],\n      });\n    } else setCurrentBusiness(null);\n\n    if (row?.city && LOCATIONS.includes(row.city as LocationName)) setActiveLocation(row.city as LocationName);\n    setAuthReady(true);\n    if (goToProfile) setView({ page: accountType === "business" ? "my-business" : "me" });\n    else setView({ page: "feed" });\n  }\n\n  useEffect(() => {\n    let active = true;\n    supabase.auth.getSession().then(async ({ data }) => { if (!active) return; if (data.session?.user) await loadCurrentProfile(false); else setAuthReady(true); });\n    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {\n      if (!active) return;\n      if (event === "SIGNED_OUT") { setCurrentProfile(null); setCurrentBusiness(null); setCurrentAccountType("personal"); setView({ page: "auth", mode: "signin" }); }\n    });\n    return () => { active = false; authListener.subscription.unsubscribe(); };\n  }, []);\n\n  function toggleJoinGroup(id: number) {\n`,
  'account-aware profile loader',
);

replaceOnce('  if (view.page === "auth") {\n', '  if (!authReady) return <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">Loading your Neighborly profile…</div>;\n\n  if (view.page === "auth") {\n', 'auth loading gate');
replaceOnce('        onSuccess={() => setView({ page: "feed" })}\n','        onSuccess={() => { void loadCurrentProfile(false); }}\n','auth success');
replaceOnce(
  '  if (view.page === "business") {\n',
  '  if (view.page === "settings") return <SettingsView onBack={() => setView({ page: "feed" })} />;\n  if (view.page === "me" && currentProfile) return <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />;\n  if (view.page === "my-business" && currentBusiness) return <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />;\n  if (view.page === "business") {\n',
  'account views',
);
replaceOnce(
  '<button onClick={() => goToUser("Maria Santos")}>\n              <Avatar name="Maria Santos" size="sm" src={myAvatarUrl} />\n            </button>',
  '<button onClick={() => setView({ page: "settings" })} className="inline-flex px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary" aria-label="Settings">⚙️<span className="hidden sm:inline ml-1">Settings</span></button>\n            <button onClick={() => setView({ page: currentAccountType === "business" ? "my-business" : "me" })}>\n              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="sm" src={myAvatarUrl} />\n            </button>',
  'mobile settings + account avatar',
);
s = s.replaceAll('<Avatar name="Maria Santos" size="md" src={myAvatarUrl} />','<Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="md" src={myAvatarUrl} />');
replaceOnce('      author: "Maria Santos",\n      authorBadges: ["champion"],','      author: currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "You"),\n      authorBadges: ["newcomer"],','post author');

fs.writeFileSync(file, s);
console.log('Patched account identity, business profile routing, and mobile settings.');
