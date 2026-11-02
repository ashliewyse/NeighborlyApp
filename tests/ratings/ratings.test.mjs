import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const server = await createServer({ configFile: 'tests/ratings/vite.config.ts', server: { middlewareMode: true } });
const { UserProfileView, BusinessProfileView } = await server.ssrLoadModule('/src/app/App.tsx');
const { fixture } = await server.ssrLoadModule('/tests/ratings/supabase.ts');
const profile = { id: 'target-1', name: 'Test Neighbor', city: 'Test City', neighborhood: 'Test Area', joinDate: '', bio: '', badges: [], posts: 0, neighbors: 0, helpfulVotes: 0, recsGiven: 0, rating: 0, ratingCount: 0, neighborReviews: [], galleryPhotos: [], recentActivity: [] };
const biz = { id: 1, ownerId: 'target-1', name: 'Test Business', category: 'Services', city: 'Test City', rating: 0, reviewCount: 0, badges: [], description: '', services: [], photos: [], phone: '', email: '', website: '', address: '', hours: [], founded: '', owner: 'Test Owner', reviews: [] };
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
async function mount(kind, props = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  const Component = kind === 'business' ? BusinessProfileView : UserProfileView;
  const base = kind === 'business' ? { biz } : { profile };
  await act(async () => root.render(React.createElement(Component, { ...base, onBack() {}, onUserClick() {}, ...props })));
  await flush();
  await act(async () => Array.from(host.querySelectorAll('button')).find(b => /^Reviews/.test(b.textContent)).click());
  await flush();
  return { host, root, async close() { await act(async () => root.unmount()); host.remove(); } };
}
function form(host) {
  const heading = Array.from(host.querySelectorAll('h3')).find(h => /Write a Review|Rate.*Review|Your review/i.test(h.textContent));
  assert.ok(heading, 'review form is available'); return heading.parentElement;
}
async function chooseAndSubmit(host, rating = 4, body = 'Helpful and reliable.') {
  const card = form(host);
  const starButtons = Array.from(card.querySelectorAll('button')).filter(b => b.querySelector('svg'));
  await act(async () => starButtons[rating - 1].click());
  const textarea = card.querySelector('textarea');
  // React handles its controlled textarea through the input/change event plugin.
  const { Simulate } = await import('react-dom/test-utils');
  await act(async () => Simulate.change(textarea, { target: { value: body } }));
  await act(async () => Array.from(card.querySelectorAll('button')).find(b => /Submit Review|Update Review/.test(b.textContent)).click());
  await flush();
}

try {
  await test('business stars retain the selected value after a tap', async () => {
    fixture.reset(); const view = await mount('business');
    try {
      const card = form(view.host);
      await act(async () => card.querySelectorAll('button')[3].click());
      assert.equal(card.querySelectorAll('svg.fill-amber-400').length, 4, 'four selected stars must remain filled');
    } finally { await view.close(); }
  });
  for (const kind of ['business', 'personal']) {
    await test(`${kind} review saves and survives closing and reopening the profile`, async () => {
      fixture.reset(); let view = await mount(kind);
      try {
        await chooseAndSubmit(view.host);
        assert.equal(fixture.rows.length, 1, 'review must be stored, not only shown locally');
        assert.equal(fixture.rows[0].reviewee_id, 'target-1');
        assert.equal(fixture.rows[0].rating, 4);
        await view.close(); view = await mount(kind);
        assert.match(view.host.textContent, /Helpful and reliable\./);
        assert.match(view.host.textContent, /4\.0/);
      } finally { await view.close(); }
    });
    await test(`${kind} updates one review without inflating the count`, async () => {
      fixture.reset(); const view = await mount(kind);
      try {
        await chooseAndSubmit(view.host, 4, 'First experience.');
        await chooseAndSubmit(view.host, 5, 'Updated experience.');
        assert.equal(fixture.rows.length, 1);
        assert.equal(fixture.rows[0].body, 'Updated experience.');
        assert.equal(fixture.rows[0].rating, 5);
        assert.match(view.host.querySelector('[aria-label="Rating summary"]').textContent, /5\.0.*1 review/);
        assert.match(view.host.querySelector('article').textContent, /Test Business Reviewer/);
      } finally { await view.close(); }
    });
    await test(`${kind} failed save keeps the draft and never claims success`, async () => {
      fixture.reset(); fixture.saveError = 'Connection unavailable'; const view = await mount(kind);
      try {
        await chooseAndSubmit(view.host, 3, 'Keep my draft.');
        assert.equal(fixture.rows.length, 0);
        assert.match(view.host.querySelector('[role="alert"]').textContent, /not saved.*Connection unavailable/);
        assert.equal(view.host.querySelector('textarea').value, 'Keep my draft.');
        assert.equal(view.host.querySelector('[role="status"]'), null);
        fixture.saveError = null;
        await chooseAndSubmit(view.host, 3, 'Keep my draft.');
        assert.equal(fixture.rows.length, 1);
        assert.match(view.host.querySelector('[role="status"]').textContent, /saved/);
      } finally { await view.close(); }
    });
    await test(`${kind} cannot review own profile`, async () => {
      fixture.reset(); fixture.viewer = 'target-1'; const view = await mount(kind);
      try {
        assert.equal(view.host.querySelector('textarea'), null);
        assert.match(view.host.textContent, /cannot rate your own profile/);
        assert.equal(fixture.rows.length, 0);
      } finally { await view.close(); }
    });
  }
  await test('load errors do not display a false empty review list and can be retried', async () => {
    fixture.reset(); fixture.loadError = 'Ratings temporarily unavailable'; const view = await mount('business');
    try {
      assert.match(view.host.querySelector('[role="alert"]').textContent, /Ratings temporarily unavailable/);
      assert.equal(view.host.querySelector('textarea'), null);
      assert.doesNotMatch(view.host.textContent, /No reviews yet/);
      fixture.loadError = null;
      await act(async () => Array.from(view.host.querySelectorAll('button')).find(b => /Retry loading/.test(b.textContent)).click());
      await flush(); assert.ok(view.host.querySelector('textarea'));
    } finally { await view.close(); }
  });
  await test('a changed sign-in session cannot submit using the previous reviewer', async () => {
    fixture.reset(); const view = await mount('personal');
    try {
      fixture.viewer = 'different-viewer';
      await chooseAndSubmit(view.host);
      assert.equal(fixture.rows.length, 0);
      assert.match(view.host.querySelector('[role="alert"]').textContent, /session changed/);
    } finally { await view.close(); }
  });
  await test('blank review text leaves submission disabled', async () => {
    fixture.reset(); const view = await mount('business');
    try {
      await chooseAndSubmit(view.host, 4, '   ');
      assert.equal(fixture.rows.length, 0);
      assert.equal(form(view.host).querySelector('button[type="submit"]').disabled, true);
    } finally { await view.close(); }
  });
  await test('profile header stars open the review form', async () => {
    fixture.reset(); const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
    try {
      await act(async () => root.render(React.createElement(BusinessProfileView, { biz, onBack() {}, onUserClick() {} })));
      await flush();
      await act(async () => host.querySelector('[aria-label="View business ratings and write a review"]').click());
      assert.ok(form(host).querySelector('textarea'));
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
} finally { await server.close(); dom.window.close(); }
