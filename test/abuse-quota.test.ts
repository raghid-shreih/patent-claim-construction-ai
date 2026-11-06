import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { PostgresQuota } from "../src/server/quota";

test("parallel quota admission stays atomic and survives recreated pools without refunding failed attempts", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  // Production quota rows are never read or changed; only this disposable dev schema is used.
  const schemaName = `claim_abuse_test_${randomUUID().replaceAll("-", "")}`;
  const administration = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const firstPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schemaName}` });
  const restartedPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schemaName}` });
  let firstPoolClosed = false;
  await administration.query(`CREATE SCHEMA "${schemaName}"`);
  try {
    const firstReplica = new PostgresQuota(firstPool, "synthetic-test-only-secret");
    const initialRelease = await firstReplica.reserve("initializer");
    await initialRelease();
    await firstPool.query("DELETE FROM claim_demo_requests");
    const secondReplica = new PostgresQuota(restartedPool, "synthetic-test-only-secret");
    const admissions = await Promise.allSettled(Array.from({ length: 8 }, (_, index) =>
      (index % 2 ? firstReplica : secondReplica).reserve(`visitor-${index}`),
    ));
    const admitted = admissions.filter(result => result.status === "fulfilled");
    assert.equal(admitted.length, 2);
    assert.equal(admissions.filter(result => result.status === "rejected").length, 6);
    assert.equal(Number((await firstPool.query("SELECT count(*) FROM claim_demo_requests")).rows[0].count), 2);
    await firstPool.end();
    firstPoolClosed = true;
    const recreatedService = new PostgresQuota(restartedPool, "synthetic-test-only-secret");
    await assert.rejects(recreatedService.reserve("after-recreation"), /usage limit/);
    // Simulate lease expiry after a crash, without deleting its reserved attempts.
    await restartedPool.query("UPDATE claim_demo_requests SET lease_until=now()-interval '1 second'");
    const afterExpiredLease = await recreatedService.reserve("new-visitor");
    await afterExpiredLease();
    const row = (await restartedPool.query("SELECT count(*) AS attempts, count(*) FILTER (WHERE finished) AS finished FROM claim_demo_requests")).rows[0];
    assert.equal(Number(row.attempts), 3);
    assert.equal(Number(row.finished), 1);
    await restartedPool.query("DELETE FROM claim_demo_requests");
    await restartedPool.query("INSERT INTO claim_demo_requests(visitor_hash, finished) SELECT 'minute-limit', true FROM generate_series(1,6)");
    await assert.rejects(recreatedService.reserve("another-address"), /usage limit/);
    await restartedPool.query("UPDATE claim_demo_requests SET created_at=now()-interval '2 minutes'");
    const afterMinuteWindow = await recreatedService.reserve("another-address");
    await afterMinuteWindow();
    assert.equal(Number((await restartedPool.query("SELECT count(*) FROM claim_demo_requests")).rows[0].count), 7);
  } finally {
    if (!firstPoolClosed) await firstPool.end();
    await restartedPool.end();
    await administration.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await administration.end();
  }
});
