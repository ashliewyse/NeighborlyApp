import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
const server = await createServer({ configFile: 'tests/profile-render/vite.config.ts', server: { middlewareMode: true } });
try {
 const { UserProfileView, BusinessProfileView } = await server.ssrLoadModule('/src/app/App.tsx');
 const profile = { id: 'fixture-person', name: 'Test Neighbor', city: 'Test City', neighborhood: 'Test Area', joinDate: 'October 2026', bio: 'Personal profile fixture', badges: [], posts: 0, neighbors: 0, helpfulVotes: 0, recsGiven: 0, rating: 0, ratingCount: 0, neighborReviews: [], galleryPhotos: [], recentActivity: [] };
 for (const own of [false, true]) for (const theme of ['Classic Blue','Ocean Breeze','Sunset Glow','Emerald Forest','Royal Purple','Midnight Dark']) {
  await test(`personal profile renders: own=${own}, theme=${theme}`, () => {
   const html=renderToString(React.createElement(UserProfileView,{profile:{...profile,theme},isOwnProfile:own,onBack:()=>{}}));
   assert.match(html,/Test Neighbor/); assert.match(html,/Personal profile fixture/); assert.match(html,/Back to feed/);
  });
 }
 await test('business profile still renders',()=>{
  const biz={id:1,name:'Test Business',category:'Services',city:'Test City',rating:0,reviewCount:0,badges:[],description:'Business fixture',services:[],photos:[],phone:'',email:'',website:'',address:'',hours:[],founded:'',owner:'Test Owner',reviews:[]};
  assert.match(renderToString(React.createElement(BusinessProfileView,{biz,onBack:()=>{},onUserClick:()=>{}})),/Test Business/);
 });
} finally { await server.close(); }
