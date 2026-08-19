import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceIf(from, to) {
  if (s.includes(from)) s = s.replace(from, to);
}

// Shared profile feed. This reads existing Supabase posts and does not modify any profile/media save code.
const feedComponent = `
function ProfileWallFeed({ profileName }: { profileName: string }) {
  const [wallPosts, setWallPosts] = useState<any[]>([]);
  const [wallLoading, setWallLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setWallLoading(true);
      try {
        let profileId: string | null = null;
        const { data: person } = await supabase.from("profiles").select("id").eq("full_name", profileName).maybeSingle();
        profileId = person?.id || null;
        if (!profileId) {
          const { data: business } = await supabase.from("business_profiles").select("user_id").eq("business_name", profileName).maybeSingle();
          profileId = business?.user_id || null;
        }
        if (!profileId) {
          if (active) { setWallPosts([]); setWallLoading(false); }
          return;
        }

        const { data: rows, error } = await supabase
          .from("posts")
          .select("id,author_id,profile_user_id,content,image_url,category,created_at")
          .or(\`author_id.eq.\${profileId},profile_user_id.eq.\${profileId}\`)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const ids = [...new Set((rows || []).map((p:any) => p.author_id).filter(Boolean))];
        const [{ data: people }, { data: businesses }] = await Promise.all([
          ids.length ? supabase.from("profiles").select("id,full_name,avatar_url,account_type").in("id", ids) : Promise.resolve({ data: [] as any[] }),
          ids.length ? supabase.from("business_profiles").select("user_id,business_name,logo_url").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
        ]);
        const peopleMap = new Map((people || []).map((p:any) => [p.id, p]));
        const bizMap = new Map((businesses || []).map((b:any) => [b.user_id, b]));
        const mapped = (rows || []).map((p:any) => {
          const person:any = peopleMap.get(p.author_id);
          const biz:any = bizMap.get(p.author_id);
          const isBiz = person?.account_type === "business" || !!biz;
          return {
            ...p,
            authorName: isBiz ? (biz?.business_name || person?.full_name || "Business") : (person?.full_name || "Neighbor"),
            authorAvatar: isBiz ? (biz?.logo_url || person?.avatar_url || null) : (person?.avatar_url || null),
            sharedToProfile: p.profile_user_id === profileId && p.author_id !== profileId,
          };
        });
        if (active) setWallPosts(mapped);
      } catch (e) {
        console.error("Could not load profile wall", e);
        if (active) setWallPosts([]);
      } finally {
        if (active) setWallLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profileName]);

  if (wallLoading) return <div className="bg-white rounded-xl border border-border p-5 text-sm text-muted-foreground">Loading posts…</div>;
  if (!wallPosts.length) return <div className="bg-white rounded-xl border border-border p-6 text-center"><MessageSquare size={24} className="mx-auto mb-2 text-muted-foreground" /><p className="font-semibold">No posts yet</p><p className="text-sm text-muted-foreground mt-1">Posts by {profileName} and posts neighbors share to this profile will appear here.</p></div>;

  return <div className="flex flex-col gap-4">{wallPosts.map((p:any) => (
    <article key={p.id} className="bg-white rounded-xl border border-border p-4 sm:p-5">
      {p.sharedToProfile && <div className="mb-3 text-xs text-muted-foreground flex items-center gap-1"><Share2 size={12} /> Shared to {profileName}'s profile</div>}
      <div className="flex items-center gap-3">
        <Avatar name={p.authorName} size="md" src={p.authorAvatar || undefined} />
        <div className="min-w-0"><p className="font-semibold text-sm truncate">{p.authorName}</p><p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p></div>
      </div>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>
      {p.image_url && <img src={p.image_url} alt="Post attachment" className="mt-3 w-full max-h-[520px] object-cover rounded-xl border border-border" />}
    </article>
  ))}</div>;
}

function ProfileMobileNav({ onHome, onSearch, onPost, onEvents, onSell }: { onHome: () => void; onSearch: () => void; onPost: () => void; onEvents: () => void; onSell: () => void }) {
  return <nav className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-white border-t border-border shadow-[0_-4px_14px_rgba(0,0,0,0.08)]">
    <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
      <button onClick={onHome} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"><Home size={20}/><span>Home</span></button>
      <button onClick={onSearch} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"><Search size={20}/><span>Search</span></button>
      <button onClick={onPost} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-primary"><span className="w-10 h-10 -mt-4 rounded-xl bg-primary text-primary-foreground shadow flex items-center justify-center"><Plus size={24}/></span><span>Post</span></button>
      <button onClick={onEvents} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"><CalendarDays size={20}/><span>Events</span></button>
      <button onClick={onSell} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"><ShoppingBag size={20}/><span>Sell</span></button>
    </div>
  </nav>;
}

`;
if (!s.includes('function ProfileWallFeed(')) {
  const marker = '// ─── Business Profile';
  if (s.includes(marker)) s = s.replace(marker, feedComponent + marker);
}

