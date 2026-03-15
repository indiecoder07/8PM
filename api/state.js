/**
 * /api/state — FieldIQ cloud state endpoint
 *
 * GET  /api/state        → returns the stored JSON state (or null)
 * POST /api/state        → upserts the state, returns { ok: true }
 *
 * Storage: single JSONB row in Neon Postgres.
 * Requires DATABASE_URL environment variable.
 */

import { neon } from "@neondatabase/serverless";

// Lazy initialise once per cold start
let sql = null;

function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

async function ensureTable(db) {
  await db`
    CREATE TABLE IF NOT EXISTS fieldiq_state (
      id         TEXT PRIMARY KEY DEFAULT 'default',
      data       JSONB        NOT NULL,
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req, res) {
  // CORS headers — same-origin only in production, but useful during dev
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ── Shared-secret auth ──────────────────────────────────────────
  const secret = process.env.API_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized." });
    }
  }

  try {
    const db = getDb();
    await ensureTable(db);

    // ── GET: return current state ─────────────────────────────────
    if (req.method === "GET") {
      const rows = await db`
        SELECT data FROM fieldiq_state WHERE id = 'default'
      `;
      return res.status(200).json(rows.length > 0 ? rows[0].data : null);
    }

    // ── POST: upsert state ────────────────────────────────────────
    if (req.method === "POST") {
      const body = req.body;

      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Request body must be a JSON object." });
      }

      await db`
        INSERT INTO fieldiq_state (id, data, updated_at)
        VALUES ('default', ${JSON.stringify(body)}, NOW())
        ON CONFLICT (id) DO UPDATE
          SET data       = EXCLUDED.data,
              updated_at = EXCLUDED.updated_at
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[/api/state]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
