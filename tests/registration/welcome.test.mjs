import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
const server=await createServer({configFile:'tests/profile-render/vite.config.ts',server:{middlewareMode:true}});
try{
 const {RegistrationWelcome,InstallationWelcome}=await server.ssrLoadModule('/tests/registration/fixture.tsx');
 await test('public welcome offers account creation and email confirmation without invitation promises',()=>{
  const html=renderToString(React.createElement(RegistrationWelcome));
  assert.match(html,/Create Account/);assert.match(html,/Verify your email/);
  assert.doesNotMatch(html,/invite-only|After approval|Request Access|request access|member approval/i);
 });
 await test('installation page gives phone and computer instructions without requiring an account',()=>{
  const html=renderToString(React.createElement(InstallationWelcome));
  assert.match(html,/home screen/);assert.match(html,/iPhone or iPad/);assert.match(html,/Android/);assert.match(html,/Computer/);assert.match(html,/internet connection is required/i);assert.match(html,/Add to Home Screen/);
 });
}finally{await server.close();}
