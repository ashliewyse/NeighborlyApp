import fs from 'node:fs';
const file='src/app/App.tsx';
let s=fs.readFileSync(file,'utf8');

// Lightweight read-only profile feed. Uses the same Supabase posts table as the main feed.
const marker='function BusinessProfileView(';
const pos=s.indexOf(marker);
if(pos<0) throw new Error('BusinessProfileView not found');
if(!s.includes('function ProfilePostsFeed(')){
const component=`function ProfilePostsFeed({ profileName, profileUserId }: { profileName: string; profileUserId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!profileUserId) { if (active) { setItems([]); setLoading(false); } return; }
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, category, content, image_url, created_at")
        .eq("author_id", profileUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      setItems(error ? [] : (data || []));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [profileUserId]);
  if (loading) return <div className="bg-white rounded-xl border border-border p-6 text-sm text-muted-foreground">Loading posts…</div>;
  if (!items.length) return <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts</h3><p className="text-sm text-muted-foreground">No posts from {profileName} yet.</p></div>;
  return <div className="space-y-4">{items.map((post:any) => <div key={post.id} className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="flex items-center gap-3 mb-3"><Avatar name={profileName} size="md" /><div><div className="font-semibold">{profileName}</div><div className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</div></div></div><p className="text-sm sm:text-base whitespace-pre-wrap">{post.content}</p>{post.image_url && <img src={post.image_url} alt="Post" className="mt-3 w-full max-h-[480px] object-cover rounded-lg" />}</div>)}</div>;
}

`;
s=s.slice(0,pos)+component+s.slice(pos);
}

function patchBlock(name,nextName,idExpressions){
 const start=s.indexOf(`function ${name}(`); if(start<0) throw new Error(name+' not found');
 let end=nextName?s.indexOf(`function ${nextName}(`,start+20):-1; if(end<0) end=s.length;
 let b=s.slice(start,end);
 const placeholder=/\{tab === "posts" && <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts<\/h3><p className="text-sm text-muted-foreground">[^<]*<\/p><\/div>\}/;
 const idExpr=idExpressions.find(x=>b.includes(x)) || 'undefined';
 const nameExpr=name==='BusinessProfileView'?'profile.name':'profile.name';
 b=b.replace(placeholder,`{tab === "posts" && <ProfilePostsFeed profileName={${nameExpr}} profileUserId={${idExpr}} />}`);
 s=s.slice(0,start)+b+s.slice(end);
}

// Match whichever user-id field each existing profile object exposes; no route/navigation/media code is changed.
patchBlock('BusinessProfileView','UserProfileView',['profile.userId','profile.user_id','profile.id']);
patchBlock('UserProfileView','SearchPage',['profile.userId','profile.user_id','profile.id']);
fs.writeFileSync(file,s);
console.log('Connected personal and business Posts tabs to their saved Supabase posts.');
