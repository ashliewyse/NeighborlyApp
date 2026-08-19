import fs from 'node:fs';

const file = 'src/app/App.tsx';
let s = fs.readFileSync(file, 'utf8');

const from = '<Avatar name={post.author} size="md" />';
const to = '<Avatar name={post.author} size="md" src={post.author === (currentAccountType === "business" ? currentBusiness?.name : currentProfile?.name) ? myAvatarUrl : null} />';

if (!s.includes(from)) throw new Error('Patch failed: feed post avatar');
s = s.replace(from, to);

fs.writeFileSync(file, s);
console.log('Patched own feed posts to use the saved profile/business avatar.');
