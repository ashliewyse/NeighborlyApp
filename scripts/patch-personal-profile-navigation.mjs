import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

// Navigation-only profile identity support. This does not change post/photo saving or uploads.
if (!s.includes('  authorId?: string;')) {
  if (s.includes('  author: string;\n  authorBadges:')) {
    s = s.replace('  author: string;\n  authorBadges:', '  author: string;\n  authorId?: string;\n  authorBadges:');
  } else {
    throw new Error('Profile navigation patch: Post author field not found');
  }
}

// Keep the Supabase author UUID on posts that are already being loaded by the working post loader.
const loadedAuthor = '          author: isBiz ? (b?.business_name || p?.full_name || "Local Business") : (p?.full_name || "Neighbor"),\n          authorAvatar:';
if (s.includes(loadedAuthor)) {
  s = s.replace(
    loadedAuthor,
    '          author: isBiz ? (b?.business_name || p?.full_name || "Local Business") : (p?.full_name || "Neighbor"),\n          authorId: r.author_id,\n          authorAvatar:'
  );
}

// Keep the signed-in user's UUID on a just-created in-memory post. Persistence remains untouched.
const createdAuthor = '      author: authorName,\n      authorAvatar:';
if (s.includes(createdAuthor)) {
  s = s.replace(createdAuthor, '      author: authorName,\n      authorId: user.id,\n      authorAvatar:');
}

const oldGo = `  function goToUser(name: string) {\n    if (USER_PROFILES[name]) setView({ page: "user", name });\n  }`;
const newGo = `  async function goToUser(name: string, authorId?: string) {\n    if (USER_PROFILES[name]) {\n      setView({ page: "user", name });\n      return;\n    }\n\n    let row: any = null;\n    if (authorId) {\n      const { data } = await supabase.from("profiles").select("*").eq("id", authorId).maybeSingle();\n      row = data;\n    }\n    if (!row) {\n      const { data } = await supabase.from("profiles").select("*").ilike("full_name", name).limit(1).maybeSingle();\n      row = data;\n    }\n    if (!row) return;\n\n    const resolvedName = row.full_name || name;\n    USER_PROFILES[resolvedName] = {\n      name: resolvedName,\n      neighborhood: row.neighborhood || row.city || "",\n      city: row.city || "Michigan City",\n      joinDate: row.created_at\n        ? new Date(row.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })\n        : "",\n      bio: row.bio || "",\n      badges: [],\n      posts: 0,\n      neighbors: 0,\n      helpfulVotes: 0,\n      recsGiven: 0,\n      rating: 0,\n      ratingCount: 0,\n      neighborReviews: [],\n      galleryPhotos: [],\n      recentActivity: [],\n    };\n    setView({ page: "user", name: resolvedName });\n  }`;

if (s.includes(oldGo)) {
  s = s.replace(oldGo, newGo);
} else if (!s.includes('async function goToUser(name: string, authorId?: string)')) {
  throw new Error('Profile navigation patch: goToUser function not found');
}

// Main feed: clicking a real post author's avatar/name opens that author's personal profile.
s = s.replaceAll('goToUser(post.author)', 'goToUser(post.author, post.authorId)');

// Classified cards use a callback, so pass the same UUID there without changing the card behavior otherwise.
s = s.replaceAll('onUserClick(post.author)', 'onUserClick(post.author, post.authorId)');
s = s.replaceAll('onUserClick: (name: string) => void;', 'onUserClick: (name: string, authorId?: string) => void;');

fs.writeFileSync(file, s);
console.log('Patched personal-profile navigation without changing post/photo persistence.');
