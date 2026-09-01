import fs from "node:fs";

const appPath = new URL("../src/app/App.tsx", import.meta.url);
const settingsPath = new URL("../src/app/components/SettingsView.tsx", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");
let settings = fs.readFileSync(settingsPath, "utf8");
let appChanged = false;
let settingsChanged = false;

function replaceApp(needle, replacement, label) {
  if (app.includes(replacement)) return;
  if (!app.includes(needle)) throw new Error(`Business contact patch failed: missing ${label}.`);
  app = app.replace(needle, replacement);
  appChanged = true;
}

function replaceSettings(needle, replacement, label) {
  if (settings.includes(replacement)) return;
  if (!settings.includes(needle)) throw new Error(`Business contact patch failed: missing settings ${label}.`);
  settings = settings.replace(needle, replacement);
  settingsChanged = true;
}

replaceApp(
`  website: string;
  address: string;
  hours: { day: string; time: string }[];`,
`  website: string;
  address: string;
  showLocation?: boolean;
  hours: { day: string; time: string }[];`,
  "Business location visibility type",
);

replaceApp(
`        website: businessRow?.website || m.business_website || "",
        address: [businessRow?.neighborhood || row?.neighborhood || m.neighborhood, businessRow?.city || row?.city || m.city, businessRow?.zip_code || row?.zip_code || m.zip_code].filter(Boolean).join(", "),
        hours: [],`,
`        website: businessRow?.website || m.business_website || "",
        address: businessRow?.show_location
          ? [businessRow?.neighborhood || row?.neighborhood || m.neighborhood, businessRow?.city || row?.city || m.city, businessRow?.zip_code || row?.zip_code || m.zip_code].filter(Boolean).join(", ")
          : "",
        showLocation: Boolean(businessRow?.show_location),
        hours: [],`,
  "current business public location",
);

replaceApp(
`            website: businessRow.website || "",
            address: [businessRow.neighborhood, businessRow.city, businessRow.zip_code].filter(Boolean).join(", "),
            hours: [],`,
`            website: businessRow.website || "",
            address: businessRow.show_location
              ? [businessRow.neighborhood, businessRow.city, businessRow.zip_code].filter(Boolean).join(", ")
              : "",
            showLocation: Boolean(businessRow.show_location),
            hours: [],`,
  "saved business public location",
);

replaceApp(
`                    label: "Website",
                    value: biz.website,
                    href: \`https://\${biz.website}\`,
                    action: "Visit site",`,
`                    label: "Website",
                    value: biz.website,
                    href: /^https?:\\/\\//i.test(biz.website) ? biz.website : \`https://\${biz.website}\`,
                    action: "Visit site",`,
  "website link normalization",
);

replaceApp(
`                    label: "Address",
                    value: biz.address,
                    href: "#",
                    action: "Get directions",
                  },
                ].map((item) => (`,
`                    label: "Location",
                    value: biz.address,
                    href: \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(biz.address)}\`,
                    action: "Get directions",
                  },
                ].filter((item) => Boolean(item.value?.trim())).map((item) => (`,
  "optional location and blank contact filtering",
);

replaceApp(
`                      <p className="text-sm font-medium mt-0.5 truncate">
                        {item.value}
                      </p>`,
`                      <a
                        href={item.href}
                        target={item.label === "Website" || item.label === "Location" ? "_blank" : undefined}
                        rel={item.label === "Website" || item.label === "Location" ? "noreferrer" : undefined}
                        className="mt-0.5 block text-sm font-medium text-blue-700 hover:underline break-words [overflow-wrap:anywhere]"
                      >
                        {item.value}
                      </a>`,
  "readable clickable contact value",
);

replaceSettings(
`  description: string;
  services: string;
};`,
`  description: string;
  services: string;
  showLocation: boolean;
};`,
  "ProfileForm showLocation",
);

replaceSettings(
`  businessName: "", category: "", phone: "", website: "", description: "", services: "",
};`,
`  businessName: "", category: "", phone: "", website: "", description: "", services: "", showLocation: false,
};`,
  "empty profile showLocation",
);

replaceSettings(
`      description: business?.description || metadata.business_description || "",
      services: Array.isArray(business?.services) ? business.services.join(", ") : (business?.services || ""),
    });`,
`      description: business?.description || metadata.business_description || "",
      services: Array.isArray(business?.services) ? business.services.join(", ") : (business?.services || ""),
      showLocation: Boolean(business?.show_location),
    });`,
  "load showLocation",
);

replaceSettings(
`        website: profile.website.trim(),
        services,
        theme: profile.theme,`,
`        website: profile.website.trim(),
        services,
        show_location: profile.showLocation,
        theme: profile.theme,`,
  "save showLocation",
);

replaceSettings(
`              {accountType === "business" ? <>
                <div><label className={label}>Phone</label><input type="tel" className={input} value={profile.phone} onChange={(e) => setField("phone", e.target.value)} /></div>`,
`              {accountType === "business" ? <>
                <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                  <label className="flex items-start gap-3 text-sm font-medium cursor-pointer">
                    <input type="checkbox" checked={profile.showLocation} onChange={(e) => setField("showLocation", e.target.checked)} className="mt-0.5 h-4 w-4" />
                    <span>
                      Show my location on my business profile
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">Only your neighborhood, city, and ZIP are shown. Neighborly does not publish a street address here.</span>
                    </span>
                  </label>
                </div>
                <div><label className={label}>Phone</label><input type="tel" className={input} value={profile.phone} onChange={(e) => setField("phone", e.target.value)} /></div>`,
  "business location visibility control",
);

if (appChanged) fs.writeFileSync(appPath, app);
if (settingsChanged) fs.writeFileSync(settingsPath, settings);
console.log("Made business contact details readable/clickable and location opt-in.");
