import fs from "node:fs";

const authViewPath = new URL("../src/app/components/AuthView.tsx", import.meta.url);
let source = fs.readFileSync(authViewPath, "utf8");

const helper = `
const NEIGHBORLY_PRODUCTION_ORIGIN = "https://www.neighborshelpingneighbors.online";

function getAuthRedirectOrigin() {
  if (typeof window === "undefined") return NEIGHBORLY_PRODUCTION_ORIGIN;

  // Never send confirmation/reset links back to a Vercel project URL.
  // Local development can continue using localhost, while every deployed
  // Vercel alias resolves auth links to Neighborly's public custom domain.
  return window.location.hostname.endsWith(".vercel.app")
    ? NEIGHBORLY_PRODUCTION_ORIGIN
    : window.location.origin;
}
`;

if (!source.includes("function getAuthRedirectOrigin()")) {
  const anchor = 'const PREVIEW_PASSWORD = "NeighborlyDemo123!";';
  if (!source.includes(anchor)) {
    throw new Error("Auth redirect patch failed: preview password anchor not found.");
  }
  source = source.replace(anchor, `${anchor}\n${helper}`);
}

source = source.replace(
  'emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile")}`',
  'emailRedirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent("/profile")}`',
);

source = source.replace(
  'redirectTo: `${window.location.origin}/reset-password`',
  'redirectTo: `${getAuthRedirectOrigin()}/reset-password`',
);

const requiredMarkers = [
  'const NEIGHBORLY_PRODUCTION_ORIGIN = "https://www.neighborshelpingneighbors.online";',
  'emailRedirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent("/profile")}`',
  'redirectTo: `${getAuthRedirectOrigin()}/reset-password`',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    throw new Error(`Auth redirect patch failed: missing marker: ${marker}`);
  }
}

fs.writeFileSync(authViewPath, source);
console.log("Neighborly auth redirect patch applied.");