// Business profile: add one Posts tab, leaving all existing media/profile code untouched.
replaceIf('"about" | "services" | "photos" | "contact" | "reviews"', '"about" | "posts" | "services" | "photos" | "contact" | "reviews"');
replaceIf('["about",\n                "services",\n                "photos",\n                "contact",\n                "reviews",', '["about",\n                "posts",\n                "services",\n                "photos",\n                "contact",\n                "reviews",');
const bizServices = '        {tab === "services" && (';
if (s.includes(bizServices) && !s.includes('<ProfileWallFeed profileName={biz.name}')) {
  s = s.replace(bizServices, '        {tab === "posts" && <ProfileWallFeed profileName={biz.name} />}\n\n' + bizServices);
}

// Personal profile: add one Posts tab.
replaceIf('useState<"about" | "photos" | "reviews">("about")', 'useState<"about" | "posts" | "photos" | "reviews">("about")');
replaceIf('(["about", "photos", "reviews"] as const)', '(["about", "posts", "photos", "reviews"] as const)');
const personalAbout = '        {tab === "about" && (\n          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5">';
if (s.includes(personalAbout) && !s.includes('<ProfileWallFeed profileName={profile.name}')) {
  s = s.replace(personalAbout, '        {tab === "posts" && <ProfileWallFeed profileName={profile.name} />}\n\n' + personalAbout);
}

// Give six business tabs enough room on larger screens if the responsive profile-tab patch is present.
s = s.replace('grid grid-cols-3 sm:grid-cols-5 border-t border-border bg-white', 'grid grid-cols-3 sm:grid-cols-6 border-t border-border bg-white');

// Add app-wide mobile nav to every personal/business profile route. These replacements are intentionally isolated from upload/save functions.
const businessRoute = `        <BusinessProfileView\n          biz={biz}\n          onBack={goToFeed}\n          onUserClick={goToUser}\n        />`;
const businessRouteWrapped = `<div className="pb-16 lg:pb-0">\n        <BusinessProfileView\n          biz={biz}\n          onBack={goToFeed}\n          onUserClick={goToUser}\n        />\n        <ProfileMobileNav onHome={goToFeed} onSearch={() => setView({ page: "search" })} onPost={() => { setView({ page: "feed" }); setComposing(true); }} onEvents={() => setView({ page: "events" })} onSell={() => setView({ page: "classifieds" })} />\n      </div>`;
replaceIf(businessRoute, businessRouteWrapped);

const userRoute = `        <UserProfileView\n          profile={profile}\n          onBack={goToFeed}\n          isOwnProfile={view.name === "Maria Santos"}\n          myAvatarUrl={view.name === "Maria Santos" ? myAvatarUrl : null}\n          onAvatarChange={view.name === "Maria Santos" ? setMyAvatarUrl : undefined}\n        />`;
const userRouteWrapped = `<div className="pb-16 lg:pb-0">\n        <UserProfileView\n          profile={profile}\n          onBack={goToFeed}\n          isOwnProfile={view.name === "Maria Santos"}\n          myAvatarUrl={view.name === "Maria Santos" ? myAvatarUrl : null}\n          onAvatarChange={view.name === "Maria Santos" ? setMyAvatarUrl : undefined}\n        />\n        <ProfileMobileNav onHome={goToFeed} onSearch={() => setView({ page: "search" })} onPost={() => { setView({ page: "feed" }); setComposing(true); }} onEvents={() => setView({ page: "events" })} onSell={() => setView({ page: "classifieds" })} />\n      </div>`;
replaceIf(userRoute, userRouteWrapped);

// Own-profile routes added by the existing authentication patches.
replaceIf('      <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />\n    </div>', '      <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />\n      <ProfileMobileNav onHome={goToFeed} onSearch={() => setView({ page: "search" })} onPost={() => { setView({ page: "feed" }); setComposing(true); }} onEvents={() => setView({ page: "events" })} onSell={() => setView({ page: "classifieds" })} />\n    </div>');
replaceIf('      <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />\n    </div>', '      <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />\n      <ProfileMobileNav onHome={goToFeed} onSearch={() => setView({ page: "search" })} onPost={() => { setView({ page: "feed" }); setComposing(true); }} onEvents={() => setView({ page: "events" })} onSell={() => setView({ page: "classifieds" })} />\n    </div>');

fs.writeFileSync(file, s);
console.log('Added profile wall feed and mobile bottom navigation without modifying profile media persistence.');
