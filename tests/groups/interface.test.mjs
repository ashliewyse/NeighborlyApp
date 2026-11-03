import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
for (const name of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "Node",
  "NodeFilter",
  "CustomEvent",
  "MutationObserver",
  "Event",
])
  globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
const { createRoot } = await import("react-dom/client");
const { Simulate } = await import("react-dom/test-utils");
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const server = await createServer({
  configFile: "tests/groups/vite.config.ts",
  server: { middlewareMode: true },
});
const { MemoryRouter, LocationProbe } = await server.ssrLoadModule(
  "/tests/groups/router.ts",
);
const { GroupPage } = await server.ssrLoadModule(
  "/src/app/components/groups/GroupPage.tsx",
);
const { SharedPostPage } = await server.ssrLoadModule(
  "/src/app/components/SharedPostPage.tsx",
);
const { AppRouter } = await server.ssrLoadModule("/src/app/AppRouter.tsx");
const { ShareButton } = await server.ssrLoadModule(
  "/src/app/components/ShareButton.tsx",
);
const { fixture, GROUP, VIEWER, OWNER } = await server.ssrLoadModule(
  "/tests/groups/fixture.ts",
);
const flush = async () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
const click = async (text) => {
  const button = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === text,
  );
  assert.ok(button, `button ${text}`);
  await act(async () => button.click());
  await flush();
};
async function mount(
  Component = GroupPage,
  props = { groupId: GROUP },
  initialEntries = ["/"],
) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries },
        React.createElement(Component, props),
        React.createElement(LocationProbe),
      ),
    ),
  );
  await flush();
  return {
    host,
    async close() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}
