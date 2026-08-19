import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`);
  s = s.replace(from, to);
}

replaceOnce(
`<button onClick={() => setView({ page: "settings" })} className="inline-flex px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary" aria-label="Settings">⚙️<span className="hidden sm:inline ml-1">Settings</span></button>
            <button onClick={() => setView({ page: currentAccountType === "business" ? "my-business" : "me" })}>
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="sm" src={myAvatarUrl} />
            </button>`,
`<button onClick={() => setView({ page: currentAccountType === "business" ? "my-business" : "me" })} aria-label="View profile">
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="sm" src={myAvatarUrl} />
            </button>`,
'keep profile button in header'
);

replaceOnce(
`  if (view.page === "me" && currentProfile) return <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />;
  if (view.page === "my-business" && currentBusiness) return <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />;`,
`  if (view.page === "me" && currentProfile) return (
    <div className="relative min-h-screen">
      <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />
      <button onClick={() => setView({ page: "settings" })} className="fixed right-4 bottom-24 z-50 rounded-full bg-white border border-border shadow-lg px-4 py-2 text-sm font-medium">⚙️ Settings</button>
    </div>
  );
  if (view.page === "my-business" && currentBusiness) return (
    <div className="relative min-h-screen">
      <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />
      <button onClick={() => setView({ page: "settings" })} className="fixed right-4 bottom-24 z-50 rounded-full bg-white border border-border shadow-lg px-4 py-2 text-sm font-medium">⚙️ Settings</button>
    </div>
  );`,
'move settings into profile pages'
);

s = s.replace('.from("business_profiles")\n        .select("*")\n        .eq("id", user.id)', '.from("business_profiles")\n        .select("*")\n        .eq("user_id", user.id)');

fs.writeFileSync(file, s);
console.log('Restored profile navigation on mobile and moved Settings into profile pages.');
