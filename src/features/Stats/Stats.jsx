import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { cx, exportCsv } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Stats.module.css";

export function Stats({ className }) {
  const {
    data,
    enrichedMatches,
    playerCards,
    filteredScorecards,
    leaderboard,
    statsFilter,
    setStatsFilter,
  } = useFieldIQ();

  function handleExport() {
    exportCsv(
      [
        ["Player", "Runs", "Wickets", "Contribution", "Success rate"],
        ...leaderboard.map((entry) => [
          entry.player.name,
          entry.runs,
          entry.wickets,
          entry.contribution,
          `${entry.player.success.rate}%`,
        ]),
      ],
      "8pm-stats.csv",
    );
  }

  // Normalise bar widths relative to the data range
  const cScores = playerCards.map((pc) => {
    const scores = filteredScorecards.filter((sc) => sc.playerId === pc.id);
    return scores.length
      ? scores.reduce((sum, sc) => sum + Number(sc.c || 0), 0) / scores.length
      : 0;
  });
  const maxScore = Math.max(...cScores, 1);

  return (
    <section className={cx(styles.root, className)}>
      {/* Filters */}
      <div className={shared.panel}>
        <SectionTitle title="Filters" subtitle="Slice the performance views" />
        <div className={shared.formGrid}>
          <label>
            Season
            <select
              value={statsFilter.seasonId}
              onChange={(e) => setStatsFilter((prev) => ({ ...prev, seasonId: e.target.value }))}
            >
              <option value="all">All seasons</option>
              {data.seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            Match
            <select
              value={statsFilter.matchId}
              onChange={(e) => setStatsFilter((prev) => ({ ...prev, matchId: e.target.value }))}
            >
              <option value="all">All matches</option>
              {enrichedMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.date} vs {m.opponent}
                </option>
              ))}
            </select>
          </label>
          <label>
            Player
            <select
              value={statsFilter.playerId}
              onChange={(e) => setStatsFilter((prev) => ({ ...prev, playerId: e.target.value }))}
            >
              <option value="all">All players</option>
              {data.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            Opponent
            <input
              value={statsFilter.opponent}
              onChange={(e) => setStatsFilter((prev) => ({ ...prev, opponent: e.target.value }))}
              placeholder="Search opponent"
            />
          </label>
          <button className={shared.primaryButton} type="button" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className={shared.panel}>
        <SectionTitle title="Leaderboard" subtitle="Fielding and contribution combined" />
        <div className={styles.table}>
          <div className={cx(styles.tableRow, styles.tableHead)}>
            <span>Player</span>
            <span>Success</span>
            <span>Runs</span>
            <span>Wkts</span>
            <span>C score</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className={shared.muted}>No data matches the current filters.</p>
          ) : (
            leaderboard.map((entry) => (
              <div className={styles.tableRow} key={entry.player.id}>
                <span>{entry.player.name}</span>
                <span>{entry.player.success.rate}%</span>
                <span>{entry.runs}</span>
                <span>{entry.wickets}</span>
                <span>{entry.contribution}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contribution trend */}
      <div className={shared.panel}>
        <SectionTitle title="Contribution trend" subtitle="Average C score by player" />
        <div className={styles.trendGrid}>
          {playerCards.map((player, i) => {
            const scores  = filteredScorecards.filter((sc) => sc.playerId === player.id);
            const average = scores.length
              ? Math.round(scores.reduce((sum, sc) => sum + Number(sc.c || 0), 0) / scores.length)
              : 0;
            const width = Math.round((Math.max(0, average) / maxScore) * 100);

            return (
              <div className={styles.trendCard} key={player.id}>
                <strong className={styles.trendName}>{player.name}</strong>
                <div className={styles.trendBar}>
                  <span
                    className={styles.trendFill}
                    style={{ "--bar-width": `${width}%` }}
                  />
                </div>
                <p className={shared.muted}>{average} average C</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
