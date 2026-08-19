import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

const headerWithSettings = `<button onClick={() => setView({ page: "settings" })} className="inline-flex px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary" aria-label="Settings">⚙️<span className="hidden sm:inline ml-1">Settings</span></button>
            <button onClick={() => setView({ page: currentAccountType === "business" ? "my-business" : "me" })}>
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="sm" src={myAvatarUrl} />
            </button>`;
const profileOnly = `<button onClick={() => setView({ page: currentAccountType === "business" ? "my-business" : "me" })} aria-label="View profile">
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="sm" src={myAvatarUrl} />
            </button>`;
if (s.includes(headerWithSettings)) s = s.replace(headerWithSettings, profileOnly);

const oldViews = `  if (view.page === "me" && currentProfile) return <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />;
  if (view.page === "my-business" && currentBusiness) return <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />;`;
const newViews = `  if (view.page === "me" && currentProfile) return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border"><div className="max-w-5xl mx-auto px-4 py-2.5 flex justify-end"><button onClick={() => setView({ page: "settings" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">⚙️ Settings</button></div></div>
      <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} />
    </div>
  );
  if (view.page === "my-business" && currentBusiness) return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border"><div className="max-w-5xl mx-auto px-4 py-2.5 flex justify-end"><button onClick={() => setView({ page: "settings" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">⚙️ Settings</button></div></div>
      <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} />
    </div>
  );`;
if (s.includes(oldViews)) s = s.replace(oldViews, newViews);

fs.writeFileSync(file, s);
console.log('Profile button retained in header; Settings placed on profile page.');
