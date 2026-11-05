import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { PostgresQuota } from "../src/server/quota";

test("persistent reservations enforce concurrent, visitor, and global limits across instances", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  // A disposable schema prevents tests from consuming or resetting actual demo quotas.
  const schemaName = `claim_quota_test_${Date.now()}`;
  const administration = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await administration.query(`CREATE SCHEMA "${schemaName}"`);
  const isolated = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schemaName}` });
  try {
    const firstReplica = new PostgresQuota(isolated, "unit-test-secret");
    const secondReplica = new PostgresQuota(isolated, "unit-test-secret");
    // Initialize first to avoid a CREATE TABLE catalog race within this isolated test.
    const firstRelease = await firstReplica.reserve("visitor-a");
    const secondRelease = await secondReplica.reserve("visitor-b");
    await assert.rejects(() => firstReplica.reserve("visitor-c"), /usage limit/);
    await firstRelease();
    await secondRelease();
    const releaseAfterFinish = await secondReplica.reserve("visitor-c");
    await releaseAfterFinish();
    await isolated.query("UPDATE claim_demo_requests SET created_at=now()-interval '2 hours'");
    // Simulate an expired/crashed request lease: it must not hold capacity forever.
    await isolated.query("UPDATE claim_demo_requests SET finished=false, lease_until=now()-interval '1 minute'");
    const releaseAfterCrash = await firstReplica.reserve("visitor-d");
    await releaseAfterCrash();
    await isolated.query("DELETE FROM claim_demo_requests");
    for (let index = 0; index < 10; index++) {
      await isolated.query("INSERT INTO claim_demo_requests(visitor_hash, created_at, lease_until, finished) SELECT visitor_hash, now()-interval '2 hours', now(), true FROM (SELECT $1::text AS visitor_hash) v", ["different"]);
    }
    await isolated.query("UPDATE claim_demo_requests SET visitor_hash=encode(sha256(convert_to('unit-test-secret:visitor-limit', 'UTF8')), 'hex')");
    await assert.rejects(() => firstReplica.reserve("visitor-limit"), /usage limit/);
    await isolated.query("DELETE FROM claim_demo_requests");
    await isolated.query("INSERT INTO claim_demo_requests(visitor_hash, created_at, lease_until, finished) SELECT 'global', date_trunc('day', now()) + interval '1 second', now(), true FROM generate_series(1,60)");
    await assert.rejects(() => secondReplica.reserve("visitor-other"), /usage limit/);
    assert.equal(Number((await isolated.query("SELECT count(*) FROM claim_demo_requests")).rows[0].count), 60);
  } finally {
    await isolated.end();
    await administration.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await administration.end();
  }
});
