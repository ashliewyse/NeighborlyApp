import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
  '  image?: string;\n  likes: number;',
  '  image?: string;\n  authorAvatar?: string | null;\n  likes: number;',
  'post avatar field',
);

replaceOnce(
  '  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);\n',
  '  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);\n  const postsLoadedRef = useRef(false);\n',
  'posts loaded ref',
);

replaceOnce(
  '  function toggleJoinGroup(id: number) {\n',
  `  useEffect(() => {\n    if (!authReady || postsLoadedRef.current) return;\n    postsLoadedRef.current = true;\n    (async () => {\n      const { data: rows, error } = await supabase\n        .from("posts")\n        .select("id, author_id, category, content, image_url, created_at")\n        .order("created_at", { ascending: false })\n        .limit(100);\n      if (error || !rows?.length) return;\n\n      const ids = [...new Set(rows.map((r: any) => r.author_id).filter(Boolean))];\n      const [{ data: profileRows }, { data: businessRows }] = await Promise.all([\n        supabase.from("profiles").select("id, full_name, city, neighborhood, avatar_url, account_type").in("id", ids),\n        supabase.from("business_profiles").select("user_id, business_name, city, neighborhood, logo_url").in("user_id", ids),\n      ]);\n      const profiles = new Map((profileRows || []).map((p: any) => [p.id, p]));\n      const businesses = new Map((businessRows || []).map((b: any) => [b.user_id, b]));\n\n      const loaded: Post[] = rows.map((r: any, index: number) => {\n        const p: any = profiles.get(r.author_id);\n        const b: any = businesses.get(r.author_id);\n        const isBiz = p?.account_type === "business" || !!b;\n        const created = new Date(r.created_at);\n        return {\n          id: created.getTime() + index,\n          author: isBiz ? (b?.business_name || p?.full_name || "Local Business") : (p?.full_name || "Neighbor"),\n          authorAvatar: isBiz ? (b?.logo_url || p?.avatar_url || null) : (p?.avatar_url || null),\n          authorBadges: [],\n          neighborhood: b?.neighborhood || p?.neighborhood || b?.city || p?.city || "Local Area",\n          city: b?.city || p?.city || "Michigan City",\n          time: created.toLocaleDateString() === new Date().toLocaleDateString() ? "Today" : created.toLocaleDateString(),\n          category: (r.category || "general") as PostCategory,\n          body: r.content,\n          image: r.image_url || undefined,\n          likes: 0, comments: [], bookmarked: false, liked: false,\n        };\n      });\n      setPosts((prev) => [...loaded, ...prev.filter((p) => !loaded.some((d) => d.body === p.body && d.author === p.author))]);\n    })();\n  }, [authReady]);\n\n  function toggleJoinGroup(id: number) {\n`,
  'load Supabase posts',
);

const handleStart = s.indexOf('  function handleCreatePost() {');
const submitStart = s.indexOf('  function submitComment(postId: number)', handleStart);
if (handleStart === -1 || submitStart === -1) throw new Error('Patch failed: handleCreatePost block');
const replacement = `  async function handleCreatePost() {\n    const text = newPostText.trim();\n    if (!text) return;\n\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) return;\n    const postCity = activeLocation === "All Areas" ? (currentBusiness?.city || currentProfile?.city || "Michigan City") : activeLocation;\n    const postType = selectedCategory === "safety" ? "alert" : selectedCategory === "recommendation" ? "recommendation" : "discussion";\n    const { data: saved, error } = await supabase\n      .from("posts")\n      .insert({\n        author_id: user.id,\n        post_type: postType,\n        category: selectedCategory,\n        content: text,\n      })\n      .select("id, created_at")\n      .single();\n    if (error) { console.error("Could not save post", error); return; }\n\n    const authorName = currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "You");\n    const newPost: Post = {\n      id: new Date(saved.created_at).getTime(),\n      author: authorName,\n      authorAvatar: myAvatarUrl,\n      authorBadges: [],\n      neighborhood: postCity,\n      city: postCity,\n      time: "Just now",\n      category: selectedCategory,\n      body: text,\n      likes: 0,\n      comments: [],\n      bookmarked: false,\n      liked: false,\n    };\n\n    setPosts((prev) => [newPost, ...prev]);\n    if (selectedCategory === "forsale") setClassifiedPosts((prev) => [newPost, ...prev]);\n    setNewPostText("");\n    setSelectedCategory("general");\n    setComposing(false);\n  }\n`;
s = s.slice(0, handleStart) + replacement + s.slice(submitStart);

s = s.replaceAll('<Avatar name={post.author} size="md" />', '<Avatar name={post.author} size="md" src={post.authorAvatar || (post.author === (currentAccountType === "business" ? currentBusiness?.name : currentProfile?.name) ? myAvatarUrl : null)} />');
s = s.replaceAll('<Avatar name={post.author} size="sm" />', '<Avatar name={post.author} size="sm" src={post.authorAvatar || null} />');

fs.writeFileSync(file, s);
console.log('Patched feed posts to persist and reload from Supabase.');
