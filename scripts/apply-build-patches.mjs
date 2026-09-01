import fs from "node:fs";

// Deployment marker: beta-readiness pass with real data, safer auth recovery, and area duplicate review.
const patches = [
  "./patch-feed-notifications.mjs",
  "./patch-empty-initial-posts.mjs",
  "./patch-ad-card-fit.mjs",
  "./patch-post-likes.mjs",
  "./patch-announcement-profile-links.mjs",
  "./patch-post-safety.mjs",
  "./patch-moderator-access.mjs",
  "./patch-blocked-member-settings.mjs",
  "./patch-hardening-pass.mjs",
  "./patch-staff-dashboard-ux.mjs",
  "./patch-area-review-admin.mjs",
  "./patch-auth-canonical-origin.mjs",
  "./patch-auth-confirmation-resend.mjs",
  "./patch-signup-area-suggestions.mjs",
  "./patch-profile-mobile-actions.mjs",
  "./patch-post-response-notifications.mjs",
  "./patch-profile-badges-rank.mjs",
  "./patch-recent-activity-summary.mjs",
  "./patch-comment-likes.mjs",
  "./patch-local-business-rotation.mjs",
  "./patch-empty-events.mjs",
  "./patch-business-contact-links.mjs",
  "./patch-remove-demo-directory-data.mjs",
];

for (const patch of patches) {
  await import(patch);
}

const appPath = new URL("../src/app/App.tsx", import.meta.url);
const app = fs.readFileSync(appPath, "utf8");
const settingsPath = new URL("../src/app/components/SettingsView.tsx", import.meta.url);
const settings = fs.readFileSync(settingsPath, "utf8");
const authViewPath = new URL("../src/app/components/AuthView.tsx", import.meta.url);
const authView = fs.readFileSync(authViewPath, "utf8");

const requiredAppMarkers = [
  'from("safety_reports")',
  'AdminMemberManagement',
  'AreaReviewPanel',
  'tab === "areas" && <AreaReviewPanel />',
  'SafetyReportButton targetType="comment"',
  'SafetyReportButton targetType="message"',
  'targetType="profile"',
  'targetType="business"',
  'ModeratorDashboard onBack={goToFeed} onProfileOpen={openProfileFromStaff}',
  'onProfileOpen={openProfileFromStaff}',
  'async function openProfileFromStaff(name: string, userId: string)',
  'supabase.from("post_likes")',
  'supabase.from("comment_likes")',
  'async function toggleCommentLike(postId: number, commentId: number)',
  'commentLikeCountsByComment',
  'flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 mt-12 relative pl-2',
  'notification.type === "post_comment" || notification.type === "thread_comment"',
  'neighborly-notifications-${currentProfile.id}',
  'function isNewNeighbor(createdAt?: string | null)',
  'neighborhoodRankScore(profile)',
  'Earned the New Neighbor badge',
  'No recent public activity yet.',
  'const INITIAL_POSTS: Post[] = [];',
  'const EVENTS: any[] = [];',
  'const allEvents: any[] = [];',
  'Post a new event',
  'showLocation?: boolean;',
  'label: "Location"',
  'const BUSINESSES: Business[] = [];',
  'const USER_PROFILES: Record<string, UserProfile> = {};',
];

for (const marker of requiredAppMarkers) {
  if (!app.includes(marker)) {
    throw new Error(`Neighborly build verification failed: missing App marker: ${marker}`);
  }
}

for (const fakeMarker of ['name: "Martinez Plumbing"', 'name: "Corner Market Deli"', '"Maria Santos": {', '"James Whitfield": {']) {
  if (app.includes(fakeMarker)) {
    throw new Error(`Neighborly build verification failed: fake directory data remains: ${fakeMarker}`);
  }
}

const personalGalleryStart = app.indexOf('<Camera size={14} /> Photo Gallery ({gallery.length})');
const personalGalleryEnd = app.indexOf('{tab === "reviews"', personalGalleryStart);
const personalGallery = app.slice(personalGalleryStart, personalGalleryEnd);
const ownerOnlyGalleryControls = personalGallery.match(/\{isOwnProfile && \(/g) || [];

if (
  personalGalleryStart === -1
  || personalGalleryEnd === -1
  || ownerOnlyGalleryControls.length < 2
  || !personalGallery.includes("No photos shared yet.")
) {
  throw new Error("Neighborly build verification failed: personal gallery upload controls must be owner-only.");
}

if (!settings.includes("<BlockedMembersSettings />")) {
  throw new Error("Neighborly build verification failed: blocked member settings are missing.");
}

if (!settings.includes("Your city or Neighborly area is always shown.")) {
  throw new Error("Neighborly build verification failed: business location privacy control is missing.");
}

const requiredAuthMarkers = [
  'const NEIGHBORLY_PRODUCTION_ORIGIN = "https://www.neighborshelpingneighbors.online";',
  'emailRedirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent("/profile")}`',
  'redirectTo: `${getAuthRedirectOrigin()}/reset-password`',
  'async function handleResendConfirmation()',
  'Send a new confirmation email',
  'from("community_areas")',
  'list="neighborly-city-options"',
  'list="neighborly-neighborhood-options"',
];

for (const marker of requiredAuthMarkers) {
  if (!authView.includes(marker)) {
    throw new Error(`Neighborly build verification failed: missing auth marker: ${marker}`);
  }
}

console.log(`Neighborly build patches verified (${patches.length} patch modules).`);
