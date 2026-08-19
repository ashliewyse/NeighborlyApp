import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

// Remove the mobile-only profile navigation component added by the profile wall patch.
s = s.replace(/\nfunction ProfileMobileNav\([\s\S]*?\n}\n\n(?=\/\/ ─── Business Profile)/, '\n');

// Remove nav instances from own personal/business profile wrappers while preserving profile content and Back to feed.
s = s.replace(/\n\s*<ProfileMobileNav[^>]*\/>/g, '');

// Remove extra bottom padding that was only needed to clear the fixed nav.
s = s.replace(/className="pb-16 lg:pb-0"/g, '');

fs.writeFileSync(file, s);
console.log('Removed mobile bottom navigation from profile pages; Back to feed remains the profile exit.');
