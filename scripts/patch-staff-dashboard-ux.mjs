import fs from "node:fs";

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Could not find ${label}.`);
  return source.replace(needle, replacement);
}

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

const oldStaffProfileOpen = `  function openProfileFromStaff(name: string, userId: string) {\n    navigate("/", { replace: true });\n    void goToUser(name, userId);\n  }`;
const fixedStaffProfileOpen = `  async function openProfileFromStaff(name: string, userId: string) {\n    if (userId === currentProfile?.id) {\n      goToOwnProfile();\n      return;\n    }\n    await goToUser(name, userId);\n    navigate("/", { replace: true });\n  }`;
app = replaceOnce(app, oldStaffProfileOpen, fixedStaffProfileOpen, "staff profile navigation callback");
fs.writeFileSync(appPath, app);

const memberPath = new URL("../src/app/components/AdminMemberManagement.tsx", import.meta.url);
let members = fs.readFileSync(memberPath, "utf8");

const oldMemberSearch = `      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">\n        <Search size={16} className="text-muted-foreground" />\n        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, business, or email…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />\n      </div>`;
const improvedMemberSearch = `      <div className="sticky top-16 z-20 rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">\n        <div className="flex items-center gap-2">\n          <Search size={16} className="flex-shrink-0 text-purple-600" />\n          <input\n            type="search"\n            value={query}\n            onChange={(event) => setQuery(event.target.value)}\n            placeholder="Search member name, business, or email…"\n            aria-label="Search Neighborly members"\n            autoComplete="off"\n            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"\n          />\n          {query ? (\n            <button type="button" onClick={() => setQuery("")} className="rounded-lg px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50">Clear</button>\n          ) : null}\n        </div>\n        <p className="mt-2 text-[11px] text-muted-foreground">\n          {loading ? "Searching members…" : query.trim() ? \`${members.length} matching member\${members.length === 1 ? "" : "s"}\` : \`${members.length} members loaded\`}\n        </p>\n      </div>`;
members = replaceOnce(members, oldMemberSearch, improvedMemberSearch, "admin member search box");
fs.writeFileSync(memberPath, members);

console.log("Improved staff profile navigation and member search UX.");
