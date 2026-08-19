import fs from 'node:fs';
const file='src/app/App.tsx';
let s=fs.readFileSync(file,'utf8');

// Ensure persisted post objects can carry the Supabase author UUID.
if(!s.includes('  authorId?: string;')){
  s=s.replace('  author: string;\n  authorBadges:', '  author: string;\n  authorId?: string;\n  authorBadges:');
}

// Ensure loaded Supabase posts retain author_id for profile navigation.
s=s.replace('          author: isBiz ? (b?.business_name || p?.full_name || "Local Business") : (p?.full_name || "Neighbor"),\n          authorAvatar:', '          author: isBiz ? (b?.business_name || p?.full_name || "Local Business") : (p?.full_name || "Neighbor"),\n          authorId: r.author_id,\n          authorAvatar:');
s=s.replace('      author: authorName,\n      authorAvatar:', '      author: authorName,\n      authorId: user.id,\n      authorAvatar:');

// Restore/guarantee Posts tab on business profiles after every prior build patch runs.
{
  const start=s.indexOf('function BusinessProfileView(');
  const end=s.indexOf('function UserProfileView(',start);
  if(start<0||end<0) throw new Error('BusinessProfileView not found');
  let b=s.slice(start,end);
  b=b.replace(/"about"\s*\|\s*"services"\s*\|\s*"photos"\s*\|\s*"contact"\s*\|\s*"reviews"/, '"about" | "posts" | "services" | "photos" | "contact" | "reviews"');
  b=b.replace(/\[\s*"about",\s*"services",\s*"photos",\s*"contact",\s*"reviews",?\s*\]/, '["about", "posts", "services", "photos", "contact", "reviews"]');
  if(!b.includes('{tab === "posts" &&')){
    const p=b.indexOf('{tab === "services" && (');
    if(p>=0) b=b.slice(0,p)+'{tab === "posts" && <ProfilePostsFeed profileName={biz.name} profileUserId={undefined} />}\n\n        '+b.slice(p);
  }
  s=s.slice(0,start)+b+s.slice(end);
}

// Make feed author clicks open real Supabase personal profiles, not only demo fixture users.
const oldGo=`  function goToUser(name: string) {\n    if (USER_PROFILES[name]) setView({ page: "user", name });\n  }`;
const newGo=`  async function goToUser(name: string, authorId?: string) {\n    if (USER_PROFILES[name]) { setView({ page: "user", name }); return; }\n    let row: any = null;\n    if (authorId) {\n      const { data } = await supabase.from("profiles").select("*").eq("id", authorId).maybeSingle();\n      row = data;\n    }\n    if (!row) {\n      const { data } = await supabase.from("profiles").select("*").ilike("full_name", name).limit(1).maybeSingle();\n      row = data;\n    }\n    if (!row) return;\n    const resolvedName = row.full_name || name;\n    USER_PROFILES[resolvedName] = {\n      name: resolvedName,\n      neighborhood: row.neighborhood || row.city || "",\n      city: row.city || "Michigan City",\n      joinDate: row.created_at ? new Date(row.created_at).toLocaleDateString(undefined,{month:"long",year:"numeric"}) : "",\n      bio: row.bio || "",\n      badges: [],\n      posts: 0, neighbors: 0, helpfulVotes: 0, recsGiven: 0, rating: 0, ratingCount: 0,\n      neighborReviews: [], galleryPhotos: [], recentActivity: []\n    };\n    setView({ page: "user", name: resolvedName });\n  }`;
if(s.includes(oldGo)) s=s.replace(oldGo,newGo);
else if(!s.includes('async function goToUser(name: string, authorId?: string)')) throw new Error('goToUser pattern not found');

s=s.replaceAll('goToUser(post.author)', 'goToUser(post.author, post.authorId)');

fs.writeFileSync(file,s);
console.log('Restored business Posts and real personal profile navigation.');
