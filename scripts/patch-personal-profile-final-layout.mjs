import fs from 'node:fs';
const file='src/app/App.tsx';
let s=fs.readFileSync(file,'utf8');

const start=s.indexOf('function UserProfileView(');
if(start<0) throw new Error('UserProfileView not found');
let end=s.indexOf('\nfunction ',start+20);
if(end<0) end=s.length;
let block=s.slice(start,end);

// Personal profile gets four profile tabs including Posts.
block=block.replace(/useState<"about"(?: \| "posts")? \| "photos" \| "reviews">\("about"\)/g,'useState<"about" | "posts" | "photos" | "reviews">("about")');
block=block.replace(/\(\["about",\s*(?:"posts",\s*)?"photos",\s*"reviews"\] as const\)/g,'(["about", "posts", "photos", "reviews"] as const)');
if(!block.includes('<ProfileWallFeed profileName={profile.name}')){
 const m='{tab === "about" && (';
 const p=block.indexOf(m);
 if(p<0) throw new Error('About content marker not found');
 block=block.slice(0,p)+'{tab === "posts" && <ProfileWallFeed profileName={profile.name} />}\n\n        '+block.slice(p);
}
s=s.slice(0,start)+block+s.slice(end);

// Remove the old compact Home/Search/Post bar from own profile pages only.
// It sits immediately after UserProfileView in the own-profile route.
s=s.replace(/(<UserProfileView[^;]*?\/>\s*)(<div className="(?:fixed|sticky)[\s\S]*?<span>Post<\/span>[\s\S]*?<\/div>\s*)/g,'$1');

fs.writeFileSync(file,s);
console.log('Personal profile now has About/Posts/Photos/Reviews and no profile bottom nav.');
