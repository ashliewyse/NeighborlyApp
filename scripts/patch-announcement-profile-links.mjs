import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, "../src/app/App.tsx");
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) {
    throw new Error(`Neighborly announcement link patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

if (!source.includes("function getWelcomeAnnouncementLink(post: Post)")) {
  replaceOnce(
`function locationKey(value?: string | null) {`,
`interface WelcomeAnnouncementLink {
  before: string;
  name: string;
  after: string;
  subjectUserId: string;
  preferBusiness: boolean;
}

function getWelcomeAnnouncementLink(post: Post): WelcomeAnnouncementLink | null {
  if (!post.isAdminPost || !post.authorId) return null;

  const patterns = [
    {
      prefix: "👋 Welcome a New Neighbor! ",
      marker: " just joined Neighborly in ",
      preferBusiness: false,
    },
    {
      prefix: "🏪 New Local Business: ",
      marker: " has joined Neighborly in ",
      preferBusiness: true,
    },
  ];

  for (const pattern of patterns) {
    if (!post.body.startsWith(pattern.prefix)) continue;
    const markerIndex = post.body.indexOf(pattern.marker, pattern.prefix.length);
    if (markerIndex <= pattern.prefix.length) continue;

    const name = post.body.slice(pattern.prefix.length, markerIndex).trim();
    if (!name) continue;

    return {
      before: post.body.slice(0, pattern.prefix.length),
      name,
      after: post.body.slice(markerIndex),
      subjectUserId: post.authorId,
      preferBusiness: pattern.preferBusiness,
    };
  }

  return null;
}

function locationKey(value?: string | null) {`,
    "location helper insertion point",
  );
}

if (!source.includes("const announcementLink = getWelcomeAnnouncementLink(post);")) {
  replaceOnce(
`                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {post.body}
                    </p>`,
`                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {(() => {
                        const announcementLink = getWelcomeAnnouncementLink(post);
                        if (!announcementLink) return post.body;
                        return (
                          <>
                            {announcementLink.before}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void goToUser(
                                  announcementLink.name,
                                  announcementLink.subjectUserId,
                                  { preferBusiness: announcementLink.preferBusiness },
                                );
                              }}
                              className="font-semibold text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                              aria-label={\`View \${announcementLink.name}'s profile\`}
                            >
                              {announcementLink.name}
                            </button>
                            {announcementLink.after}
                          </>
                        );
                      })()}
                    </p>`,
    "main feed post body",
  );
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Linked welcome announcement names to member profiles.");
} else {
  console.log("Welcome announcement profile links already applied.");
}
