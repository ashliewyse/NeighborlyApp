import fs from 'node:fs';
const file='src/app/App.tsx';
let s=fs.readFileSync(file,'utf8');
function once(from,to,label){ if(!s.includes(from)) throw new Error('Patch failed: '+label); s=s.replace(from,to); }

// Preserve the Supabase author id on loaded/new posts so profile navigation can resolve real users.
once('  author: string;\n  authorBadges:', '  author: string;\n  authorId?: string;\n  authorBadges:', 'Post authorId');

// Insert a reusable Help Wanted sidebar card before Upcoming Events in both desktop and mobile sidebars.
const helpCard=`          {/* Help Wanted */}\n          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">\n            <div className="flex items-center justify-between mb-3">\n              <h3 className="font-semibold text-sm flex items-center gap-2"><Briefcase size={14} className="text-blue-600" /> Help Wanted</h3>\n              <button onClick={() => { setActiveTab("helpwanted"); goToFeed(); setSidebarOpen(false); }} className="text-xs text-blue-600 font-medium hover:underline">See all</button>\n            </div>\n            <div className="flex flex-col gap-2.5">\n              {posts.filter((p) => p.category === "helpwanted" && (activeLocation === "All Areas" || p.city === activeLocation)).slice(0,3).map((post) => (\n                <button key={post.id} onClick={() => { setActiveTab("helpwanted"); goToFeed(); setSidebarOpen(false); }} className="w-full text-left p-2.5 rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors">\n                  <p className="text-sm font-semibold line-clamp-1">{post.body || "Help wanted"}</p>\n                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.author} · {post.city}</p>\n                </button>\n              ))}\n              {posts.filter((p) => p.category === "helpwanted" && (activeLocation === "All Areas" || p.city === activeLocation)).length === 0 && (\n                <p className="text-xs text-muted-foreground py-2">No help wanted posts yet.</p>\n              )}\n            </div>\n          </div>\n\n`;
const marker='          {/* Upcoming Events */}';
if((s.match(new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&'),'g'))||[]).length < 2) throw new Error('Patch failed: upcoming events markers');
s=s.replace(marker,helpCard+marker);
s=s.replace(marker,helpCard+marker);

// Make real Supabase-authored names navigable even when they are not fixture USER_PROFILES.
once('  function goToUser(name: string) {\n    if (USER_PROFILES[name]) setView({ page: "user", name });\n  }',`  async function goToUser(name: string, authorId?: string) {\n    if (USER_PROFILES[name]) { setView({ page: "user", name }); return; }\n    let row: any = null;\n    if (authorId) {\n      const { data } = await supabase.from("profiles").select("*").eq("id", authorId).maybeSingle();\n      row = data;\n    }\n    if (!row) {\n      const { data } = await supabase.from("profiles").select("*").ilike("name", name).limit(1).maybeSingle();\n      row = data;\n    }\n    if (row) {\n      const resolvedName = row.name || row.full_name || name;\n      USER_PROFILES[resolvedName] = {\n        name: resolvedName, neighborhood: row.neighborhood || "", city: row.city || "Michigan City", joinDate: row.join_date || "August 2026", bio: row.bio || "", badges: [], posts: 0, neighbors: 0, helpfulVotes: 0, recsGiven: 0, rating: Number(row.rating || 0), ratingCount: Number(row.rating_count || 0), neighborReviews: [], galleryPhotos: [], recentActivity: []\n      };\n      setView({ page: "user", name: resolvedName });\n    }\n  }`,'dynamic goToUser');

// Feed clicks pass the persisted author id when available.
s=s.replaceAll('goToUser(post.author)', 'goToUser(post.author, post.authorId)');

fs.writeFileSync(file,s);
console.log('Added Help Wanted sidebar cards and dynamic person profile navigation.');
