import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { DemoError } from "../core/contracts";

export const QUOTA_SCHEMA = `
CREATE TABLE IF NOT EXISTS claim_demo_requests (
  id bigserial PRIMARY KEY,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz NOT NULL DEFAULT now() + interval '180 seconds',
  finished boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS claim_demo_requests_created ON claim_demo_requests(created_at);
`;

/** Reserved attempts are never refunded: failures must not permit unbounded provider spending. */
export class PostgresQuota {
  private ready: Promise<unknown> | undefined;
  constructor(private pool: Pool, private secret: string) {}

  private async initialize() {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      await connection.query("SELECT pg_advisory_xact_lock(83169042)");
      await connection.query(QUOTA_SCHEMA);
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }

  async reserve(address: string): Promise<() => Promise<void>> {
    if (!this.ready) {
      this.ready = this.initialize().catch(error => {
        this.ready = undefined;
        throw error;
      });
    }
    await this.ready;
    const visitorHash = createHash("sha256").update(`${this.secret}:${address}`).digest("hex");
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      // Transaction-scoped DB lock prevents parallel replicas from over-reserving the global budget.
      await connection.query("SELECT pg_advisory_xact_lock(83169042)");
      await connection.query("DELETE FROM claim_demo_requests WHERE created_at < now() - interval '2 days'");
      const { rows } = await connection.query<{
        global_count: number; visitor_count: number; minute_count: number; active_count: number;
      }>(`SELECT
        count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS global_count,
        count(*) FILTER (WHERE visitor_hash=$1 AND created_at > now()-interval '1 day')::int AS visitor_count,
        count(*) FILTER (WHERE created_at > now()-interval '1 minute')::int AS minute_count,
        count(*) FILTER (WHERE NOT finished AND lease_until > now())::int AS active_count
        FROM claim_demo_requests`, [visitorHash]);
      const usage = rows[0];
      if (usage.global_count >= 60 || usage.visitor_count >= 10 || usage.minute_count >= 6 || usage.active_count >= 2) {
        throw new DemoError(429, "Public demo usage limit reached. Please try later. Each visitor has 10 requests per day; the demo has a shared daily limit.");
      }
      const reserved = await connection.query<{ id: string }>(
        "INSERT INTO claim_demo_requests(visitor_hash) VALUES($1) RETURNING id", [visitorHash],
      );
      await connection.query("COMMIT");
      return async () => { await this.pool.query("UPDATE claim_demo_requests SET finished=true WHERE id=$1", [reserved.rows[0].id]); };
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }
}
