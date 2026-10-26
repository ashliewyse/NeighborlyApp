import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('manifest installs the same-origin Neighborly app with branded icons',()=>{
 const m=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
 assert.equal(m.name,'Neighborly');assert.equal(m.start_url,'/');assert.equal(m.scope,'/');assert.equal(m.display,'standalone');
 for(const size of [192,512]){const icon=m.icons.find(i=>i.sizes===`${size}x${size}`);assert.ok(icon);const bytes=readFileSync('public'+icon.src);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});
test('app shell advertises install metadata',()=>{
 const html=readFileSync('index.html','utf8');assert.match(html,/rel="manifest"/);assert.match(html,/apple-touch-icon/);
});
