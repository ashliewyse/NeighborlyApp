import fs from "node:fs";

const patches = [
  "./patch-feed-notifications.mjs",
  "./patch-ad-card-fit.mjs",
  "./patch-post-likes.mjs",
  "./patch-announcement-profile-links.mjs",
  "./patch-post-safety.mjs",
  "./patch-moderator-access.mjs",
  "./patch-blocked-member-settings.mjs",
  "./patch-hardening-pass.mjs",
  "./patch-staff-dashboard-ux.mjs",
];

for (const patch of patches) {
  await import(patch);
}

const appPath = new URL("../src/app/App.tsx", import.meta.url);
const app = fs.readFileSync(appPath, "utf8");
const settingsPath = new URL("../src/app/components/SettingsView.tsx", import.meta.url);
const settings = fs.readFileSync(settingsPath, "utf8");

const requiredAppMarkers = [
  'from("safety_reports")',
  'AdminMemberManagement',
  'SafetyReportButton targetType="comment"',
  'SafetyReportButton targetType="message"',
  'targetType="profile"',
  'targetType="business"',
  'ModeratorDashboard onBack={goToFeed} onProfileOpen={openProfileFromStaff}',
  'onProfileOpen={openProfileFromStaff}',
  'async function openProfileFromStaff(name: string, userId: string)',
  'supabase.from("post_likes")',
];

for (const marker of requiredAppMarkers) {
  if (!app.includes(marker)) {
    throw new Error(`Neighborly build verification failed: missing App marker: ${marker}`);
  }
}

if (!settings.includes("<BlockedMembersSettings />")) {
  throw new Error("Neighborly build verification failed: blocked member settings are missing.");
}

console.log(`Neighborly build patches verified (${patches.length} patch modules).`);
