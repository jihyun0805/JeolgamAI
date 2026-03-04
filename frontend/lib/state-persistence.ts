import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const STATE_KEY = "default";
const STATE_DIR = path.join(process.cwd(), ".jeolgamai");
const STATE_FILE = path.join(STATE_DIR, "state.json");

type PersistenceMode = "postgres" | "file";

interface PersistenceInfo {
  mode: PersistenceMode;
  stateFile: string;
  postgresEnabled: boolean;
}

function getPersistenceMode(): PersistenceMode {
  return process.env.DATABASE_URL ? "postgres" : "file";
}

function getPool(): Pool {
  const globalScope = globalThis as typeof globalThis & {
    __JEOLGAMAI_PG_POOL__?: Pool;
  };

  if (!globalScope.__JEOLGAMAI_PG_POOL__) {
    globalScope.__JEOLGAMAI_PG_POOL__ = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
    });
  }

  return globalScope.__JEOLGAMAI_PG_POOL__;
}

async function ensurePostgresTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state_snapshots (
      state_key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadFromPostgres<T>(fallback: T): Promise<T> {
  await ensurePostgresTable();
  const pool = getPool();
  const result = await pool.query<{ payload: T }>(
    `SELECT payload FROM app_state_snapshots WHERE state_key = $1 LIMIT 1`,
    [STATE_KEY],
  );

  if (result.rowCount === 0) return fallback;
  return result.rows[0].payload;
}

async function persistToPostgres<T>(state: T): Promise<void> {
  await ensurePostgresTable();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO app_state_snapshots (state_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [STATE_KEY, JSON.stringify(state)],
  );
}

async function loadFromFile<T>(fallback: T): Promise<T> {
  try {
    const text = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function persistToFile<T>(state: T): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state), "utf-8");
}

export async function loadPersistedState<T>(fallback: T): Promise<T> {
  try {
    if (getPersistenceMode() === "postgres") {
      return await loadFromPostgres(fallback);
    }
    return await loadFromFile(fallback);
  } catch {
    return fallback;
  }
}

export async function persistState<T>(state: T): Promise<void> {
  try {
    if (getPersistenceMode() === "postgres") {
      await persistToPostgres(state);
      return;
    }

    await persistToFile(state);
  } catch {
    // no-op for demo stability
  }
}

export function getPersistenceInfo(): PersistenceInfo {
  return {
    mode: getPersistenceMode(),
    stateFile: STATE_FILE,
    postgresEnabled: Boolean(process.env.DATABASE_URL),
  };
}
