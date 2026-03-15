import { useEffect, useState } from "react";
import { Badge } from "../../components/Badge";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { EVENT_META, RESULT_OPTIONS } from "../../data/seed";
import { cx, formatDate } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Matches.module.css";

const DEFAULT_SEASON_FORM = { name: "", startDate: "", endDate: "" };
const DEFAULT_MATCH_FORM  = { seasonId: "", date: "", opponent: "", result: "W", ourScore: "", opponentScore: "" };

export function Matches({ className }) {
  const {
    data,
    enrichedMatches,
    eventDraft,
    setEventDraft,
    uploadMessage,
    extracting,
    addSeason,
    addMatch,
    logEvent,
    handleUpload,
  } = useFieldIQ();

  const [seasonForm, setSeasonForm] = useState(DEFAULT_SEASON_FORM);
  const [matchForm,  setMatchForm]  = useState(DEFAULT_MATCH_FORM);

  // Pre-fill seasonId when seasons become available
  useEffect(() => {
    if (!matchForm.seasonId && data.seasons[0]) {
      setMatchForm((prev) => ({ ...prev, seasonId: data.seasons[0].id }));
    }
  }, [data.seasons, matchForm.seasonId]);

  function handleSeasonSubmit(e) {
    e.preventDefault();
    const ok = addSeason(seasonForm);
    if (ok) setSeasonForm(DEFAULT_SEASON_FORM);
  }

  function handleMatchSubmit(e) {
    e.preventDefault();
    const matchId = addMatch(matchForm);
    if (matchId) setMatchForm((prev) => ({ ...prev, date: "", opponent: "", ourScore: "", opponentScore: "" }));
  }

  return (
    <section className={cx(styles.root, className)}>
      {/* Left column — forms */}
      <div className={shared.stack}>
        {/* Season form */}
        <div className={shared.panel}>
          <SectionTitle title="Create season" subtitle="Organise the calendar first" />
          <form className={shared.formGrid} onSubmit={handleSeasonSubmit}>
            <label>
              Season name
              <input
                value={seasonForm.name}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="2025 Season 2"
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                value={seasonForm.startDate}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={seasonForm.endDate}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </label>
            <button className={shared.primaryButton} type="submit">
              Save season
            </button>
          </form>
        </div>

        {/* Match form */}
        <div className={shared.panel}>
          <SectionTitle title="Add match" subtitle="Capture the result and scoreboard context" />
          <form className={shared.formGrid} onSubmit={handleMatchSubmit}>
            <label>
              Season
              <select
                value={matchForm.seasonId}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, seasonId: e.target.value }))}
              >
                {data.seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              Match date
              <input
                type="date"
                value={matchForm.date}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </label>
            <label>
              Opponent
              <input
                value={matchForm.opponent}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, opponent: e.target.value }))}
                placeholder="Falcons"
              />
            </label>
            <label>
              Result
              <select
                value={matchForm.result}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, result: e.target.value }))}
              >
                {RESULT_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>
              Our score
              <input
                type="number"
                value={matchForm.ourScore}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, ourScore: e.target.value }))}
              />
            </label>
            <label>
              Opponent score
              <input
                type="number"
                value={matchForm.opponentScore}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, opponentScore: e.target.value }))}
              />
            </label>
            <button className={shared.primaryButton} type="submit">
              Save match
            </button>
          </form>
        </div>

        {/* Live event logger */}
        <div className={shared.panel}>
          <SectionTitle title="Live event logger" subtitle="Use during the match" />
          <div className={shared.formGrid}>
            <label>
              Match
              <select
                value={eventDraft.matchId}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, matchId: e.target.value }))}
              >
                {enrichedMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDate(m.date)} vs {m.opponent}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Player
              <select
                value={eventDraft.playerId}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, playerId: e.target.value }))}
              >
                {data.players.filter((p) => p.active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.eventButtons}>
            {Object.entries(EVENT_META).map(([key, meta]) => (
              <button
                key={key}
                className={meta.success ? shared.successButton : shared.dangerButton}
                type="button"
                onClick={() => logEvent(key)}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scoresheet upload */}
        <div className={shared.panel}>
          <SectionTitle title="Scoresheet upload" subtitle="Upload a photo and AI extracts the stats" />
          <label className={cx(shared.uploadCard, extracting && styles.uploading)}>
            <input
              type="file"
              accept="image/*"
              disabled={extracting}
              onChange={(e) => {
                handleUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {extracting ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <span>Extracting stats with AI&hellip;</span>
              </>
            ) : (
              <>
                <span>Upload scoresheet image</span>
                <small className={shared.muted}>Takes a photo of the scoresheet and extracts batting &amp; bowling stats.</small>
              </>
            )}
          </label>
          {uploadMessage && <p className={shared.notice}>{uploadMessage}</p>}
        </div>
      </div>

      {/* Right column — match ledger */}
      <div className={shared.panel}>
        <SectionTitle title="Match ledger" subtitle="Timeline, results, and extracted stats" />
        {enrichedMatches.length === 0 ? (
          <p className={shared.muted}>No matches yet. Add your first match above.</p>
        ) : (
          <div className={shared.stack}>
            {enrichedMatches.map((match) => (
              <div className={styles.matchCard} key={match.id}>
                <div className={styles.matchHeader}>
                  <div>
                    <p className={styles.matchSeason}>{match.season?.name}</p>
                    <h3 className={styles.matchTitle}>
                      {formatDate(match.date)} vs {match.opponent}
                    </h3>
                  </div>
                  <Badge variant={match.result === "W" ? "good" : match.result === "L" ? "bad" : "default"}>
                    {match.result}
                  </Badge>
                </div>

                <p className={styles.matchMeta}>
                  {match.ourScore} / {match.opponentScore} •{" "}
                  {match.events.length} fielding events •{" "}
                  {match.scorecards.length} score entries
                </p>

                <div className={styles.miniTimeline}>
                  {match.events.length === 0 ? (
                    <p className={shared.muted}>No events logged yet.</p>
                  ) : (
                    [...match.events]
                      .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
                      .map((event) => {
                        const player = data.players.find((p) => p.id === event.playerId);
                        return (
                          <div className={styles.miniTimelineItem} key={event.id}>
                            <span>{EVENT_META[event.type]?.label}</span>
                            <span className={shared.muted}>{player?.name || "Unknown"}</span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
