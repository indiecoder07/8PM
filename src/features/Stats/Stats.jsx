import { useMemo, useState } from "react";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { cx, exportCsv } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Stats.module.css";

const SCORECARD_FIELDS = ["rs", "sr", "ob", "rc", "wkts", "econ", "c"];
const FIELD_LABELS = { rs: "RS", sr: "SR", ob: "OB", rc: "RC", wkts: "Wkts", econ: "Econ", c: "C" };

// All sortable columns in display order
const COLUMNS = [
  { key: "player",   label: "Player",          numeric: false },
  { key: "rs",       label: "RS",              numeric: true  },
  { key: "ra",       label: "RA",              numeric: true  },
  { key: "sr",       label: "SR",              numeric: true  },
  { key: "ob",       label: "OB",              numeric: true  },
  { key: "rc",       label: "RC",              numeric: true  },
  { key: "wkts",     label: "Wkts",            numeric: true  },
  { key: "econ",     label: "Econ",            numeric: true  },
  { key: "c",        label: "C",               numeric: true  },
  { key: "ca",       label: "CA",              numeric: true  },
  { key: "success",  label: "Succ%",    numeric: true  },
  { key: "catches",  label: "Chs",      numeric: true  },
  { key: "runouts",  label: "RO",       numeric: true  },
];

function getSortValue(entry, fielding, key) {
  switch (key) {
    case "player":  return entry.player.name.toLowerCase();
    case "success": return entry.player.success?.rate || 0;
    case "catches": return (fielding?.catchTaken || 0) + (fielding?.catchDropped || 0);
    case "runouts": return (fielding?.runOutTaken || 0) + (fielding?.runOutMissed || 0);
    default:        return entry[key] ?? 0;
  }
}

