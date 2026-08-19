import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
  'import { AuthView as SupabaseAuthView } from "@/app/components/AuthView";\n',
  'import { AuthView as SupabaseAuthView } from "@/app/components/AuthView";\nimport { supabase } from "@/lib/supabase";\n',
  'supabase import',
);

replaceOnce(
  '  | { page: "user"; name: string }\n  | { page: "auth"; mode: "signin" | "signup" }',
  '  | { page: "user"; name: string }\n  | { page: "me" }\n  | { page: "auth"; mode: "signin" | "signup" }',
  'me view type',
);

replaceOnce(
  '  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);\n',
  '  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);\n  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);\n  const [authReady, setAuthReady] = useState(false);\n',
  'current profile state',
);

replaceOnce(
  '  function toggleJoinGroup(id: number) {\n',
  `  async function loadCurrentProfile(goToProfile = false) {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) {\n      setCurrentProfile(null);\n      setAuthReady(true);\n      return;\n    }\n\n    const { data: row } = await supabase\n      .from("profiles")\n      .select("*")\n      .eq("id", user.id)\n      .maybeSingle();\n\n    const m = user.user_metadata || {};\n    const created = row?.created_at ? new Date(row.created_at) : new Date(user.created_at);\n    const profile: UserProfile = {\n      name: row?.full_name || m.full_name || user.email?.split("@")[0] || "Neighbor",\n      neighborhood: row?.neighborhood || m.neighborhood || row?.city || m.city || "Your neighborhood",\n      city: row?.city || m.city || "Michigan City",\n      joinDate: created.toLocaleDateString(undefined, { month: "long", year: "numeric" }),\n      bio: row?.bio || m.bio || "",\n      badges: ["newcomer"],\n      posts: 0,\n      neighbors: 0,\n      helpfulVotes: 0,\n      recsGiven: 0,\n      rating: 0,\n      ratingCount: 0,\n      neighborReviews: [],\n      galleryPhotos: [],\n      recentActivity: [],\n    };\n\n    setCurrentProfile(profile);\n    setMyAvatarUrl(row?.avatar_url || null);\n    if (row?.city && LOCATIONS.includes(row.city as LocationName)) {\n      setActiveLocation(row.city as LocationName);\n    }\n    setAuthReady(true);\n    if (goToProfile) setView({ page: "me" });\n    else setView({ page: "feed" });\n  }\n\n  useEffect(() => {\n    let active = true;\n    supabase.auth.getSession().then(async ({ data }) => {\n      if (!active) return;\n      if (data.session?.user) await loadCurrentProfile(false);\n      else setAuthReady(true);\n    });\n    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {\n      if (!active) return;\n      if (event === "SIGNED_OUT") {\n        setCurrentProfile(null);\n        setView({ page: "auth", mode: "signin" });\n      }\n    });\n    return () => {\n      active = false;\n      authListener.subscription.unsubscribe();\n    };\n  }, []);\n\n  function toggleJoinGroup(id: number) {\n`,
  'profile loader',
);

replaceOnce(
  '  if (view.page === "auth") {\n',
  `  if (!authReady) {\n    return (\n      <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white font-['DM_Sans',sans-serif]">\n        Loading your Neighborly profile…\n      </div>\n    );\n  }\n\n  if (view.page === "auth") {\n`,
  'auth loading gate',
);

replaceOnce(
  '        onSuccess={() => setView({ page: "feed" })}\n',
  '        onSuccess={() => { void loadCurrentProfile(false); }}\n',
  'auth success feed redirect',
);

replaceOnce(
  '  if (view.page === "business") {\n',
  `  if (view.page === "me" && currentProfile) {\n    return (\n      <UserProfileView\n        profile={currentProfile}\n        onBack={goToFeed}\n        isOwnProfile\n        myAvatarUrl={myAvatarUrl}\n        onAvatarChange={setMyAvatarUrl}\n      />\n    );\n  }\n  if (view.page === "business") {\n`,
  'own profile rendering',
);

replaceOnce(
  '<button onClick={() => goToUser("Maria Santos")}>\n              <Avatar name="Maria Santos" size="sm" src={myAvatarUrl} />\n            </button>',
  '<button onClick={() => setView({ page: "me" })}>\n              <Avatar name={currentProfile?.name || "Neighbor"} size="sm" src={myAvatarUrl} />\n            </button>',
  'header profile button',
);

s = s.replaceAll(
  '<Avatar name="Maria Santos" size="md" src={myAvatarUrl} />',
  '<Avatar name={currentProfile?.name || "Neighbor"} size="md" src={myAvatarUrl} />',
);

replaceOnce(
  '      author: "Maria Santos",\n      authorBadges: ["champion"],',
  '      author: currentProfile?.name || "You",\n      authorBadges: ["newcomer"],',
  'new post author',
);

fs.writeFileSync(file, s);
console.log('Patched App.tsx to use the authenticated Supabase profile.');
