/**
 * /api/state — 8PM cloud state endpoint (relational schema)
 *
 * GET  /api/state  → assembles state from individual tables
 * POST /api/state  → syncs incoming state into individual tables
 *
 * Tables: players, seasons, matches, events, scorecards, uploads
 * Requires DATABASE_URL environment variable.
 */

import { neon } from "@neondatabase/serverless";

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

// ── Schema migration ────────────────────────────────────────────────────────

async function ensureTables(db) {
  await db`
    CREATE TABLE IF NOT EXISTS players (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      number  TEXT DEFAULT '',
      avatar  TEXT DEFAULT '',
      active  BOOLEAN DEFAULT true,
      color   TEXT DEFAULT '#84a59d'
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS seasons (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      start_date TEXT DEFAULT '',
      end_date   TEXT DEFAULT ''
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS matches (
      id             TEXT PRIMARY KEY,
      season_id      TEXT NOT NULL,
      date           TEXT DEFAULT '',
      opponent       TEXT NOT NULL DEFAULT 'Unknown',
      result         TEXT DEFAULT 'D',
      our_score      INTEGER DEFAULT 0,
      opponent_score INTEGER DEFAULT 0
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS events (
      id         TEXT PRIMARY KEY,
      match_id   TEXT NOT NULL,
      player_id  TEXT NOT NULL,
      type       TEXT NOT NULL,
      timestamp  TEXT NOT NULL
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS scorecards (
      id         TEXT PRIMARY KEY,
      match_id   TEXT NOT NULL,
      player_id  TEXT NOT NULL,
      rs         REAL DEFAULT 0,
      sr         REAL DEFAULT 0,
      ob         REAL DEFAULT 0,
      rc         REAL DEFAULT 0,
      wkts       REAL DEFAULT 0,
      econ       REAL DEFAULT 0,
      c          REAL DEFAULT 0
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS uploads (
      id          TEXT PRIMARY KEY,
      match_id    TEXT NOT NULL,
      filename    TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `;
}

// ── GET: read all tables and assemble the state shape ───────────────────────

async function getState(db) {
  const [players, seasons, matches, events, scorecards, uploads] = await Promise.all([
    db`SELECT id, name, number, avatar, active, color FROM players`,
    db`SELECT id, name, start_date, end_date FROM seasons`,
    db`SELECT id, season_id, date, opponent, result, our_score, opponent_score FROM matches`,
    db`SELECT id, match_id, player_id, type, timestamp FROM events`,
    db`SELECT id, match_id, player_id, rs, sr, ob, rc, wkts, econ, c FROM scorecards`,
    db`SELECT id, match_id, filename, uploaded_at FROM uploads`,
  ]);

  return {
    players: players.map((r) => ({
      id: r.id, name: r.name, number: r.number,
      avatar: r.avatar, active: r.active, color: r.color,
    })),
    seasons: seasons.map((r) => ({
      id: r.id, name: r.name,
      startDate: r.start_date, endDate: r.end_date,
    })),
    matches: matches.map((r) => ({
      id: r.id, seasonId: r.season_id, date: r.date,
      opponent: r.opponent, result: r.result,
      ourScore: r.our_score, opponentScore: r.opponent_score,
    })),
    events: events.map((r) => ({
      id: r.id, matchId: r.match_id, playerId: r.player_id,
      type: r.type, timestamp: r.timestamp,
    })),
    scorecards: scorecards.map((r) => ({
      id: r.id, matchId: r.match_id, playerId: r.player_id,
      rs: r.rs, sr: r.sr, ob: r.ob, rc: r.rc,
      wkts: r.wkts, econ: r.econ, c: r.c,
    })),
    uploads: uploads.map((r) => ({
      id: r.id, matchId: r.match_id,
      filename: r.filename, uploadedAt: r.uploaded_at,
    })),
  };
}

// ── POST: sync incoming state into individual tables ────────────────────────
// Strategy: delete all, then bulk insert. Simple and correct for single-user.

async function syncState(db, state) {
  // Clear tables (children first to avoid any future FK issues)
  await Promise.all([
    db`DELETE FROM uploads`,
    db`DELETE FROM scorecards`,
    db`DELETE FROM events`,
  ]);
  await db`DELETE FROM matches`;
  await Promise.all([
    db`DELETE FROM seasons`,
    db`DELETE FROM players`,
  ]);

  // Insert players
  const players = state.players || [];
  for (const p of players) {
    await db`
      INSERT INTO players (id, name, number, avatar, active, color)
      VALUES (${p.id}, ${p.name}, ${p.number || ''}, ${p.avatar || ''}, ${p.active !== false}, ${p.color || '#84a59d'})
    `;
  }

  // Insert seasons
  const seasons = state.seasons || [];
  for (const s of seasons) {
    await db`
      INSERT INTO seasons (id, name, start_date, end_date)
      VALUES (${s.id}, ${s.name}, ${s.startDate || ''}, ${s.endDate || ''})
    `;
  }

  // Insert matches
  const matches = state.matches || [];
  for (const m of matches) {
    await db`
      INSERT INTO matches (id, season_id, date, opponent, result, our_score, opponent_score)
      VALUES (${m.id}, ${m.seasonId || ''}, ${m.date || ''}, ${m.opponent || 'Unknown'}, ${m.result || 'D'}, ${Number(m.ourScore) || 0}, ${Number(m.opponentScore) || 0})
    `;
  }

  // Insert events
  const events = state.events || [];
  for (const e of events) {
    await db`
      INSERT INTO events (id, match_id, player_id, type, timestamp)
      VALUES (${e.id}, ${e.matchId}, ${e.playerId}, ${e.type}, ${e.timestamp})
    `;
  }

  // Insert scorecards
  const scorecards = state.scorecards || [];
  for (const sc of scorecards) {
    await db`
      INSERT INTO scorecards (id, match_id, player_id, rs, sr, ob, rc, wkts, econ, c)
      VALUES (${sc.id}, ${sc.matchId}, ${sc.playerId}, ${Number(sc.rs) || 0}, ${Number(sc.sr) || 0}, ${Number(sc.ob) || 0}, ${Number(sc.rc) || 0}, ${Number(sc.wkts) || 0}, ${Number(sc.econ) || 0}, ${Number(sc.c) || 0})
    `;
  }

  // Insert uploads
  const uploads = state.uploads || [];
  for (const u of uploads) {
    await db`
      INSERT INTO uploads (id, match_id, filename, uploaded_at)
      VALUES (${u.id}, ${u.matchId}, ${u.filename}, ${u.uploadedAt})
    `;
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
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
    await ensureTables(db);

    if (req.method === "GET") {
      const state = await getState(db);
      return res.status(200).json(state);
    }

    if (req.method === "POST") {
      const body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Request body must be a JSON object." });
      }
      await syncState(db, body);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[/api/state]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