export function Stats({ className }) {
  const {
    data,
    enrichedMatches,
    playerCards,
    filteredScorecards,
    leaderboard,
    statsFilter,
    setStatsFilter,
    statsEditor,
    startStatsEdit,
    updateStatsEditField,
    saveStatsEdit,
    cancelStatsEdit,
  } = useFieldIQ();

  // Default sort: CA high to low
  const [sort, setSort] = useState({ column: "ca", direction: "desc" });

  const isSingleMatch = statsFilter.matchId !== "all";

  const filteredEvents = useMemo(() => {
    const allowedMatchIds = new Set(
      enrichedMatches
        .filter((match) => {
          if (statsFilter.seasonId !== "all" && match.seasonId !== statsFilter.seasonId) return false;
          if (statsFilter.matchId !== "all" && match.id !== statsFilter.matchId) return false;
          if (statsFilter.opponent && !match.opponent.toLowerCase().includes(statsFilter.opponent.toLowerCase())) return false;
          return true;
        })
        .map((match) => match.id),
    );
    return data.events.filter((event) => allowedMatchIds.has(event.matchId));
  }, [data.events, enrichedMatches, statsFilter]);

  const fieldingMap = useMemo(() => {
    const map = new Map();
    for (const event of filteredEvents) {
      const entry = map.get(event.playerId) || {
        catchTaken: 0, catchDropped: 0, runOutTaken: 0, runOutMissed: 0,
      };
      if (event.type === "catchTaken")    entry.catchTaken  += 1;
      if (event.type === "catchDropped")  entry.catchDropped += 1;
      if (event.type === "runOutTaken")   entry.runOutTaken  += 1;
      if (event.type === "runOutMissed")  entry.runOutMissed += 1;
      map.set(event.playerId, entry);
    }
    return map;
  }, [filteredEvents]);

  function fieldingFor(playerId) {
    return fieldingMap.get(playerId) || {
      catchTaken: 0, catchDropped: 0, runOutTaken: 0, runOutMissed: 0,
    };
  }

  // Apply UI sort on top of context leaderboard
  const sortedLeaderboard = useMemo(() => {
    const rows = [...leaderboard];
    rows.sort((a, b) => {
      const fa = fieldingFor(a.player.id);
      const fb = fieldingFor(b.player.id);
      const av = getSortValue(a, fa, sort.column);
      const bv = getSortValue(b, fb, sort.column);
      if (typeof av === "string") {
        return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.direction === "asc" ? av - bv : bv - av;
    });
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboard, sort, fieldingMap]);

  function handleSort(key) {
    setSort((current) => ({
      column: key,
      direction: current.column === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function successFromCounts(values) {
    const ct = Number(values.catchTaken) || 0;
    const cd = Number(values.catchDropped) || 0;
    const rt = Number(values.runOutTaken) || 0;
    const rm = Number(values.runOutMissed) || 0;
    const attempts = ct + cd + rt + rm;
    if (!attempts) return 0;
    return Math.round(((ct + rt) / attempts) * 100);
  }

  function handleExport() {
    exportCsv(
      [
        ["Player", "RS", "RA", "SR", "OB", "RC", "Wkts", "Econ", "C", "CA", "Success%", "Catch T", "Catch D", "RO T", "RO M"],
        ...sortedLeaderboard.map((entry) => {
          const f = fieldingFor(entry.player.id);
          return [
            entry.player.name,
            entry.rs, entry.ra, entry.sr,
            entry.ob, entry.rc, entry.wkts, entry.econ,
            entry.c, entry.ca,
            `${entry.player.success.rate}%`,
            f.catchTaken, f.catchDropped, f.runOutTaken, f.runOutMissed,
          ];
        }),
      ],
      "8pm-stats.csv",
    );
  }

  const cScores = playerCards.map((player) => {
    const scores = filteredScorecards.filter((sc) => sc.playerId === player.id);
    return scores.length
      ? scores.reduce((sum, sc) => sum + Number(sc.c || 0), 0) / scores.length
      : 0;
  });
  const maxScore = Math.max(...cScores, 1);

  function SortIcon({ colKey }) {
    if (sort.column !== colKey) return <span className={styles.sortIconIdle}>⇅</span>;
    return (
      <span className={styles.sortIconActive}>
        {sort.direction === "desc" ? "↓" : "↑"}
      </span>
    );
  }

  return (
    <section className={cx(styles.root, className)}>
      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className={shared.panel}>
        <SectionTitle title="Filters" subtitle="Slice the performance views" />
        <div className={shared.formGrid}>
          <label>
            Season
            <select
              value={statsFilter.seasonId}
              onChange={(e) => setStatsFilter((c) => ({ ...c, seasonId: e.target.value }))}
            >
              <option value="all">All seasons</option>
              {data.seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            Match
            <select
              value={statsFilter.matchId}
              onChange={(e) => setStatsFilter((c) => ({ ...c, matchId: e.target.value }))}
            >
              <option value="all">All matches</option>
              {enrichedMatches.map((m) => (
                <option key={m.id} value={m.id}>{m.date} vs {m.opponent}</option>
              ))}
            </select>
          </label>
          <label>
            Player
            <select
              value={statsFilter.playerId}
              onChange={(e) => setStatsFilter((c) => ({ ...c, playerId: e.target.value }))}
            >
              <option value="all">All players</option>
              {data.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            Opponent
            <input
              value={statsFilter.opponent}
              onChange={(e) => setStatsFilter((c) => ({ ...c, opponent: e.target.value }))}
              placeholder="Search opponent"
            />
          </label>
          <button className={cx(shared.primaryButton, styles.exportButton)} type="button" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────── */}
      <div className={shared.panel}>
        <SectionTitle
          title="Leaderboard"
          subtitle={
            isSingleMatch
              ? "Single match selected — edit batting, bowling, catches and run outs"
              : "Tap any column header to sort"
          }
        />
        <div className={styles.tableScroll}>
        <div className={cx(styles.table, isSingleMatch && styles.tableHasAction)}>

          {/* Desktop-only header row — hidden on mobile */}
          <div className={styles.tableHead}>
            {COLUMNS.map((col) => (
              <button
                key={col.key}
                type="button"
                className={cx(styles.thBtn, col.numeric && styles.thBtnNum)}
                onClick={() => handleSort(col.key)}
                aria-sort={sort.column === col.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
              >
                {col.label}
                <SortIcon colKey={col.key} />
              </button>
            ))}
            {isSingleMatch && <span />}
          </div>

          {sortedLeaderboard.length === 0 ? (
            <p className={shared.muted}>No data matches the current filters.</p>
          ) : (
            sortedLeaderboard.map((entry) => {
              const fielding = fieldingFor(entry.player.id);
              const isEditing = statsEditor.playerId === entry.player.id;
              const editedSuccessRate = successFromCounts(statsEditor.values);

              if (isEditing) {
                return (
                  <div className={cx(styles.tableRow, styles.tableRowEditing)} key={entry.player.id}>
                    <span className={styles.editPlayerName}>{entry.player.name}</span>
                    {SCORECARD_FIELDS.map((field) => (
                      <span className={styles.editCell} key={field}>
                        <span className={styles.editCellLabel}>{FIELD_LABELS[field]}</span>
                        <input
                          type="number"
                          step={field === "sr" || field === "econ" ? "0.01" : "1"}
                          className={styles.editInput}
                          value={statsEditor.values[field]}
                          onChange={(e) => updateStatsEditField(field, e.target.value)}
                        />
                      </span>
                    ))}
                    {/* RA and CA are computed — show read-only placeholders */}
                    <span className={styles.editCell}>
                      <span className={styles.editCellLabel}>CA</span>
                      <span className={styles.statValue}>—</span>
                    </span>
                    <span className={styles.editCell}>
                      <span className={styles.editCellLabel}>Success%</span>
                      <span className={styles.statValue}>{editedSuccessRate}%</span>
                    </span>
                    <span className={styles.editCell}>
                      <span className={styles.editCellLabel}>Catches (T/D)</span>
                      <span className={styles.fieldingInputPair}>
                        <input
                          type="number" min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.catchTaken}
                          onChange={(e) => updateStatsEditField("catchTaken", e.target.value)}
                        />
                        <input
                          type="number" min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.catchDropped}
                          onChange={(e) => updateStatsEditField("catchDropped", e.target.value)}
                        />
                      </span>
                    </span>
                    <span className={styles.editCell}>
                      <span className={styles.editCellLabel}>Run Outs (T/M)</span>
                      <span className={styles.fieldingInputPair}>
                        <input
                          type="number" min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.runOutTaken}
                          onChange={(e) => updateStatsEditField("runOutTaken", e.target.value)}
                        />
                        <input
                          type="number" min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.runOutMissed}
                          onChange={(e) => updateStatsEditField("runOutMissed", e.target.value)}
                        />
                      </span>
                    </span>
                    <span className={styles.editActions}>
                      <button className={styles.editSaveBtn} type="button" onClick={() => saveStatsEdit(statsFilter.matchId)}>
                        Save
                      </button>
                      <button className={styles.editCancelBtn} type="button" onClick={cancelStatsEdit}>
                        Cancel
                      </button>
                    </span>
                  </div>
                );
              }

              return (
                <div
                  className={cx(styles.tableRow, isSingleMatch && styles.tableRowHasAction)}
                  key={entry.player.id}
                >
                  <span className={styles.playerName}>{entry.player.name}</span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>RS</span>
                    <span className={styles.statValue}>{entry.rs}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>RA</span>
                    <span className={styles.statValue}>{entry.ra}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>SR</span>
                    <span className={styles.statValue}>{entry.sr}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>OB</span>
                    <span className={styles.statValue}>{entry.ob}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>RC</span>
                    <span className={styles.statValue}>{entry.rc}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>Wkts</span>
                    <span className={styles.statValue}>{entry.wkts}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>Econ</span>
                    <span className={styles.statValue}>{entry.econ}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>C</span>
                    <span className={styles.statValue}>{entry.c}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>CA</span>
                    <span className={cx(styles.statValue, styles.statValueHighlight)}>{entry.ca}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>Success%</span>
                    <span className={styles.statValue}>{entry.player.success.rate}%</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>Catches</span>
                    <span className={styles.statValue}>{fielding.catchTaken}/{fielding.catchDropped}</span>
                  </span>
                  <span className={styles.statCell}>
                    <span className={styles.statLabel}>Run Outs</span>
                    <span className={styles.statValue}>{fielding.runOutTaken}/{fielding.runOutMissed}</span>
                  </span>
                  {isSingleMatch && (
                    <span className={styles.colAction}>
                      <button
                        className={styles.editTriggerBtn}
                        type="button"
                        onClick={() => startStatsEdit(statsFilter.matchId, entry.player.id)}
                      >
                        Edit
                      </button>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>{/* .table */}
        </div>{/* .tableScroll */}
      </div>

      {/* ── Contribution trend ───────────────────────────────────── */}
      <div className={shared.panel}>
        <SectionTitle title="Contribution trend" subtitle="Average C score by player" />
        <div className={styles.trendGrid}>
          {playerCards.map((player, index) => {
            const scores = filteredScorecards.filter((sc) => sc.playerId === player.id);
            const average = scores.length
              ? Math.round(scores.reduce((sum, sc) => sum + Number(sc.c || 0), 0) / scores.length)
              : 0;
            const width = Math.round((Math.max(0, average) / maxScore) * 100);
            return (
              <div className={styles.trendCard} key={player.id || index}>
                <strong className={styles.trendName}>{player.name}</strong>
                <progress className={styles.trendProgress} value={width} max={100} />
                <p className={shared.muted}>{average} average C</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
