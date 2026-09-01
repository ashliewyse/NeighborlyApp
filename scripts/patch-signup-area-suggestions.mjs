import fs from "node:fs";

const authViewPath = new URL("../src/app/components/AuthView.tsx", import.meta.url);
let source = fs.readFileSync(authViewPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Signup area suggestions patch failed: ${label}`);
  source = source.replace(needle, replacement);
}

const helperAnchor = "async function syncProfileFromMetadata(user: any) {";
if (!source.includes("function signupAreaKey(value: string)")) {
  if (!source.includes(helperAnchor)) throw new Error("Signup area suggestions patch failed: profile sync anchor not found.");
  const helpers = `function signupAreaKey(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, "");
}

function tidySignupArea(value: string) {
  return value.trim().replace(/\\s+/g, " ");
}

`;
  source = source.replace(helperAnchor, `${helpers}${helperAnchor}`);
}

replaceOnce(
  '  const [neighborhood, setNeighborhood] = useState("");\n  const [bio, setBio] = useState("");',
  '  const [neighborhood, setNeighborhood] = useState("");\n  const [signupAreaOptions, setSignupAreaOptions] = useState<Array<{ city: string; neighborhood: string | null }>>([]);\n  const [bio, setBio] = useState("");',
  "location state anchor not found",
);

if (!source.includes("setSignupAreaOptions" ) || !source.includes('from("community_areas")')) {
  const resetAnchor = "  function resetMessages() {";
  if (!source.includes(resetAnchor)) throw new Error("Signup area suggestions patch failed: resetMessages anchor not found.");
  const areaEffect = `  useEffect(() => {
    if (previewMode) return;
    let active = true;

    supabase
      .from("community_areas")
      .select("city, neighborhood")
      .eq("is_active", true)
      .order("city", { ascending: true })
      .order("neighborhood", { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        if (!active) return;
        setSignupAreaOptions((data || []) as Array<{ city: string; neighborhood: string | null }>);
      });

    return () => {
      active = false;
    };
  }, [previewMode]);

`;
  source = source.replace(resetAnchor, `${areaEffect}${resetAnchor}`);
}

const previewEnd = `    if (previewMode) {
      setPreviewComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusy(true);`;
const canonicalizeBeforeSignup = `    if (previewMode) {
      setPreviewComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!city.trim()) {
      setError("Enter your city or town so Neighborly can connect you with the right local community.");
      return;
    }

    const typedCity = tidySignupArea(city);
    const cityMatch = signupAreaOptions.find(
      (option) => !option.neighborhood && signupAreaKey(option.city) === signupAreaKey(typedCity),
    );
    const resolvedCity = cityMatch?.city || typedCity;
    const typedNeighborhood = tidySignupArea(neighborhood);
    const neighborhoodMatch = typedNeighborhood
      ? signupAreaOptions.find(
          (option) =>
            !!option.neighborhood &&
            signupAreaKey(option.city) === signupAreaKey(resolvedCity) &&
            signupAreaKey(option.neighborhood || "") === signupAreaKey(typedNeighborhood),
        )
      : null;
    const resolvedNeighborhood = neighborhoodMatch?.neighborhood || typedNeighborhood;

    setCity(resolvedCity);
    setNeighborhood(resolvedNeighborhood || "");
    setBusy(true);`;
replaceOnce(previewEnd, canonicalizeBeforeSignup, "signup submit anchor not found");

replaceOnce(
  '          city: city.trim(),\n          zip_code: zipCode.trim(),\n          neighborhood: neighborhood.trim(),',
  '          city: resolvedCity,\n          zip_code: zipCode.trim(),\n          neighborhood: resolvedNeighborhood || "",',
  "signup metadata location fields not found",
);

const oldCityInput = '<div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-muted-foreground" /><input className={`${inputClass} pl-9`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Michigan City" /></div>';
const newCityInput = `<div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-muted-foreground" /><input list="neighborly-city-options" className={\`${'${inputClass}'} pl-9\`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Michigan City" autoComplete="address-level2" /></div>
                  <datalist id="neighborly-city-options">
                    {Array.from(new Set(signupAreaOptions.map((option) => option.city))).map((optionCity) => <option key={optionCity} value={optionCity} />)}
                  </datalist>`;
replaceOnce(oldCityInput, newCityInput, "city input not found");

const oldNeighborhoodInput = '<input className={inputClass} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Long Beach, Trail Creek, downtown…" />';
const newNeighborhoodInput = `<input list="neighborly-neighborhood-options" className={inputClass} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Long Beach, Trail Creek, downtown…" autoComplete="address-level3" />
                <datalist id="neighborly-neighborhood-options">
                  {Array.from(new Set(signupAreaOptions
                    .filter((option) => option.neighborhood && (!city.trim() || signupAreaKey(option.city) === signupAreaKey(city)))
                    .map((option) => option.neighborhood as string))).map((optionNeighborhood) => <option key={optionNeighborhood} value={optionNeighborhood} />)}
                </datalist>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Choose an existing neighborhood when it matches. If yours is new, Neighborly will add it automatically.</p>`;
replaceOnce(oldNeighborhoodInput, newNeighborhoodInput, "neighborhood input not found");

const required = [
  'from("community_areas")',
  'list="neighborly-city-options"',
  'list="neighborly-neighborhood-options"',
  "const resolvedCity",
  "Choose an existing neighborhood when it matches",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Signup area suggestions verification failed: ${marker}`);
}

fs.writeFileSync(authViewPath, source);
console.log("Added existing-area suggestions and canonical location matching to Neighborly signup.");
