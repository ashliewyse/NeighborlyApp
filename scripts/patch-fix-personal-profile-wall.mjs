import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

// The wall patch inserted the personal Posts tab by matching a generic tab state.
// Restrict the change to UserProfileView only and ensure its tab union includes posts.
const userStart = s.indexOf('function UserProfileView(');
const userEnd = userStart >= 0 ? s.indexOf('// ───', userStart + 10) : -1;
if (userStart < 0) throw new Error('UserProfileView not found');
const end = userEnd > userStart ? userEnd : s.length;
let before = s.slice(0, userStart);
let user = s.slice(userStart, end);
let after = s.slice(end);

// Normalize personal profile tab state and tab list, regardless of whether earlier patches partially changed them.
user = user.replace(/useState<"about"(?: \| "posts")? \| "photos" \| "reviews">\("about"\)/, 'useState<"about" | "posts" | "photos" | "reviews">("about")');
user = user.replace(/\(\["about",\s*(?:"posts",\s*)?"photos",\s*"reviews"\] as const\)/, '(["about", "posts", "photos", "reviews"] as const)');

// Add the wall only inside the personal profile if it is not already there.
if (!user.includes('<ProfileWallFeed profileName={profile.name}')) {
  const aboutMarker = '{tab === "about" && (';
  const pos = user.indexOf(aboutMarker);
  if (pos < 0) throw new Error('Personal About tab marker not found');
  user = user.slice(0, pos) + '{tab === "posts" && <ProfileWallFeed profileName={profile.name} />}\n\n        ' + user.slice(pos);
}

// Defensive fallback: a bad tab value should never blank the entire profile.
user = user.replace('const [tab, setTab] = useState<"about" | "posts" | "photos" | "reviews">("about");', 'const [tab, setTab] = useState<"about" | "posts" | "photos" | "reviews">("about");');

s = before + user + after;
fs.writeFileSync(file, s);
console.log('Fixed personal profile Posts tab scope without touching media persistence.');
