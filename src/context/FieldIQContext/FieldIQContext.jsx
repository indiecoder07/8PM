import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PLAYER_COLOR,
  EVENT_META,
  RESULT_OPTIONS,
  createSeedState,
} from "../../data/seed";
import { fetchStateFromServer, pushStateToServer } from "../../services/storage";
import { extractScorecard } from "../../services/extraction";
import { playerSuccess, uid } from "../../utils/helpers";

const FieldIQContext = createContext(null);
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const FIELDING_TYPES = new Set(["catchTaken", "catchDropped", "runOutTaken", "runOutMissed"]);
const EMPTY_PLAYER_FORM = { name: "", number: "", color: DEFAULT_PLAYER_COLOR };
const EMPTY_SEASON_FORM = { name: "", startDate: "", endDate: "" };
const EMPTY_MATCH_FORM = {
  seasonId: "",
  date: "",
  opponent: "",
  result: "W",
  ourScore: "",
  opponentScore: "",
};
const EMPTY_OPPONENT_FORM = { name: "" };
const EMPTY_STATS_EDITOR = { playerId: "", values: {} };

export function FieldIQProvider({ children }) {
  // ── Core data state ────────────────────────────────────────────────────────
  // Start with empty seed — Neon is the single source of truth.
  const [data, setData]       = useState(createSeedState);
  const [loading, setLoading] = useState(true);

  // Track whether the user has made any changes since hydration.
  // Prevents pushing empty seed state to Neon on cold-start / failed fetch.
  const userChangeCount = useRef(0);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [view, setView] = useState("dashboard");
  const [theme, setTheme] = useState("dark");

  // ── Shared draft state (event logger + upload) ─────────────────────────────
  const [eventDraft, setEventDraft] = useState({ matchId: "", playerId: "" });

  // ── Stats filter ───────────────────────────────────────────────────────────
  const [statsFilter, setStatsFilter] = useState({
    seasonId: "all",
    matchId:  "all",
    playerId: "all",
    opponent: "",
  });

  // ── Upload feedback ────────────────────────────────────────────────────────
  const [uploadMessage, setUploadMessage] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractionPreview, setExtractionPreview] = useState(null);

  // ── Form state (kept in context for cross-view consistency) ───────────────
  const [playerForm, setPlayerForm] = useState(EMPTY_PLAYER_FORM);
  const [seasonForm, setSeasonForm] = useState(EMPTY_SEASON_FORM);
  const [matchForm, setMatchForm] = useState(EMPTY_MATCH_FORM);
  const [opponentForm, setOpponentForm] = useState(EMPTY_OPPONENT_FORM);

  // ── Match view UI state ────────────────────────────────────────────────────
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const [flashEvent, setFlashEvent] = useState("");

  // ── Stats edit state ───────────────────────────────────────────────────────
  const [statsEditor, setStatsEditor] = useState(EMPTY_STATS_EDITOR);

  // ── Server hydration: fetch from Neon once on mount ───────────────────────
  useEffect(() => {
    fetchStateFromServer().then((serverState) => {
      if (serverState) setData(serverState);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistence: push to Neon only after explicit user changes ─────────────
  // This prevents overwriting Neon with empty seed state when hydration fails
  // (e.g. cold-start timeout, network issue, or fresh Vercel deployment).
  useEffect(() => {
    if (!loading && userChangeCount.current > 0) {
      pushStateToServer(data);
    }
  }, [data, loading]);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // ── Seed / re-sync event draft when data loads or changes ─────────────────
  useEffect(() => {
    const matchExists  = data.matches.some((m) => m.id === eventDraft.matchId);
    const playerExists = data.players.some((p) => p.id === eventDraft.playerId && p.active);
    const needsUpdate  = !eventDraft.matchId || !matchExists || !eventDraft.playerId || !playerExists;

    if (needsUpdate && (data.matches.length > 0 || data.players.length > 0)) {
      setEventDraft((current) => {
        const mValid = data.matches.some((m) => m.id === current.matchId);
        const pValid = data.players.some((p) => p.id === current.playerId && p.active);
        return {
          matchId:  mValid  ? current.matchId  : (data.matches[0]?.id || ""),
          playerId: pValid  ? current.playerId : (data.players.find((p) => p.active)?.id || ""),
        };
      });
    }
  }, [data.matches, data.players, eventDraft.matchId, eventDraft.playerId]);

  // Keep the "Add match" season prefilled when seasons exist.
  useEffect(() => {
    if (!matchForm.seasonId && data.seasons[0]) {
      setMatchForm((current) => ({ ...current, seasonId: data.seasons[0].id }));
    }
  }, [data.seasons, matchForm.seasonId]);

  // ── Computed: enriched matches ─────────────────────────────────────────────
  const enrichedMatches = useMemo(
    () =>
      [...data.matches]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((match) => ({
          ...match,
          season:     data.seasons.find((s) => s.id === match.seasonId),
          events:     data.events.filter((e) => e.matchId === match.id),
          scorecards: data.scorecards.filter((sc) => sc.matchId === match.id),
        })),
    [data.matches, data.seasons, data.events, data.scorecards],
  );

  // ── Computed: player cards ─────────────────────────────────────────────────
  const playerCards = useMemo(() => {
    // Pre-build event lookup by player for O(1) access
    const eventsByPlayer = new Map();
    data.events.forEach((e) => {
      const list = eventsByPlayer.get(e.playerId) || [];
      // Attach meta so playerSuccess can check .meta.success
      list.push({ ...e, meta: EVENT_META[e.type] });
      eventsByPlayer.set(e.playerId, list);
    });

    return data.players.map((player) => {
      const playerEvents = eventsByPlayer.get(player.id) || [];
      const success      = playerSuccess(playerEvents, player.id);
      const scorecards   = data.scorecards.filter((sc) => sc.playerId === player.id);
      const totalContribution = scorecards.reduce((sum, sc) => sum + Number(sc.c || 0), 0);
      return { ...player, success, totalContribution };
    });
  }, [data.events, data.players, data.scorecards]);

  // ── Computed: filtered scorecards ─────────────────────────────────────────
  const filteredScorecards = useMemo(() => {
    const allowedMatchIds = new Set(
      data.matches
        .filter((m) => {
          if (statsFilter.seasonId !== "all" && m.seasonId !== statsFilter.seasonId) return false;
          if (statsFilter.matchId  !== "all" && m.id       !== statsFilter.matchId)  return false;
          if (statsFilter.opponent && !m.opponent.toLowerCase().includes(statsFilter.opponent.toLowerCase())) return false;
          return true;
        })
        .map((m) => m.id),
    );

    return data.scorecards.filter((sc) => {
      if (!allowedMatchIds.has(sc.matchId)) return false;
      if (statsFilter.playerId !== "all" && sc.playerId !== statsFilter.playerId) return false;
      return true;
    });
  }, [data.matches, data.scorecards, statsFilter]);

  // ── Computed: leaderboard ─────────────────────────────────────────────────
  const leaderboard = useMemo(() => {
    const playerMap = new Map(data.players.map((p) => [p.id, p]));
    const aggregate = new Map();

    filteredScorecards.forEach((sc) => {
      if (!playerMap.has(sc.playerId)) return;
      const entry = aggregate.get(sc.playerId) || {
        rs: 0, sr: 0, ob: 0, rc: 0, wkts: 0, econ: 0, c: 0, matches: 0,
      };
      entry.rs   += Number(sc.rs   || 0);
      entry.sr   += Number(sc.sr   || 0);
      entry.ob   += Number(sc.ob   || 0);
      entry.rc   += Number(sc.rc   || 0);
      entry.wkts += Number(sc.wkts || 0);
      entry.econ += Number(sc.econ || 0);
      entry.c    += Number(sc.c    || 0);
      entry.matches++;
      aggregate.set(sc.playerId, entry);
    });

    return playerCards
      .map((pc) => {
        const agg = aggregate.get(pc.id) || {
          rs: 0, sr: 0, ob: 0, rc: 0, wkts: 0, econ: 0, c: 0, matches: 0,
        };
        const m = agg.matches || 1;
        return {
          player: pc,
          rs:   Math.round(agg.rs),
          ra:   +(agg.rs / m).toFixed(1),
          sr:   +(agg.sr / m).toFixed(1),
          ob:   Math.round(agg.ob),
          rc:   Math.round(agg.rc),
          wkts: Math.round(agg.wkts),
          econ: +(agg.econ / m).toFixed(1),
          c:    Math.round(agg.c),
          ca:   +(agg.c / m).toFixed(1),
          matches: agg.matches,
        };
      })
      // Default sort: CA high to low (overridden by UI sort state)
      .sort((a, b) => b.ca - a.ca);
  }, [filteredScorecards, playerCards, data.players]);

  // ── Computed: dashboard ───────────────────────────────────────────────────
  const dashboard = useMemo(() => {
    const activePlayers = data.players.filter((p) => p.active).length;
    const wins          = data.matches.filter((m) => m.result === "W").length;
    const recentEvents  = [...data.events]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 6)
      .map((e) => ({
        ...e,
        meta:   EVENT_META[e.type],
        player: data.players.find((p) => p.id === e.playerId),
        match:  data.matches.find((m) => m.id === e.matchId),
      }));

    return {
      activePlayers,
      matchesPlayed: data.matches.length,
      wins,
      totalEvents: data.events.length,
      recentEvents,
    };
  }, [data.events, data.matches, data.players]);

  const topFielders = useMemo(
    () => [...playerCards].sort((a, b) => b.success.rate - a.success.rate).slice(0, 3),
    [playerCards],
  );

  const currentSeason = useMemo(
    () => (data.seasons.length ? data.seasons[data.seasons.length - 1] : null),
    [data.seasons],
  );

  // ── Mutators ──────────────────────────────────────────────────────────────
  const updateData = useCallback((updater) => {
    userChangeCount.current++;
    setData((current) => updater(current));
  }, []);

  const addPlayer = useCallback((formData) => {
    if (!formData.name?.trim()) return false;
    updateData((current) => ({
      ...current,
      players: [
        {
          id:     uid("player"),
          name:   formData.name.trim(),
          number: formData.number.trim(),
          avatar: "",
          active: true,
          color:  formData.color || DEFAULT_PLAYER_COLOR,
        },
        ...current.players,
      ],
    }));
    return true;
  }, [updateData]);

  const togglePlayer = useCallback((playerId) => {
    updateData((current) => ({
      ...current,
      players: current.players.map((p) =>
        p.id === playerId ? { ...p, active: !p.active } : p,
      ),
    }));
  }, [updateData]);

  const updatePlayerAvatar = useCallback((playerId, dataUrl) => {
    updateData((current) => ({
      ...current,
      players: current.players.map((p) =>
        p.id === playerId ? { ...p, avatar: dataUrl } : p,
      ),
    }));
  }, [updateData]);

  const deletePlayer = useCallback((playerId) => {
    updateData((current) => ({
      ...current,
      players:    current.players.filter((p) => p.id !== playerId),
      events:     current.events.filter((e) => e.playerId !== playerId),
      scorecards: current.scorecards.filter((sc) => sc.playerId !== playerId),
    }));
  }, [updateData]);

  const addSeason = useCallback((formData) => {
    if (!formData.name?.trim()) return false;
    updateData((current) => ({
      ...current,
      seasons: [
        ...current.seasons,
        {
          id:        uid("season"),
          name:      formData.name.trim(),
          startDate: formData.startDate,
          endDate:   formData.endDate,
        },
      ],
    }));
    return true;
  }, [updateData]);

  const addMatch = useCallback((formData) => {
    if (!formData.seasonId || !formData.date || !formData.opponent?.trim()) return null;
    const matchId = uid("match");
    updateData((current) => ({
      ...current,
      matches: [
        {
          id:            matchId,
          seasonId:      formData.seasonId,
          date:          formData.date,
          opponent:      formData.opponent.trim(),
          result:        RESULT_OPTIONS.includes(formData.result) ? formData.result : "D",
          ourScore:      Number(formData.ourScore || 0),
          opponentScore: Number(formData.opponentScore || 0),
        },
        ...current.matches,
      ],
    }));
    setEventDraft((current) => ({ ...current, matchId }));
    return matchId;
  }, [updateData]);

  const addOpponent = useCallback((name) => {
    const trimmed = name?.trim();
    if (!trimmed) return false;
    updateData((current) => {
      const duplicate = current.opponents.some(
        (o) => o.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) return current;
      return {
        ...current,
        opponents: [
          ...current.opponents,
          { id: uid("opponent"), name: trimmed },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
    return true;
  }, [updateData]);

  const deleteOpponent = useCallback((opponentId) => {
    updateData((current) => ({
      ...current,
      opponents: current.opponents.filter((o) => o.id !== opponentId),
    }));
  }, [updateData]);

  // ── Form mutators (context-owned UI state) ───────────────────────────────
  const updatePlayerFormField = useCallback((field, value) => {
    setPlayerForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submitPlayerForm = useCallback(() => {
    const ok = addPlayer(playerForm);
    if (!ok) return false;
    setPlayerForm({ ...EMPTY_PLAYER_FORM, color: playerForm.color || DEFAULT_PLAYER_COLOR });
    return true;
  }, [addPlayer, playerForm]);

  const updateSeasonFormField = useCallback((field, value) => {
    setSeasonForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submitSeasonForm = useCallback(() => {
    const ok = addSeason(seasonForm);
    if (!ok) return false;
    setSeasonForm(EMPTY_SEASON_FORM);
    return true;
  }, [addSeason, seasonForm]);

  const updateMatchFormField = useCallback((field, value) => {
    setMatchForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submitMatchForm = useCallback(() => {
    const matchId = addMatch(matchForm);
    if (!matchId) return null;
    setMatchForm((current) => ({
      ...current,
      date: "",
      opponent: "",
      ourScore: "",
      opponentScore: "",
    }));
    return matchId;
  }, [addMatch, matchForm]);

  const updateOpponentFormField = useCallback((value) => {
    setOpponentForm({ name: value });
  }, []);

  const submitOpponentForm = useCallback(() => {
    const ok = addOpponent(opponentForm.name);
    if (!ok) return false;
    setOpponentForm(EMPTY_OPPONENT_FORM);
    return true;
  }, [addOpponent, opponentForm.name]);

  /** Update a single scorecard's fields by its ID. */
  const updateScorecard = useCallback((scorecardId, fields) => {
    updateData((current) => ({
      ...current,
      scorecards: current.scorecards.map((sc) =>
        sc.id === scorecardId ? { ...sc, ...fields } : sc,
      ),
    }));
  }, [updateData]);

  /** Update match metadata by its ID. */
  const updateMatch = useCallback((matchId, fields) => {
    updateData((current) => ({
      ...current,
      matches: current.matches.map((m) =>
        m.id === matchId ? { ...m, ...fields } : m,
      ),
    }));
  }, [updateData]);

  const startStatsEdit = useCallback((matchId, playerId) => {
    if (!matchId || !playerId) return;

    const scorecard = data.scorecards.find(
      (entry) => entry.matchId === matchId && entry.playerId === playerId,
    );
    const fielding = data.events.reduce(
      (acc, event) => {
        if (event.matchId !== matchId || event.playerId !== playerId) return acc;
        if (event.type === "catchTaken") acc.catchTaken += 1;
        if (event.type === "catchDropped") acc.catchDropped += 1;
        if (event.type === "runOutTaken") acc.runOutTaken += 1;
        if (event.type === "runOutMissed") acc.runOutMissed += 1;
        return acc;
      },
      { catchTaken: 0, catchDropped: 0, runOutTaken: 0, runOutMissed: 0 },
    );

    setStatsEditor({
      playerId,
      values: {
        rs: scorecard?.rs ?? 0,
        sr: scorecard?.sr ?? 0,
        ob: scorecard?.ob ?? 0,
        rc: scorecard?.rc ?? 0,
        wkts: scorecard?.wkts ?? 0,
        econ: scorecard?.econ ?? 0,
        c: scorecard?.c ?? 0,
        catchTaken: fielding.catchTaken,
        catchDropped: fielding.catchDropped,
        runOutTaken: fielding.runOutTaken,
        runOutMissed: fielding.runOutMissed,
      },
    });
  }, [data.events, data.scorecards]);

  const updateStatsEditField = useCallback((field, value) => {
    setStatsEditor((current) => ({
      ...current,
      values: {
        ...current.values,
        [field]: value,
      },
    }));
  }, []);

  const cancelStatsEdit = useCallback(() => {
    setStatsEditor(EMPTY_STATS_EDITOR);
  }, []);

  const saveStatsEdit = useCallback((matchId) => {
    if (!matchId || !statsEditor.playerId) return false;
    const playerId = statsEditor.playerId;
    const parsed = {
      rs: Number(statsEditor.values.rs) || 0,
      sr: Number(statsEditor.values.sr) || 0,
      ob: Number(statsEditor.values.ob) || 0,
      rc: Number(statsEditor.values.rc) || 0,
      wkts: Number(statsEditor.values.wkts) || 0,
      econ: Number(statsEditor.values.econ) || 0,
      c: Number(statsEditor.values.c) || 0,
      catchTaken: Math.max(0, Number(statsEditor.values.catchTaken) || 0),
      catchDropped: Math.max(0, Number(statsEditor.values.catchDropped) || 0),
      runOutTaken: Math.max(0, Number(statsEditor.values.runOutTaken) || 0),
      runOutMissed: Math.max(0, Number(statsEditor.values.runOutMissed) || 0),
    };

    updateData((current) => {
      const scorecardIndex = current.scorecards.findIndex(
        (entry) => entry.matchId === matchId && entry.playerId === playerId,
      );

      const nextScorecards =
        scorecardIndex === -1
          ? [
              ...current.scorecards,
              {
                id: uid("score"),
                matchId,
                playerId,
                rs: parsed.rs,
                sr: parsed.sr,
                ob: parsed.ob,
                rc: parsed.rc,
                wkts: parsed.wkts,
                econ: parsed.econ,
                c: parsed.c,
              },
            ]
          : current.scorecards.map((entry, index) =>
              index === scorecardIndex
                ? {
                    ...entry,
                    rs: parsed.rs,
                    sr: parsed.sr,
                    ob: parsed.ob,
                    rc: parsed.rc,
                    wkts: parsed.wkts,
                    econ: parsed.econ,
                    c: parsed.c,
                  }
                : entry,
            );

      const preservedEvents = current.events.filter(
        (event) =>
          !(
            event.matchId === matchId &&
            event.playerId === playerId &&
            FIELDING_TYPES.has(event.type)
          ),
      );

      const generatedEvents = [];
      const baseTime = Date.now();
      const addEvents = (type, count) => {
        for (let index = 0; index < count; index += 1) {
          generatedEvents.push({
            id: uid("event"),
            matchId,
            playerId,
            type,
            timestamp: new Date(baseTime - generatedEvents.length * 1000).toISOString(),
          });
        }
      };
      addEvents("catchTaken", parsed.catchTaken);
      addEvents("catchDropped", parsed.catchDropped);
      addEvents("runOutTaken", parsed.runOutTaken);
      addEvents("runOutMissed", parsed.runOutMissed);

      return {
        ...current,
        scorecards: nextScorecards,
        events: [...generatedEvents, ...preservedEvents],
      };
    });

    setStatsEditor(EMPTY_STATS_EDITOR);
    return true;
  }, [statsEditor, updateData]);

  const logEvent = useCallback((type) => {
    if (!eventDraft.matchId || !eventDraft.playerId) return;
    updateData((current) => ({
      ...current,
      events: [
        {
          id:        uid("event"),
          matchId:   eventDraft.matchId,
          playerId:  eventDraft.playerId,
          type,
          timestamp: new Date().toISOString(),
        },
        ...current.events,
      ],
    }));
  }, [eventDraft, updateData]);

  const logEventWithFlash = useCallback((type) => {
    if (!eventDraft.matchId || !eventDraft.playerId) return;
    logEvent(type);
    setFlashEvent(type);
    window.setTimeout(() => setFlashEvent(""), 600);
  }, [eventDraft.matchId, eventDraft.playerId, logEvent]);

  const handleUpload = useCallback(
    async (file, seasonId) => {
      if (!file) return;

      const activePlayers = data.players.filter((p) => p.active);

      if (activePlayers.length === 0) {
        setUploadMessage("No active players — add players before uploading.");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadMessage(
          `Extraction failed: image is ${sizeMb} MB. Please crop/compress it below 3.5 MB and try again.`,
        );
        return;
      }

      setExtracting(true);
      setUploadMessage("");
      setExtractionPreview(null);

      try {
        // Convert file to base64 data URL
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const result = await extractScorecard(
          dataUrl,
          activePlayers.map((p) => ({ id: p.id, name: p.name })),
        );

        if (result.error) {
          let hint = "";
          if (result.status === 401) {
            hint = " Check Vercel env vars: API_SECRET and VITE_API_SECRET must match exactly (or both be empty).";
          } else if (result.status === 413) {
            hint = " This usually means the uploaded file is too large for the serverless request limit.";
          }

          const detail = result.detail ? ` Detail: ${String(result.detail).slice(0, 180)}` : "";
          const status = result.status ? ` (${result.status})` : "";
          setUploadMessage(`Extraction failed${status}: ${result.error}.${hint}${detail}`);
          return;
        }

        // Build preview data for the user to review/edit before saving
        const matchMeta = result.match || {};
        const today     = new Date().toISOString().slice(0, 10);

        // Build a map of extracted scorecards keyed by playerId
        const extractedMap = new Map(
          (result.scorecards || []).map((sc) => [sc.playerId, sc]),
        );

        // Build scorecards for ALL active players — use extracted values or zeros
        const allScorecards = activePlayers.map((p) => {
          const ex = extractedMap.get(p.id);
          return {
            playerId: p.id,
            rs:   Number(ex?.rs)   || 0,
            sr:   Number(ex?.sr)   || 0,
            ob:   Number(ex?.ob)   || 0,
            rc:   Number(ex?.rc)   || 0,
            wkts: Number(ex?.wkts) || 0,
            econ: Number(ex?.econ) || 0,
            c:    Number(ex?.c)    || 0,
          };
        });

        setExtractionPreview({
          seasonId: seasonId || data.seasons[0]?.id || "",
          filename: file.name,
          match: {
            opponent:      matchMeta.opponent || "Unknown",
            result:        RESULT_OPTIONS.includes(matchMeta.result) ? matchMeta.result : "D",
            ourScore:      Number(matchMeta.ourScore) || 0,
            opponentScore: Number(matchMeta.opponentScore) || 0,
            date:          today,
          },
          scorecards: allScorecards,
        });

        setUploadMessage("Extraction complete — review the data below and edit if needed before saving.");
      } catch (err) {
        console.error("Upload extraction error:", err);
        setUploadMessage(`Extraction failed: ${err.message || "Unknown error"}`);
      } finally {
        setExtracting(false);
      }
    },
    [data.players, data.seasons],
  );

  const updateExtractionMatchField = useCallback((field, value) => {
    setExtractionPreview((current) =>
      current ? { ...current, match: { ...current.match, [field]: value } } : current,
    );
  }, []);

  const updateExtractionScorecardField = useCallback((index, field, value) => {
    setExtractionPreview((current) => {
      if (!current || !current.scorecards[index]) return current;
      const scorecards = [...current.scorecards];
      scorecards[index] = { ...scorecards[index], [field]: Number(value) || 0 };
      return { ...current, scorecards };
    });
  }, []);

  /** Confirm the reviewed/edited extraction preview and commit it to data. */
  const confirmExtraction = useCallback(() => {
    if (!extractionPreview) return false;
    const preview = extractionPreview;
    const matchId = uid("match");

    const newMatch = {
      id:            matchId,
      seasonId:      preview.seasonId,
      date:          preview.match.date,
      opponent:      preview.match.opponent,
      result:        preview.match.result,
      ourScore:      Number(preview.match.ourScore) || 0,
      opponentScore: Number(preview.match.opponentScore) || 0,
    };

    const scorecards = preview.scorecards.map((sc) => ({
      ...sc,
      id: uid("score"),
      matchId,
    }));

    updateData((current) => ({
      ...current,
      matches: [newMatch, ...current.matches],
      scorecards: [...current.scorecards, ...scorecards],
      uploads: [
        {
          id:         uid("upload"),
          matchId,
          filename:   preview.filename,
          uploadedAt: new Date().toISOString(),
        },
        ...current.uploads,
      ],
    }));

    setEventDraft((prev) => ({ ...prev, matchId }));
    setExtractionPreview(null);
    setUploadMessage(
      `Saved match vs ${newMatch.opponent} (${newMatch.ourScore}–${newMatch.opponentScore}, ${newMatch.result}) with ${scorecards.length} player stats.`,
    );
    return true;
  }, [extractionPreview, updateData]);

  const discardExtraction = useCallback(() => {
    setExtractionPreview(null);
    setUploadMessage("Extraction discarded.");
  }, []);

  const resetDemo = useCallback(() => {
    userChangeCount.current++;
    setData(createSeedState());
    setUploadMessage("");
    setExtractionPreview(null);
    setExtracting(false);
    setEventDraft({ matchId: "", playerId: "" });
    setStatsFilter({ seasonId: "all", matchId: "all", playerId: "all", opponent: "" });
    setPlayerForm(EMPTY_PLAYER_FORM);
    setSeasonForm(EMPTY_SEASON_FORM);
    setMatchForm(EMPTY_MATCH_FORM);
    setOpponentForm(EMPTY_OPPONENT_FORM);
    setShowMatchPicker(false);
    setFlashEvent("");
    setStatsEditor(EMPTY_STATS_EDITOR);
  }, []);

  const value = {
    // Data
    data,
    loading,
    // UI state
    view,
    setView,
    theme,
    toggleTheme,
    // Draft / filter
    eventDraft,
    setEventDraft,
    statsFilter,
    setStatsFilter,
    playerForm,
    seasonForm,
    matchForm,
    opponentForm,
    showMatchPicker,
    setShowMatchPicker,
    flashEvent,
    statsEditor,
    uploadMessage,
    extracting,
    extractionPreview,
    // Computed
    enrichedMatches,
    playerCards,
    filteredScorecards,
    leaderboard,
    dashboard,
    topFielders,
    currentSeason,
    // Actions
    addPlayer,
    updatePlayerFormField,
    submitPlayerForm,
    togglePlayer,
    updatePlayerAvatar,
    deletePlayer,
    addSeason,
    updateSeasonFormField,
    submitSeasonForm,
    addMatch,
    updateMatchFormField,
    submitMatchForm,
    updateScorecard,
    updateMatch,
    logEvent,
    logEventWithFlash,
    startStatsEdit,
    updateStatsEditField,
    saveStatsEdit,
    cancelStatsEdit,
    addOpponent,
    updateOpponentFormField,
    submitOpponentForm,
    deleteOpponent,
    handleUpload,
    updateExtractionMatchField,
    updateExtractionScorecardField,
    confirmExtraction,
    discardExtraction,
    resetDemo,
  };

  return <FieldIQContext.Provider value={value}>{children}</FieldIQContext.Provider>;
}

/** Consume the FieldIQ context. Must be used inside <FieldIQProvider>. */
export function useFieldIQ() {
  const ctx = useContext(FieldIQContext);
  if (!ctx) throw new Error("useFieldIQ must be used within an <FieldIQProvider>.");
  return ctx;
}
