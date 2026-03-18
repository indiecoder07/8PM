import { useMemo } from "react";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { cx, exportCsv } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Stats.module.css";

const SCORECARD_FIELDS = ["rs", "sr", "ob", "rc", "wkts", "econ", "c"];

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
        catchTaken: 0,
        catchDropped: 0,
        runOutTaken: 0,
        runOutMissed: 0,
      };
      if (event.type === "catchTaken") entry.catchTaken += 1;
      if (event.type === "catchDropped") entry.catchDropped += 1;
      if (event.type === "runOutTaken") entry.runOutTaken += 1;
      if (event.type === "runOutMissed") entry.runOutMissed += 1;
      map.set(event.playerId, entry);
    }
    return map;
  }, [filteredEvents]);

  function fieldingFor(playerId) {
    return fieldingMap.get(playerId) || {
      catchTaken: 0,
      catchDropped: 0,
      runOutTaken: 0,
      runOutMissed: 0,
    };
  }

  function successFromCounts(values) {
    const catchesTaken = Number(values.catchTaken) || 0;
    const catchesDropped = Number(values.catchDropped) || 0;
    const runOutsTaken = Number(values.runOutTaken) || 0;
    const runOutsMissed = Number(values.runOutMissed) || 0;
    const attempts = catchesTaken + catchesDropped + runOutsTaken + runOutsMissed;
    if (!attempts) return 0;
    return Math.round(((catchesTaken + runOutsTaken) / attempts) * 100);
  }

  function handleExport() {
    exportCsv(
      [
        ["Player", "RS", "SR", "OB", "RC", "Wkts", "Econ", "C", "Success%", "Catch Taken", "Catch Dropped", "Run Out Taken", "Run Out Missed"],
        ...leaderboard.map((entry) => {
          const fielding = fieldingFor(entry.player.id);
          return [
            entry.player.name,
            entry.rs,
            entry.sr,
            entry.ob,
            entry.rc,
            entry.wkts,
            entry.econ,
            entry.c,
            `${entry.player.success.rate}%`,
            fielding.catchTaken,
            fielding.catchDropped,
            fielding.runOutTaken,
            fielding.runOutMissed,
          ];
        }),
      ],
      "8pm-stats.csv",
    );
  }

  const cScores = playerCards.map((player) => {
    const scores = filteredScorecards.filter((scorecard) => scorecard.playerId === player.id);
    return scores.length
      ? scores.reduce((sum, scorecard) => sum + Number(scorecard.c || 0), 0) / scores.length
      : 0;
  });
  const maxScore = Math.max(...cScores, 1);

  return (
    <section className={cx(styles.root, className)}>
      <div className={shared.panel}>
        <SectionTitle title="Filters" subtitle="Slice the performance views" />
        <div className={shared.formGrid}>
          <label>
            Season
            <select
              value={statsFilter.seasonId}
              onChange={(event) => setStatsFilter((current) => ({ ...current, seasonId: event.target.value }))}
            >
              <option value="all">All seasons</option>
              {data.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
            </select>
          </label>
          <label>
            Match
            <select
              value={statsFilter.matchId}
              onChange={(event) => setStatsFilter((current) => ({ ...current, matchId: event.target.value }))}
            >
              <option value="all">All matches</option>
              {enrichedMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.date} vs {match.opponent}
                </option>
              ))}
            </select>
          </label>
          <label>
            Player
            <select
              value={statsFilter.playerId}
              onChange={(event) => setStatsFilter((current) => ({ ...current, playerId: event.target.value }))}
            >
              <option value="all">All players</option>
              {data.players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
          <label>
            Opponent
            <input
              value={statsFilter.opponent}
              onChange={(event) => setStatsFilter((current) => ({ ...current, opponent: event.target.value }))}
              placeholder="Search opponent"
            />
          </label>
          <button className={cx(shared.primaryButton, styles.exportButton)} type="button" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      <div className={shared.panel}>
        <SectionTitle
          title="Leaderboard"
          subtitle={
            isSingleMatch
              ? "Single match selected — edit batting, bowling, catches and run outs"
              : "Fielding and contribution combined"
          }
        />
        <div className={styles.table}>
          <div className={cx(styles.tableRow, styles.tableHead)}>
            <span>Player</span>
            <span className={styles.colNum}>RS</span>
            <span className={styles.colNum}>SR</span>
            <span className={styles.colNum}>OB</span>
            <span className={styles.colNum}>RC</span>
            <span className={styles.colNum}>Wkts</span>
            <span className={styles.colNum}>Econ</span>
            <span className={styles.colNum}>C</span>
            <span className={styles.colFielding}>Success%</span>
            <span className={styles.colFielding}>Catches (T/D)</span>
            <span className={styles.colFielding}>Run Outs (T/M)</span>
            {isSingleMatch && <span className={styles.colAction} />}
          </div>
          {leaderboard.length === 0 ? (
            <p className={shared.muted}>No data matches the current filters.</p>
          ) : (
            leaderboard.map((entry) => {
              const fielding = fieldingFor(entry.player.id);
              const isEditing = statsEditor.playerId === entry.player.id;
              const editedSuccessRate = successFromCounts(statsEditor.values);

              if (isEditing) {
                return (
                  <div className={cx(styles.tableRow, styles.tableRowEditing)} key={entry.player.id}>
                    <span className={styles.editPlayerName}>{entry.player.name}</span>
                    {SCORECARD_FIELDS.map((field) => (
                      <span className={styles.colNum} key={field}>
                        <input
                          type="number"
                          step="any"
                          className={styles.editInput}
                          value={statsEditor.values[field]}
                          onChange={(event) => updateStatsEditField(field, event.target.value)}
                        />
                      </span>
                    ))}
                    <span className={styles.colFielding}>{editedSuccessRate}%</span>
                    <span className={styles.colFielding}>
                      <span className={styles.fieldingInputPair}>
                        <input
                          type="number"
                          min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.catchTaken}
                          onChange={(event) => updateStatsEditField("catchTaken", event.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.catchDropped}
                          onChange={(event) => updateStatsEditField("catchDropped", event.target.value)}
                        />
                      </span>
                    </span>
                    <span className={styles.colFielding}>
                      <span className={styles.fieldingInputPair}>
                        <input
                          type="number"
                          min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.runOutTaken}
                          onChange={(event) => updateStatsEditField("runOutTaken", event.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          className={styles.fieldingInput}
                          value={statsEditor.values.runOutMissed}
                          onChange={(event) => updateStatsEditField("runOutMissed", event.target.value)}
                        />
                      </span>
                    </span>
                    <span className={styles.colAction}>
                      <button
                        className={styles.editSaveBtn}
                        type="button"
                        onClick={() => saveStatsEdit(statsFilter.matchId)}
                      >
                        Save
                      </button>
                      <button
                        className={styles.editCancelBtn}
                        type="button"
                        onClick={cancelStatsEdit}
                      >
                        Cancel
                      </button>
                    </span>
                  </div>
                );
              }

              return (
                <div className={styles.tableRow} key={entry.player.id}>
                  <span>{entry.player.name}</span>
                  <span className={styles.colNum}>{entry.rs}</span>
                  <span className={styles.colNum}>{entry.sr}</span>
                  <span className={styles.colNum}>{entry.ob}</span>
                  <span className={styles.colNum}>{entry.rc}</span>
                  <span className={styles.colNum}>{entry.wkts}</span>
                  <span className={styles.colNum}>{entry.econ}</span>
                  <span className={styles.colNum}>{entry.c}</span>
                  <span className={styles.colFielding}>{entry.player.success.rate}%</span>
                  <span className={styles.colFielding}>
                    {fielding.catchTaken}/{fielding.catchDropped}
                  </span>
                  <span className={styles.colFielding}>
                    {fielding.runOutTaken}/{fielding.runOutMissed}
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
        </div>
      </div>

      <div className={shared.panel}>
        <SectionTitle title="Contribution trend" subtitle="Average C score by player" />
        <div className={styles.trendGrid}>
          {playerCards.map((player, index) => {
            const scores = filteredScorecards.filter((scorecard) => scorecard.playerId === player.id);
            const average = scores.length
              ? Math.round(scores.reduce((sum, scorecard) => sum + Number(scorecard.c || 0), 0) / scores.length)
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
