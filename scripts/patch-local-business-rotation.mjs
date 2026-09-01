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
    throw new Error(`Neighborly local business rotation patch failed: could not find ${label}.`);
  }
  source = source.replace(needle, replacement);
  changed = true;
}

const componentMarker = "function LocalBusinessesCard({";
if (!source.includes(componentMarker)) {
  replaceOnce(
`export default function App() {`,
`interface SidebarBusiness {
  ownerId: string;
  name: string;
  category: string;
  city: string;
  logoUrl: string | null;
}

function LocalBusinessesCard({
  onOpen,
  onBrowse,
  closeAfterOpen = false,
}: {
  onOpen: (business: SidebarBusiness) => void;
  onBrowse: () => void;
  closeAfterOpen?: boolean;
}) {
  const [businesses, setBusinesses] = useState<SidebarBusiness[]>([]);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBusinesses() {
      const { data, error: loadError } = await supabase
        .from("business_profiles")
        .select("user_id, business_name, category, city, logo_url, created_at")
        .order("created_at", { ascending: true });

      if (!active) return;

      if (loadError) {
        console.error("Could not load local businesses", loadError);
        setError("Local businesses could not be loaded right now.");
        setLoading(false);
        return;
      }

      const nextBusinesses: SidebarBusiness[] = (data || [])
        .filter((row: any) => Boolean(row.user_id && row.business_name?.trim()))
        .map((row: any) => ({
          ownerId: row.user_id,
          name: row.business_name.trim(),
          category: row.category?.trim() || "Local Business",
          city: row.city?.trim() || "",
          logoUrl: row.logo_url || null,
        }));

      setBusinesses(nextBusinesses);
      setRotationIndex((current) => nextBusinesses.length ? current % nextBusinesses.length : 0);
      setError(null);
      setLoading(false);
    }

    void loadBusinesses();
    const refreshTimer = window.setInterval(() => { void loadBusinesses(); }, 60_000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (businesses.length <= 5) {
      setRotationIndex(0);
      return;
    }

    const rotationTimer = window.setInterval(() => {
      setRotationIndex((current) => (current + 1) % businesses.length);
    }, 12_000);

    return () => window.clearInterval(rotationTimer);
  }, [businesses.length]);

  const visibleBusinesses = businesses.length <= 5
    ? businesses
    : Array.from({ length: 5 }, (_, offset) => businesses[(rotationIndex + offset) % businesses.length]);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Local Businesses</h3>
        <button type="button" onClick={onBrowse} className="text-xs text-blue-600 font-medium hover:underline">Browse</button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-label="Loading local businesses">
          {[0, 1].map((item) => (
            <div key={item} className="flex items-center gap-2.5 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded bg-muted w-2/3" />
                <div className="h-2.5 rounded bg-muted w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
      ) : visibleBusinesses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center">
          <Briefcase size={18} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">No local businesses yet</p>
          <p className="text-xs text-muted-foreground mt-1">Business accounts that join Neighborly will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleBusinesses.map((biz) => (
            <button
              key={biz.ownerId}
              type="button"
              onClick={() => onOpen(biz)}
              className="flex items-start gap-2.5 w-full text-left group"
            >
              {biz.logoUrl ? (
                <img src={biz.logoUrl} alt="" className="w-8 h-8 rounded-lg border border-border object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={13} className="text-amber-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate group-hover:text-blue-600 transition-colors">{biz.name}</p>
                <p className="text-xs text-muted-foreground truncate">{biz.category}</p>
                {biz.city && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{biz.city}</p>}
              </div>
              <ChevronRight size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
            </button>
          ))}
          {businesses.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">Rotates automatically · {businesses.length} Neighborly businesses</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {`,
    "App component marker",
  );
}

const desktopOld = `            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Local Businesses</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">Browse</button>
              </div>
              <div className="flex flex-col gap-3">
                {BUSINESSES.map((biz) => (
                  <button key={biz.id} onClick={() => goToBusiness(biz.id)} className="flex items-start gap-2.5 w-full text-left group">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={13} className="text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight group-hover:text-blue-600 transition-colors">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{biz.category}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">{biz.rating}</span>
                        <span className="text-xs text-muted-foreground">({biz.reviewCount})</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>`;

const desktopNew = `            <LocalBusinessesCard
              onOpen={(biz) => { void goToUser(biz.name, biz.ownerId, { preferBusiness: true }); }}
              onBrowse={() => setView({ page: "search" })}
            />`;

replaceOnce(desktopOld, desktopNew, "desktop Local Businesses card");

const mobileOld = `          {/* Local Businesses */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Local Businesses</h3>
              <button className="text-xs text-blue-600 font-medium hover:underline">Browse</button>
            </div>
            <div className="flex flex-col gap-3">
              {BUSINESSES.map((biz) => (
                <button key={biz.id} onClick={() => { goToBusiness(biz.id); setSidebarOpen(false); }} className="flex items-start gap-2.5 w-full text-left group">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0"><Briefcase size={13} className="text-amber-700" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight group-hover:text-blue-600 transition-colors">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.category}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>`;

const mobileNew = `          {/* Local Businesses */}
          <LocalBusinessesCard
            onOpen={(biz) => {
              setSidebarOpen(false);
              void goToUser(biz.name, biz.ownerId, { preferBusiness: true });
            }}
            onBrowse={() => {
              setSidebarOpen(false);
              setView({ page: "search" });
            }}
          />`;

replaceOnce(mobileOld, mobileNew, "mobile Local Businesses card");

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Applied real rotating Neighborly business sidebar.");
} else {
  console.log("Real rotating Neighborly business sidebar already applied.");
}