async function change(node, value) {
  await act(async () => Simulate.change(node, { target: { value } }));
}
async function submit(form) {
  await act(async () => Simulate.submit(form));
  await flush();
}
try {
  await test("a new member joins before seeing the discussion composer, and membership survives reopening", async () => {
    fixture.reset();
    let view = await mount();
    try {
      assert.equal(view.host.querySelector("textarea"), null);
      await click("Join group");
      assert.ok(view.host.querySelector("textarea"));
      await view.close();
      view = await mount();
      assert.match(view.host.textContent, /Joined/);
      assert.ok(view.host.querySelector("textarea"));
    } finally {
      await view.close();
    }
  });
  await test("discussion and reply are stored and displayed after reopening", async () => {
    fixture.reset(true);
    let view = await mount();
    try {
      await change(view.host.querySelector("textarea"), "Welcome, neighbors!");
      await submit(view.host.querySelector("form"));
      assert.match(
        view.host.querySelector("article").textContent,
        /Welcome, neighbors!/,
      );
      await click("Replies / Reply");
      await change(
        view.host.querySelector("article textarea"),
        "Glad to be here.",
      );
      await submit(view.host.querySelector("article form"));
      await view.close();
      view = await mount();
      await click("Replies / Reply");
      assert.match(view.host.textContent, /Glad to be here\./);
    } finally {
      await view.close();
    }
  });
  await test("failed discussion saves keep the draft and show no success", async () => {
    fixture.reset(true);
    const view = await mount();
    try {
      fixture.saveError = true;
      await change(view.host.querySelector("textarea"), "Keep this draft.");
      await submit(view.host.querySelector("form"));
      assert.equal(
        view.host.querySelector("textarea").value,
        "Keep this draft.",
      );
      assert.match(
        view.host.querySelector("[role=alert]").textContent,
        /not saved/,
      );
      assert.doesNotMatch(view.host.textContent, /Discussion posted/);
    } finally {
      await view.close();
    }
  });
  await test("a changed session cannot publish as the previous member", async () => {
    fixture.reset(true);
    const view = await mount();
    try {
      fixture.session = OWNER;
      await change(view.host.querySelector("textarea"), "Wrong session.");
      await submit(view.host.querySelector("form"));
      assert.match(
        view.host.querySelector("[role=alert]").textContent,
        /session changed/,
      );
      assert.equal(fixture.tables.community_group_posts.length, 0);
    } finally {
      await view.close();
    }
  });
  await test("accepting an invitation joins; declining does not enroll the recipient", async () => {
    for (const accept of [false, true]) {
      fixture.reset();
      fixture.tables.community_group_invites.push({
        id: "invitation",
        group_id: GROUP,
        inviter_id: OWNER,
        invitee_id: VIEWER,
        status: "pending",
      });
      const view = await mount();
      try {
        await click(accept ? "Accept invitation" : "Decline");
        assert.equal(!!view.host.querySelector("textarea"), accept);
        assert.doesNotMatch(view.host.textContent, /You have been invited/);
      } finally {
        await view.close();
      }
    }
  });
  await test("member search sends one invitation with an explicit tap", async () => {
    fixture.reset(true);
    const view = await mount();
    try {
      await click("Invite a member");
      await change(document.querySelector("[role=dialog] input"), "Casey");
      await act(async () => {
        await new Promise((r) => setTimeout(r, 300));
      });
      await flush();
      assert.equal(fixture.tables.community_group_invites.length, 0);
      await click("Invite");
      assert.match(
        document.querySelector("[role=dialog]").textContent,
        /Invitation sent/,
      );
      assert.equal(fixture.tables.community_group_invites.length, 1);
      assert.equal(fixture.tables.community_group_members.length, 2);
    } finally {
      await view.close();
    }
  });
  await test("sharing exposes email/text and lets the user recover from clipboard denial", async () => {
    const view = await mount(ShareButton, { kind: "post", itemId: GROUP });
    try {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => {
            throw new Error("Denied");
          },
        },
        configurable: true,
      });
      await click("Share");
      const dialog = document.querySelector("[role=dialog]");
      assert.match(dialog.querySelector("a").href, /^mailto:/);
      assert.match(dialog.querySelectorAll("a")[1].href, /^sms:/);
      await click("Copy link");
      assert.match(
        dialog.querySelector("[role=alert]").textContent,
        /Select and copy/,
      );
      assert.equal(
        dialog.querySelector("input").value,
        "https://www.neighborshelpingneighbors.online/posts/" + GROUP,
      );
      assert.equal(dialog.querySelector("[role=status]"), null);
    } finally {
      await view.close();
    }
  });
  await test("native share cancellation does not claim a post was shared", async () => {
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
      },
      configurable: true,
    });
    const view = await mount(ShareButton, {});
    try {
      await click("Share");
      await click("Share with an app");
      assert.equal(document.querySelector("[role=dialog] [role=alert]"), null);
      assert.equal(document.querySelector("[role=dialog] [role=status]"), null);
    } finally {
      await view.close();
      delete navigator.share;
    }
  });
  await test("a shared post loads its original author separately from the auth.users foreign key", async () => {
    fixture.reset();
    fixture.tables.posts.push({
      id: GROUP,
      author_id: OWNER,
      content: "A community update.",
      city: "Michigan City",
      created_at: "2026-11-03T12:00:00Z",
    });
    const view = await mount(SharedPostPage, { postId: GROUP });
    try {
      assert.match(view.host.textContent, /Alex Owner/);
      assert.match(view.host.textContent, /A community update/);
    } finally {
      await view.close();
    }
  });
  await test("unavailable shared posts show no comment form", async () => {
    fixture.reset();
    const view = await mount(SharedPostPage, { postId: GROUP });
    try {
      assert.match(view.host.textContent, /Post unavailable/);
      assert.equal(view.host.querySelector("form"), null);
    } finally {
      await view.close();
    }
  });
  await test("shared group destination survives sign-in to registration and confirmation callback", async () => {
    fixture.reset();
    fixture.viewer = null;
    let view = await mount(AppRouter, {}, ["/groups/" + GROUP]);
    try {
      assert.match(view.host.textContent, /New to Neighborly/);
      await click("Create an account");
      assert.equal(
        view.host.querySelector("[data-location]").textContent,
        "/sign-up?next=" + encodeURIComponent("/groups/" + GROUP),
      );
      assert.match(view.host.textContent, /Already have an account/);
      await view.close();
      fixture.viewer = VIEWER;
      view = await mount(AppRouter, {}, [
        "/auth/callback?next=" + encodeURIComponent("/groups/" + GROUP),
      ]);
      assert.match(view.host.textContent, /Welcome & Testing/);
    } finally {
      await view.close();
    }
  });
  await test("a new reply is visible on a discussion with more than one page of replies", async () => {
    fixture.reset(true);
    fixture.tables.community_group_posts.push({
      id: GROUP,
      group_id: GROUP,
      author_id: OWNER,
      content: "A long discussion.",
      created_at: "2026-11-01T00:00:00Z",
    });
    fixture.tables.community_group_replies = Array.from(
      { length: 40 },
      (_, index) => ({
        id: String(index),
        post_id: GROUP,
        author_id: OWNER,
        content: "Earlier reply " + index,
        created_at: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
      }),
    );
    const view = await mount();
    try {
      await click("Replies / Reply");
      await change(
        view.host.querySelector("article textarea"),
        "The latest reply.",
      );
      await submit(view.host.querySelector("article form"));
      assert.match(
        view.host.querySelector("article").textContent,
        /The latest reply\./,
      );
      await click("Load earlier replies");
      assert.match(
        view.host.querySelector("article").textContent,
        /Earlier reply 0/,
      );
    } finally {
      await view.close();
    }
  });
  await test("a new comment is visible on a shared post with more than one page of comments", async () => {
    fixture.reset();
    fixture.tables.posts.push({
      id: GROUP,
      author_id: OWNER,
      content: "A busy community update.",
      city: "Michigan City",
      created_at: "2026-11-01T00:00:00Z",
    });
    fixture.tables.post_comments = Array.from({ length: 40 }, (_, index) => ({
      id: String(index),
      post_id: GROUP,
      author_id: OWNER,
      body: "Earlier comment " + index,
      created_at: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
    }));
    const view = await mount(SharedPostPage, { postId: GROUP });
    try {
      await change(view.host.querySelector("textarea"), "The latest comment.");
      await submit(view.host.querySelector("form"));
      assert.match(view.host.textContent, /The latest comment\./);
      await click("Load earlier comments");
      assert.match(view.host.textContent, /Earlier comment 0/);
    } finally {
      await view.close();
    }
  });
  await test("Refresh updates replies in an already-open discussion", async () => {
    fixture.reset(true);
    fixture.tables.community_group_posts.push({
      id: GROUP,
      group_id: GROUP,
      author_id: OWNER,
      content: "Refresh this discussion.",
      created_at: "2026-11-01T00:00:00Z",
    });
    const view = await mount();
    try {
      await click("Replies / Reply");
      fixture.tables.community_group_replies.push({
        id: "new-reply",
        post_id: GROUP,
        author_id: OWNER,
        content: "A reply from another neighbor.",
        created_at: "2026-11-03T10:00:00Z",
      });
      await click("Refresh");
      assert.match(
        view.host.querySelector("article").textContent,
        /A reply from another neighbor/,
      );
    } finally {
      await view.close();
    }
  });
} finally {
  await server.close();
  dom.window.close();
}
