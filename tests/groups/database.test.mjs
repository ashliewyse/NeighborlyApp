import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL enforces group membership, authorship, invitations, blocks and reply persistence", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("tests/groups/bootstrap.sql", "utf8"));
    await db.exec(
      readFileSync(
        "supabase/migrations/20261103174856_group_discussions_and_invites.sql",
        "utf8",
      ),
    );
    const results = await db.exec(
      "begin;\n" +
        readFileSync("tests/groups/permissions.sql", "utf8") +
        "\nrollback;",
    );
    assert.ok(
      results.some((result) =>
        result.rows.some((row) => row.result?.startsWith("PASS:")),
      ),
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as count from public.community_group_posts",
        )
      ).rows[0].count,
      0,
    );
  } finally {
    await db.close();
  }
});
