import fs from 'node:fs';
const file='src/app/App.tsx';
let s=fs.readFileSync(file,'utf8');

const marker='function BusinessProfileView(';
const pos=s.indexOf(marker);
if(pos<0) throw new Error('BusinessProfileView not found');
if(!s.includes('function ProfilePostsFeed(')){
const component=`function ProfilePostsFeed({ profileName, profileType }: { profileName: string; profileType: "business" | "personal" }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      let ownerId: string | null = null;
      if (profileType === "business") {
        const { data: businessRow } = await supabase.from("business_profiles").select("user_id").eq("business_name", profileName).maybeSingle();
        ownerId = businessRow?.user_id || null;
        if (!ownerId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: ownBusiness } = await supabase.from("business_profiles").select("business_name").eq("user_id", user.id).maybeSingle();
            if (ownBusiness?.business_name === profileName) ownerId = user.id;
          }
        }
      } else {
        const { data: profileRow } = await supabase.from("profiles").select("id").eq("full_name", profileName).eq("account_type", "personal").maybeSingle();
        ownerId = profileRow?.id || null;
      }
      if (!ownerId) { if (active) { setItems([]); setLoading(false); } return; }
      const { data, error } = await supabase.from("posts").select("id, author_id, category, content, image_url, created_at").eq("author_id", ownerId).order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      setItems(error ? [] : (data || [])); setLoading(false);
    })();
    return () => { active = false; };
  }, [profileName, profileType]);
  if (loading) return <div className="bg-white rounded-xl border border-border p-6 text-sm text-muted-foreground">Loading posts…</div>;
  if (!items.length) return <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts</h3><p className="text-sm text-muted-foreground">No posts from {profileName} yet.</p></div>;
  return <div className="space-y-4">{items.map((post:any) => <div key={post.id} className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="font-semibold mb-1">{profileName}</div><div className="text-xs text-muted-foreground mb-3">{new Date(post.created_at).toLocaleDateString()}</div><p className="text-sm sm:text-base whitespace-pre-wrap">{post.content}</p>{post.image_url && <img src={post.image_url} alt="Post" className="mt-3 w-full max-h-[480px] object-cover rounded-lg" />}</div>)}</div>;
}

`;
s=s.slice(0,pos)+component+s.slice(pos);
}

function patchBlock(name,nextName,nameExpressions,profileType){
 const start=s.indexOf(`function ${name}(`); if(start<0) throw new Error(name+' not found');
 let end=nextName?s.indexOf(`function ${nextName}(`,start+20):-1; if(end<0) end=s.length;
 let b=s.slice(start,end);
 const placeholder=/\{tab === "posts" && <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts<\/h3><p className="text-sm text-muted-foreground">[^<]*<\/p><\/div>\}/;
 const nameExpr=nameExpressions.find(x=>b.includes(x)) || '"Profile"';
 b=b.replace(placeholder,`{tab === "posts" && <ProfilePostsFeed profileName={${nameExpr}} profileType="${profileType}" />}`);
 s=s.slice(0,start)+b+s.slice(end);
}

patchBlock('BusinessProfileView','UserProfileView',['biz.name','biz.businessName'],'business');
patchBlock('UserProfileView','SearchPage',['profile.name'],'personal');
fs.writeFileSync(file,s);
console.log('Profile Posts resolve the correct business or personal Supabase account UUID.');
