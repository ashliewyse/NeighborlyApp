import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
let source = fs.readFileSync(appPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Could not find ${label}.`);
  source = source.replace(needle, replacement);
}

const safetyImport = 'import { AdminSafetyPanel } from "@/app/components/AdminSafetyPanel";';
const moderatorImport = 'import { ModeratorDashboard } from "@/app/components/ModeratorDashboard";';
if (!source.includes(moderatorImport)) {
  if (!source.includes(safetyImport)) throw new Error("Could not find AdminSafetyPanel import anchor.");
  source = source.replace(safetyImport, `${safetyImport}\n${moderatorImport}`);
}

replaceOnce(
  '  | { page: "admin" }\n',
  '  | { page: "admin" }\n  | { page: "moderator" }\n',
  "ActiveView admin entry",
);

replaceOnce(
  '  const [isSiteAdmin, setIsSiteAdmin] = useState(false);\n  const [adminStatusReady, setAdminStatusReady] = useState(false);',
  '  const [isSiteAdmin, setIsSiteAdmin] = useState(false);\n  const [isSiteModerator, setIsSiteModerator] = useState(false);\n  const [adminStatusReady, setAdminStatusReady] = useState(false);\n  const [moderatorStatusReady, setModeratorStatusReady] = useState(false);',
  "moderator state anchor",
);

replaceOnce(
  '        setIsSiteAdmin(false);\n        setAdminStatusReady(false);',
  '        setIsSiteAdmin(false);\n        setIsSiteModerator(false);\n        setAdminStatusReady(false);\n        setModeratorStatusReady(false);',
  "signed-out role reset",
);

const moderatorEffectAnchor = `  useEffect(() => {\n    if (!isSiteAdmin) {\n      setAdminAttentionCount(0);`;
const moderatorEffect = `  useEffect(() => {\n    if (!authReady || !currentProfile?.id) {\n      setIsSiteModerator(false);\n      setModeratorStatusReady(authReady);\n      return;\n    }\n    let cancelled = false;\n    setModeratorStatusReady(false);\n    void supabase\n      .from("site_moderators")\n      .select("user_id")\n      .eq("user_id", currentProfile.id)\n      .eq("enabled", true)\n      .maybeSingle()\n      .then(({ data, error }) => {\n        if (cancelled) return;\n        if (error) console.error("Could not check moderator access", error);\n        setIsSiteModerator(!!data && !error);\n        setModeratorStatusReady(true);\n      });\n    return () => { cancelled = true; };\n  }, [authReady, currentProfile?.id]);\n\n`;
if (!source.includes('Could not check moderator access')) {
  if (!source.includes(moderatorEffectAnchor)) throw new Error("Could not find admin attention effect anchor.");
  source = source.replace(moderatorEffectAnchor, moderatorEffect + moderatorEffectAnchor);
}

const routeNeedle = `    if (location.pathname === "/admin") {\n      if (!adminStatusReady) return;\n      if (isSiteAdmin) setView({ page: "admin" });\n      else {\n        setView({ page: "feed" });\n        navigate("/", { replace: true });\n      }\n    } else if (location.pathname === "/settings") {`;
const routeReplacement = `    if (location.pathname === "/admin") {\n      if (!adminStatusReady) return;\n      if (isSiteAdmin) setView({ page: "admin" });\n      else {\n        setView({ page: "feed" });\n        navigate("/", { replace: true });\n      }\n    } else if (location.pathname === "/moderator") {\n      if (!adminStatusReady || !moderatorStatusReady) return;\n      if (isSiteAdmin || isSiteModerator) setView({ page: "moderator" });\n      else {\n        setView({ page: "feed" });\n        navigate("/", { replace: true });\n      }\n    } else if (location.pathname === "/settings") {`;
replaceOnce(routeNeedle, routeReplacement, "moderator route branch");

replaceOnce(
  '    } else if (location.pathname === "/" && ["settings", "admin", "me", "my-business"].includes(view.page)) {',
  '    } else if (location.pathname === "/" && ["settings", "admin", "moderator", "me", "my-business"].includes(view.page)) {',
  "root route reset list",
);

replaceOnce(
  '  }, [adminStatusReady, authReady, currentAccountType, isSiteAdmin, location.pathname]);',
  '  }, [adminStatusReady, moderatorStatusReady, authReady, currentAccountType, isSiteAdmin, isSiteModerator, location.pathname]);',
  "route effect dependencies",
);

const adminFunction = `  function goToAdmin() {\n    if (!isSiteAdmin) return;\n    setView({ page: "admin" });\n    navigate("/admin");\n  }`;
const adminAndModeratorFunctions = `${adminFunction}\n  function goToModerator() {\n    if (!isSiteAdmin && !isSiteModerator) return;\n    setView({ page: "moderator" });\n    navigate("/moderator");\n  }`;
replaceOnce(adminFunction, adminAndModeratorFunctions, "goToAdmin function");

const adminRenderAnchor = '  if (view.page === "admin" && currentProfile && isSiteAdmin) return (';
if (!source.includes('view.page === "moderator" && currentProfile')) {
  if (!source.includes(adminRenderAnchor)) throw new Error("Could not find admin render anchor.");
  source = source.replace(
    adminRenderAnchor,
    `  if (view.page === "moderator" && currentProfile && (isSiteAdmin || isSiteModerator)) {\n    return <ModeratorDashboard onBack={goToFeed} />;\n  }\n\n${adminRenderAnchor}`,
  );
}

const desktopFeedbackButton = '            <button onClick={() => setFeedbackOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-50">\n              <MessageSquare size={16} /> Send Feedback\n            </button>';
const desktopModeratorButton = `            {isSiteModerator && (\n              <button onClick={goToModerator} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100">\n                <ShieldAlert size={16} /> Moderator Tools\n              </button>\n            )}\n\n`;
if (!source.includes('onClick={goToModerator}')) {
  if (!source.includes(desktopFeedbackButton)) throw new Error("Could not find desktop feedback button anchor.");
  source = source.replace(desktopFeedbackButton, desktopModeratorButton + desktopFeedbackButton);
}

const mobileFeedbackButton = '          <button onClick={() => { setFeedbackOpen(true); setSidebarOpen(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-300 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50">\n            <MessageSquare size={16} /> Send Feedback\n          </button>';
const mobileModeratorButton = `          {isSiteModerator && (\n            <button onClick={() => { goToModerator(); setSidebarOpen(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100">\n              <ShieldAlert size={16} /> Moderator Tools\n            </button>\n          )}\n\n`;
if (!source.includes('goToModerator(); setSidebarOpen(false)')) {
  if (!source.includes(mobileFeedbackButton)) throw new Error("Could not find mobile feedback button anchor.");
  source = source.replace(mobileFeedbackButton, mobileModeratorButton + mobileFeedbackButton);
}

fs.writeFileSync(appPath, source);
console.log("Added limited Neighborly moderator access and moderator tools route.");
