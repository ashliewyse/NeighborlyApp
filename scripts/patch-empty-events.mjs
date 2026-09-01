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
    throw new Error(`Neighborly empty events patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

// Remove the hard-coded sidebar event examples while keeping the existing UI type-safe.
if (source.includes('const EVENTS = [') && source.includes('title: "Community Cleanup"')) {
  const start = source.indexOf('const EVENTS = [');
  const end = source.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error('Neighborly empty events patch failed: EVENTS array boundary not found.');
  const block = source.slice(start, end + 3);
  if (!block.includes('Community Cleanup') || !block.includes("Farmer's Market")) {
    throw new Error('Neighborly empty events patch failed: EVENTS block did not match the demo data.');
  }
  source = source.slice(0, start) + 'const EVENTS: any[] = [];\n' + source.slice(end + 3);
  changed = true;
}

// Remove the separate hard-coded demo list used by the full Events page.
const eventsViewStart = source.indexOf('function EventsView(');
if (eventsViewStart >= 0) {
  const arrayStart = source.indexOf('  const allEvents = [', eventsViewStart);
  if (arrayStart >= 0) {
    const arrayEnd = source.indexOf('\n  ];', arrayStart);
    if (arrayEnd < 0) throw new Error('Neighborly empty events patch failed: EventsView array boundary not found.');
    const block = source.slice(arrayStart, arrayEnd + 5);
    if (block.includes('Community Cleanup') && block.includes('Youth Soccer Practice')) {
      source = source.slice(0, arrayStart) + '  const allEvents: any[] = [];\n' + source.slice(arrayEnd + 5);
      changed = true;
    }
  }
}

replaceOnce(
  'function EventsView({ onBack, activeLocation }: { onBack: () => void; activeLocation: LocationName }) {',
  'function EventsView({ onBack, activeLocation, onCreate }: { onBack: () => void; activeLocation: LocationName; onCreate: () => void }) {',
  'EventsView create callback',
);

replaceOnce(
`          <p className="text-purple-100 font-semibold font-['DM_Sans',sans-serif]">No events in {locationPromptLabel(activeLocation)}</p>
          <p className="text-purple-400 text-sm mt-1 font-['DM_Sans',sans-serif]">Check back soon or switch to All Areas</p>`,
`          <p className="text-purple-100 font-semibold font-['DM_Sans',sans-serif]">No events yet</p>
          <p className="text-purple-400 text-sm mt-1 font-['DM_Sans',sans-serif]">Be the first to share something happening in your community.</p>
          <button type="button" onClick={onCreate} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Post a new event</button>`,
  'EventsView empty state',
);

replaceOnce(
  '<EventsView onBack={goToFeed} activeLocation={activeLocation} />',
  '<EventsView onBack={goToFeed} activeLocation={activeLocation} onCreate={() => { goToFeed(); setSelectedCategory("event"); setPostCreateError(null); setComposing(true); }} />',
  'EventsView usage',
);

const sidebarMapNeedle = '{EVENTS.map((ev) => (';
const sidebarMapCount = source.split(sidebarMapNeedle).length - 1;
if (sidebarMapCount === 2) {
  const emptyState = `{EVENTS.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
                    <CalendarDays size={20} className="mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-xs font-medium">No events yet</p>
                    <button
                      type="button"
                      onClick={() => { goToFeed(); setSelectedCategory("event"); setPostCreateError(null); setComposing(true); setSidebarOpen(false); }}
                      className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Post a new event
                    </button>
                  </div>
                ) : EVENTS.map((ev) => (`;
  source = source.split(sidebarMapNeedle).join(emptyState);
  changed = true;
} else if (sidebarMapCount !== 0 && !source.includes('Post a new event')) {
  throw new Error(`Neighborly empty events patch failed: expected 2 sidebar event lists, found ${sidebarMapCount}.`);
}

const seeAllNeedle = '<button className="text-xs text-blue-600 font-medium hover:underline">See all</button>';
const seeAllReplacement = '<button onClick={() => setView({ page: "events" })} className="text-xs text-blue-600 font-medium hover:underline">See all</button>';
if (source.includes(seeAllNeedle)) {
  source = source.split(seeAllNeedle).join(seeAllReplacement);
  changed = true;
}

if (!source.includes('const EVENTS: any[] = [];')) {
  throw new Error('Neighborly empty events patch verification failed: sidebar demo events remain.');
}
if (!source.includes('const allEvents: any[] = [];')) {
  throw new Error('Neighborly empty events patch verification failed: Events page demo events remain.');
}
if (!source.includes('Post a new event')) {
  throw new Error('Neighborly empty events patch verification failed: create-event empty state is missing.');
}

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log('Removed demo events and added honest empty event states.');
} else {
  console.log('Neighborly demo events are already removed.');
}
