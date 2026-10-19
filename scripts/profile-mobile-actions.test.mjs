import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const legacyRow = '<div className="flex items-center gap-2 mt-12 flex-shrink-0 relative">';
const responsiveRow = '<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 mt-12 relative pl-2">';
const originalMenu = '<div role="menu" className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-white shadow-xl">';
const responsiveMenu = '<div role="menu" className="absolute left-0 right-auto sm:left-auto sm:right-0 top-full z-50 mt-1 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-white shadow-xl">';
const selection = '<button role="menuitemradio" aria-checked={option === theme} onClick={() => { void saveBusinessTheme(option); }}>{option}</button>';
const fixture = `${legacyRow}\n</div>\n{themeOpen && (\n${originalMenu}\n${selection}\n</div>\n)}`;

function sandbox(source, action) {
  const root = mkdtempSync(join(tmpdir(), "neighborly-mobile-actions-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "src", "app"), { recursive: true });
  const script = join(root, "scripts", "patch-profile-mobile-actions.mjs");
  const app = join(root, "src", "app", "App.tsx");
  copyFileSync(new URL("./patch-profile-mobile-actions.mjs", import.meta.url), script);
  writeFileSync(app, source);
  const run = () => spawnSync(process.execPath, [script], { encoding: "utf8" });
  const read = () => readFileSync(app, "utf8");
  try { action({ run, read }); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("patches only the profile row and business menu positioning", () => {
  sandbox(fixture, ({ run, read }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(read(), fixture.replace(legacyRow, responsiveRow).replace(originalMenu, responsiveMenu));
  });
});

test("is idempotent on repeated development and production builds", () => {
  sandbox(fixture, ({ run, read }) => {
    assert.equal(run().status, 0);
    const once = read();
    assert.equal(run().status, 0);
    assert.equal(read(), once);
  });
});

test("works when the personal-profile row has already been patched", () => {
  sandbox(fixture.replace(legacyRow, responsiveRow), ({ run, read }) => {
    assert.equal(run().status, 0);
    assert.ok(read().includes(responsiveMenu));
    assert.ok(read().includes(selection));
  });
});

test("leaves fully patched source unchanged", () => {
  const current = fixture.replace(legacyRow, responsiveRow).replace(originalMenu, responsiveMenu);
  sandbox(current, ({ run, read }) => {
    assert.equal(run().status, 0);
    assert.equal(read(), current);
  });
});

test("fails without writing when the business menu cannot be identified", () => {
  const changed = fixture.replace(originalMenu, '<div role="menu">');
  sandbox(changed, ({ run, read }) => {
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /business-profile color menu/i);
    assert.equal(read(), changed);
  });
});

test("fails without writing if the legacy menu marker is ambiguous", () => {
  const duplicate = fixture + '\n' + originalMenu;
  sandbox(duplicate, ({ run, read }) => {
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /business-profile color menu/i);
    assert.equal(read(), duplicate);
  });
});

test("retains the existing fail-fast check for an unknown profile row", () => {
  const changed = fixture.replace(legacyRow, '<div>');
  sandbox(changed, ({ run, read }) => {
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /user-profile action button row/);
    assert.equal(read(), changed);
  });
});
