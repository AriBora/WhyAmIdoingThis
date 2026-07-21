import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|copy|vacuum|analyze|call|do|merge|refresh|reindex|reset|listen|notify|lock|begin|commit|rollback|savepoint)\b/i;

export function assertSelectOnly(sql: string): void {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (trimmed.includes(";"))
    throw new Error("Only a single statement is allowed (no semicolons).");
  if (!/^\s*(select|with)\b/i.test(trimmed))
    throw new Error("Only SELECT / WITH statements are allowed.");
  if (FORBIDDEN.test(trimmed))
    throw new Error("Query contains forbidden keywords.");
}

export async function runSelect(
  sql: string,
  params: unknown[] = [],
  limit = 500,
) {
  assertSelectOnly(sql);
  const wrapped = `SELECT * FROM (${sql}) AS _sub LIMIT ${limit}`;
  const client = await getPool().connect();
  try {
    // Read-only transaction as a safety net.
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '8s'");
    const res = await client.query(wrapped, params);
    await client.query("COMMIT");
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* noop */
    }
    throw e;
  } finally {
    client.release();
  }
}
