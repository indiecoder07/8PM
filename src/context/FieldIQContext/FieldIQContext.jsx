import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EVENT_META, createSeedState } from "../../data/seed";
import {
  fetchStateFromServer,
  pushStateToServer,
  readStateSync,
  writeStateSync,
} from "../../services/storage";
import { extractScorecard } from "../../services/extraction";
import { playerSuccess, uid } from "../../utils/helpers";

const FieldIQContext = createContext(null);

export function FieldIQProvider({ children }) {
  // ── Core data state ────────────────────────────────────────────────────────
  // Initialise synchronously from localStorage so the UI is instant.
  const [data, setData] = useState(readStateSync);

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

  // ── Server hydration: fetch cloud state once on mount ─────────────────────
  useEffect(() => {
    fetchStateFromServer().then((serverState) => {
      if (serverState) {
        setData(serverState);
        writeStateSync(serverState);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistence: write to localStorage + push to Neon on every change ─────
  useEffect(() => {
    writeStateSync(data);
    pushStateToServer(data);
  }, [data]);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // ── Seed event draft when data loads ──────────────────────────────────────
  useEffect(() => {
    if (!eventDraft.matchId && data.matches[0]) {
      setEventDraft((current) => ({
        matchId:  current.matchId  || data.matches[0].id,
        playerId: current.playerId || data.players.find((p) => p.active)?.id || "",
      }));
    }
  }, [data.matches, data.players, eventDraft.matchId]);

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
    const matchMap = new Map(data.matches.map((m) => [m.id, m]));

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
      const entry = aggregate.get(sc.playerId) || { runs: 0, wickets: 0, contribution: 0 };
      entry.runs         += Number(sc.rs   || 0);
      entry.wickets      += Number(sc.wkts || 0);
      entry.contribution += Number(sc.c    || 0);
      aggregate.set(sc.playerId, entry);
    });

    const cardMap = new Map(playerCards.map((pc) => [pc.id, pc]));

    return playerCards
      .map((pc) => {
        const agg = aggregate.get(pc.id) || { runs: 0, wickets: 0, contribution: 0 };
        return { player: pc, ...agg };
      })
      .sort((a, b) => {
        const rDiff = (b.player.success?.rate || 0) - (a.player.success?.rate || 0);
        return rDiff !== 0 ? rDiff : b.contribution - a.contribution;
      });
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
          color:  formData.color,
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
          result:        formData.result,
          ourScore:      Number(formData.ourScore || 0),
          opponentScore: Number(formData.opponentScore || 0),
        },
        ...current.matches,
      ],
    }));
    setEventDraft((current) => ({ ...current, matchId }));
    return matchId;
  }, [updateData]);

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

  // ── Extracting flag (shown in the UI while Claude processes the image) ──
  const [extracting, setExtracting] = useState(false);

  const handleUpload = useCallback(
    async (file) => {
      if (!file || !eventDraft.matchId) return;

      const matchId = eventDraft.matchId;
      const match   = data.matches.find((m) => m.id === matchId);
      const activePlayers = data.players.filter((p) => p.active);

      if (activePlayers.length === 0) {
        setUploadMessage("No active players — add players before uploading.");
        return;
      }

      setExtracting(true);
      setUploadMessage("");

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
          setUploadMessage(`Extraction failed: ${result.error}`);
          return;
        }

        // Tag each scorecard with an ID and the match
        const scorecards = result.scorecards.map((sc) => ({
          ...sc,
          id: uid("score"),
          matchId,
        }));

        updateData((current) => ({
          ...current,
          scorecards: [
            ...current.scorecards.filter((sc) => sc.matchId !== matchId),
            ...scorecards,
          ],
          uploads: [
            {
              id:         uid("upload"),
              matchId,
              filename:   file.name,
              uploadedAt: new Date().toISOString(),
            },
            ...current.uploads,
          ],
        }));

        setUploadMessage(
          `Extracted ${scorecards.length} player stats for ${match?.opponent || "the selected match"} from ${file.name}.`,
        );
      } catch (err) {
        console.error("Upload extraction error:", err);
        setUploadMessage(`Extraction failed: ${err.message || "Unknown error"}`);
      } finally {
        setExtracting(false);
      }
    },
    [data.players, data.matches, eventDraft.matchId, updateData],
  );

  const resetDemo = useCallback(() => {
    setData(createSeedState());
    setUploadMessage("");
    setEventDraft({ matchId: "", playerId: "" });
    setStatsFilter({ seasonId: "all", matchId: "all", playerId: "all", opponent: "" });
  }, []);

  const value = {
    // Data
    data,
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
    uploadMessage,
    extracting,
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
    togglePlayer,
    updatePlayerAvatar,
    deletePlayer,
    addSeason,
    addMatch,
    logEvent,
    handleUpload,
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
