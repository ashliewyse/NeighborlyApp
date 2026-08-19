import fs from "node:fs";

const appPath = "src/app/App.tsx";
let source = fs.readFileSync(appPath, "utf8");

// Remove the broken floating-chat component that was inserted inside App's JSX
// and restore the closing tags for the mobile nav and App component.
const floatingFunction = source.indexOf("function FloatingChat() {");
if (floatingFunction !== -1) {
  const floatingMarker = source.lastIndexOf("\n// ─── Floating Chat Button + Chat Window", floatingFunction);
  if (floatingMarker === -1) {
    throw new Error("Could not locate floating chat marker in App.tsx");
  }
  source = source.slice(0, floatingMarker) + `
      </div>
    </div>
  );
}
`;
}

// Add Messages UI state beside Notifications.
const notifState = '  const [notifOpen, setNotifOpen] = useState(false);';
if (!source.includes('const [messagesOpen, setMessagesOpen]')) {
  if (!source.includes(notifState)) throw new Error("Could not locate notification state");
  source = source.replace(
    notifState,
    `${notifState}\n  const [messagesOpen, setMessagesOpen] = useState(false);`,
  );
}

// Add a Messages button immediately beside the notification bell.
const rightSide = '          {/* Right side — bell + avatar */}\n          <div className="flex items-center gap-2 ml-auto flex-shrink-0">';
if (!source.includes('aria-label="Messages"')) {
  if (!source.includes(rightSide)) throw new Error("Could not locate right-side navigation");
  source = source.replace(
    rightSide,
    `          {/* Right side — messages + bell + avatar */}\n          <div className="flex items-center gap-2 ml-auto flex-shrink-0">\n            <button\n              onClick={() => { setMessagesOpen(!messagesOpen); setNotifOpen(false); }}\n              className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"\n              aria-label="Messages"\n              title="Messages"\n            >\n              <MessageSquare size={18} />\n              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full flex items-center justify-center">2</span>\n            </button>`,
  );
}

// Keep Notifications and Messages from being open at the same time.
source = source.replace(
  'onClick={() => setNotifOpen(!notifOpen)}',
  'onClick={() => { setNotifOpen(!notifOpen); setMessagesOpen(false); }}',
);

// Add a compact Messages inbox panel before the main feed.
const mainMarker = '      <main className="max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">';
if (!source.includes('{messagesOpen && (')) {
  if (!source.includes(mainMarker)) throw new Error("Could not locate main feed marker");
  const messagesPanel = `      {messagesOpen && (\n        <div className="fixed inset-0 z-50" onClick={() => setMessagesOpen(false)}>\n          <div\n            className="absolute top-14 right-4 w-[min(24rem,calc(100vw-2rem))] bg-white rounded-xl shadow-2xl border border-border overflow-hidden"\n            onClick={(e) => e.stopPropagation()}\n          >\n            <div className="flex items-center justify-between px-4 py-3 border-b border-border">\n              <div className="flex items-center gap-2">\n                <MessageSquare size={16} className="text-primary" />\n                <h3 className="font-semibold text-sm">Messages</h3>\n              </div>\n              <button\n                onClick={() => setMessagesOpen(false)}\n                className="text-muted-foreground hover:text-foreground"\n                aria-label="Close messages"\n              >\n                <X size={15} />\n              </button>\n            </div>\n            {[\n              { name: "James Whitfield", preview: "Sounds good — Saturday works for me.", time: "5m", unread: true },\n              { name: "Grace Okonkwo", preview: "Thanks for the recommendation!", time: "1h", unread: true },\n              { name: "Nadia Petrov", preview: "I sent you the event details.", time: "Yesterday", unread: false },\n            ].map((m) => (\n              <button\n                key={m.name}\n                className={\`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors \${m.unread ? "bg-blue-50/60" : ""}\`}\n              >\n                <Avatar name={m.name} size="sm" />\n                <div className="flex-1 min-w-0">\n                  <div className="flex items-center justify-between gap-2">\n                    <p className="text-sm font-semibold truncate">{m.name}</p>\n                    <span className="text-xs text-muted-foreground flex-shrink-0">{m.time}</span>\n                  </div>\n                  <p className="text-xs text-muted-foreground truncate mt-0.5">{m.preview}</p>\n                </div>\n                {m.unread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}\n              </button>\n            ))}\n            <div className="p-3 border-t border-border bg-muted/30">\n              <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">\n                Open Messages\n              </button>\n            </div>\n          </div>\n        </div>\n      )}\n\n`;
  source = source.replace(mainMarker, messagesPanel + mainMarker);
}

fs.writeFileSync(appPath, source);
console.log("Prepared App.tsx: removed floating chat and added Messages navigation.");
