import fs from "node:fs";

const settingsPath = new URL("../src/app/components/SettingsView.tsx", import.meta.url);
let source = fs.readFileSync(settingsPath, "utf8");

const blockedImport = 'import { BlockedMembersSettings } from "@/app/components/BlockedMembersSettings";';
if (!source.includes(blockedImport)) {
  const importAnchor = 'import { CommunityGuidelines } from "@/app/components/CommunityGuidelines";';
  if (!source.includes(importAnchor)) throw new Error("Could not find SettingsView import anchor.");
  source = source.replace(importAnchor, `${importAnchor}\n${blockedImport}`);
}

const emailSectionAnchor = '        <section className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="flex items-center gap-2 mb-4"><Mail size={16} className="text-primary" /><h2 className="font-semibold">Email address</h2></div>';
if (!source.includes("<BlockedMembersSettings />")) {
  if (!source.includes(emailSectionAnchor)) throw new Error("Could not find SettingsView email section anchor.");
  source = source.replace(emailSectionAnchor, `        <BlockedMembersSettings />\n${emailSectionAnchor}`);
}

fs.writeFileSync(settingsPath, source);
console.log("Added blocked-member management to Neighborly settings.");
