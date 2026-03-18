import { uid } from "../utils/helpers";

export const EVENT_META = {
  catchTaken:   { label: "Catch taken",    success: true,  icon: "CT" },
  catchDropped: { label: "Catch dropped",  success: false, icon: "CD" },
  runOutTaken:  { label: "Run out taken",  success: true,  icon: "RO" },
  runOutMissed: { label: "Run out missed", success: false, icon: "RM" },
};

export const RESULT_OPTIONS = ["W", "L", "D"];

export const VIEW_OPTIONS = ["dashboard", "players", "matches", "stats"];

export const PLAYER_COLOR_OPTIONS = [
  { value: "amber", label: "Amber" },
  { value: "mint", label: "Mint" },
  { value: "coral", label: "Coral" },
  { value: "sky", label: "Sky" },
  { value: "slate", label: "Slate" },
];

export const DEFAULT_PLAYER_COLOR = PLAYER_COLOR_OPTIONS[0].value;
const VALID_PLAYER_COLORS = new Set(PLAYER_COLOR_OPTIONS.map((option) => option.value));

/** Build an empty initial state for fresh installs. */
export function createSeedState() {
  return {
    players:    [],
    seasons:    [],
    matches:    [],
    events:     [],
    scorecards: [],
    uploads:    [],
    opponents:  [],
  };
}

/**
 * Validate and normalise persisted state, filling gaps with seed data.
 * Guards against corrupt/partial localStorage payloads.
 */
export function normalizeState(raw) {
  const source    = raw && typeof raw === "object" ? raw : {};

  const players = (Array.isArray(source.players) ? source.players : [])
    .filter((p) => p && typeof p === "object")
    .map((p, i) => ({
      id:     String(p.id     || uid("player")),
      name:   String(p.name   || `Player ${i + 1}`),
      number: String(p.number || ""),
      avatar: String(p.avatar || ""),
      active: p.active !== false,
      color:  VALID_PLAYER_COLORS.has(p.color) ? p.color : DEFAULT_PLAYER_COLOR,
    }));
  const playerIds = new Set(players.map((p) => p.id));

  const seasons = (Array.isArray(source.seasons) ? source.seasons : [])
    .filter((s) => s && typeof s === "object")
    .map((s, i) => ({
      id:        String(s.id        || uid("season")),
      name:      String(s.name      || `Season ${i + 1}`),
      startDate: String(s.startDate || ""),
      endDate:   String(s.endDate   || ""),
    }));
  const seasonIds = new Set(seasons.map((s) => s.id));

  const matches = (Array.isArray(source.matches) ? source.matches : [])
    .filter((m) => m && typeof m === "object")
    .map((m, i) => ({
      id:            String(m.id || uid("match")),
      seasonId:      seasonIds.has(m.seasonId) ? m.seasonId : seasons[0]?.id || "",
      date:          String(m.date     || ""),
      opponent:      String(m.opponent || "Unknown"),
      result:        RESULT_OPTIONS.includes(m.result) ? m.result : "D",
      ourScore:      Number.isFinite(Number(m.ourScore))      ? Number(m.ourScore)      : 0,
      opponentScore: Number.isFinite(Number(m.opponentScore)) ? Number(m.opponentScore) : 0,
    }));
  const matchIds = new Set(matches.map((m) => m.id));

  const events = (Array.isArray(source.events) ? source.events : [])
    .filter((e) => e && typeof e === "object")
    .map((e) => ({
      id:        String(e.id || uid("event")),
      matchId:   matchIds.has(e.matchId)   ? e.matchId   : matches[0]?.id  || "",
      playerId:  playerIds.has(e.playerId) ? e.playerId  : players[0]?.id  || "",
      type:      EVENT_META[e.type]        ? e.type       : "catchDropped",
      timestamp: String(e.timestamp || new Date().toISOString()),
    }))
    .filter((e) => e.matchId && e.playerId);

  const scorecards = (Array.isArray(source.scorecards) ? source.scorecards : [])
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      id:       String(s.id || uid("score")),
      matchId:  matchIds.has(s.matchId)   ? s.matchId  : matches[0]?.id || "",
      playerId: playerIds.has(s.playerId) ? s.playerId : players[0]?.id || "",
      rs:    Number.isFinite(Number(s.rs))    ? Number(s.rs)    : 0,
      sr:    Number.isFinite(Number(s.sr))    ? Number(s.sr)    : 0,
      ob:    Number.isFinite(Number(s.ob))    ? Number(s.ob)    : 0,
      rc:    Number.isFinite(Number(s.rc))    ? Number(s.rc)    : 0,
      wkts:  Number.isFinite(Number(s.wkts)) ? Number(s.wkts)  : 0,
      econ:  Number.isFinite(Number(s.econ)) ? Number(s.econ)  : 0,
      c:     Number.isFinite(Number(s.c))    ? Number(s.c)      : 0,
    }))
    .filter((s) => s.matchId && s.playerId);

  const uploads = (Array.isArray(source.uploads) ? source.uploads : [])
    .filter((u) => u && typeof u === "object")
    .map((u) => ({
      id:         String(u.id || uid("upload")),
      matchId:    matchIds.has(u.matchId) ? u.matchId : matches[0]?.id || "",
      filename:   String(u.filename   || "upload.jpg"),
      uploadedAt: String(u.uploadedAt || new Date().toISOString()),
    }))
    .filter((u) => u.matchId);

  const opponents = (Array.isArray(source.opponents) ? source.opponents : [])
    .filter((o) => o && typeof o === "object" && o.name)
    .map((o) => ({
      id:   String(o.id   || uid("opponent")),
      name: String(o.name).trim(),
    }))
    // deduplicate by name (case-insensitive)
    .filter((o, i, arr) =>
      arr.findIndex((x) => x.name.toLowerCase() === o.name.toLowerCase()) === i,
    );

  return {
    players,
    seasons,
    matches,
    events,
    scorecards,
    uploads,
    opponents,
  };
}
