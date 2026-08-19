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
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex justify-end">
          <button onClick={() => setView({ page: "settings" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            ⚙️ Settings
          </button>
        </div>
      </div>
      <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />
    </div>
  );
  if (view.page === "my-business" && currentBusiness) return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex justify-end">
          <button onClick={() => setView({ page: "settings" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            ⚙️ Settings
          </button>
        </div>
      </div>
      <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />
    </div>
  );`,
'move settings into aligned profile action bar'
);

s = s.replace('.from("business_profiles")\n        .select("*")\n        .eq("id", user.id)', '.from("business_profiles")\n        .select("*")\n        .eq("user_id", user.id)');

fs.writeFileSync(file, s);
console.log('Restored profile nav and moved Settings to an aligned profile action bar.');
