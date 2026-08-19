import fs from 'node:fs';
const file='src/app/App.tsx';
let s=fs.readFileSync(file,'utf8');

function patchComponent(name,nextName,isBusiness){
 const start=s.indexOf(`function ${name}(`);
 if(start<0) throw new Error(`${name} not found`);
 let end=nextName ? s.indexOf(`function ${nextName}(`,start+20) : -1;
 if(end<0) end=s.length;
 let b=s.slice(start,end);
 if(isBusiness){
   b=b.replace(/useState<"about" \| "services" \| "photos" \| "contact" \| "reviews">\("about"\)/,'useState<"about" | "posts" | "services" | "photos" | "contact" | "reviews">("about")');
   b=b.replace(/\["about",\s*"services",\s*"photos",\s*"contact",\s*"reviews"\]/,'["about", "posts", "services", "photos", "contact", "reviews"]');
   if(!b.includes('{tab === "posts" &&')){
     const m='{tab === "services" && ('; const p=b.indexOf(m);
     if(p>=0) b=b.slice(0,p)+'{tab === "posts" && <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts</h3><p className="text-sm text-muted-foreground">Posts by this business and posts neighbors share to this profile will appear here.</p></div>}\n\n        '+b.slice(p);
   }
 } else {
   b=b.replace(/useState<"about" \| "photos" \| "reviews">\("about"\)/,'useState<"about" | "posts" | "photos" | "reviews">("about")');
   b=b.replace(/\(\["about",\s*"photos",\s*"reviews"\] as const\)/,'(["about", "posts", "photos", "reviews"] as const)');
   if(!b.includes('{tab === "posts" &&')){
     const m='{tab === "about" && ('; const p=b.indexOf(m);
     if(p>=0) b=b.slice(0,p)+'{tab === "posts" && <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts</h3><p className="text-sm text-muted-foreground">Posts by this neighbor and posts shared to this profile will appear here.</p></div>}\n\n        '+b.slice(p);
   }
 }
 s=s.slice(0,start)+b+s.slice(end);
}

// Only add the visible Posts tabs. Do not alter routes, bottom navigation, uploads, profile saving, or Supabase persistence.
patchComponent('BusinessProfileView','UserProfileView',true);
patchComponent('UserProfileView','SearchPage',false);
fs.writeFileSync(file,s);
console.log('Added Posts tabs only to business and personal profiles.');
