import fs from "node:fs";

const appPath = "src/app/App.tsx";
const packagePath = "package.json";

let app = fs.readFileSync(appPath, "utf8");

const authImport = 'import { AuthView as SupabaseAuthView } from "@/app/AuthView";';
if (!app.includes(authImport)) {
  const firstImport = 'import React, { useState, useEffect, useRef } from "react";';
  if (!app.includes(firstImport)) throw new Error("Could not locate App.tsx import anchor");
  app = app.replace(firstImport, `${firstImport}\n${authImport}`);
}

if (!app.includes('<SupabaseAuthView')) {
  const oldUsage = '<AuthView\n        mode={view.mode}';
  if (!app.includes(oldUsage)) throw new Error("Could not locate existing AuthView usage");
  app = app.replace(oldUsage, '<SupabaseAuthView\n        mode={view.mode}');
}

fs.writeFileSync(appPath, app);

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.dependencies ||= {};
if (!pkg.dependencies["@supabase/supabase-js"]) {
  pkg.dependencies["@supabase/supabase-js"] = "latest";
}
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");

console.log("Wired Supabase AuthView into App.tsx and added Supabase dependency.");
