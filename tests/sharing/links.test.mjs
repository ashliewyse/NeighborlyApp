import test from "node:test";
import assert from "node:assert/strict";
const sharing = await import("../../src/lib/sharing.mjs").catch(() => ({}));

test("sharing uses durable public URLs without copying private post text", () => {
  assert.equal(
    typeof sharing.shareTarget,
    "function",
    "sharing targets are implemented",
  );
  const post = sharing.shareTarget(
    "post",
    "11111111-1111-4111-8111-111111111111",
  );
  assert.deepEqual(post, {
    title: "Neighborly post",
    text: "See this post on Neighborly.",
    url: "https://www.neighborshelpingneighbors.online/posts/11111111-1111-4111-8111-111111111111",
  });
  assert.equal(
    sharing.shareTarget("website").url,
    "https://www.neighborshelpingneighbors.online/",
  );
  assert.throws(() => sharing.shareTarget("post", "../settings"));
});

test("email and text links preserve the complete share URL and encode punctuation", () => {
  assert.equal(typeof sharing.shareLinks, "function");
  const data = {
    title: "Hi & welcome",
    text: "Join us!",
    url: "https://www.neighborshelpingneighbors.online/",
  };
  const links = sharing.shareLinks(data, "Android");
  assert.equal(
    links.email,
    "mailto:?subject=Hi%20%26%20welcome&body=Join%20us!%0Ahttps%3A%2F%2Fwww.neighborshelpingneighbors.online%2F",
  );
  assert.equal(
    links.sms,
    "sms:?body=Join%20us!%0Ahttps%3A%2F%2Fwww.neighborshelpingneighbors.online%2F",
  );
  assert.match(sharing.shareLinks(data, "iPhone").sms, /^sms:&body=/);
});

test("shared destinations survive authentication but cannot redirect outside Neighborly", () => {
  assert.equal(typeof sharing.safeReturnPath, "function");
  const path = "/groups/11111111-1111-4111-8111-111111111111";
  assert.equal(sharing.safeReturnPath(path), path);
  for (const path of [
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "/%2f%2fevil.test",
    "/sign-in",
    "/groups/nope",
    null,
  ]) {
    assert.equal(sharing.safeReturnPath(path, "/profile"), "/profile");
  }
});
