import { useMemo } from "react";
import { Badge } from "../../components/Badge";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { EVENT_META, RESULT_OPTIONS } from "../../data/seed";
import { cx, formatDate, timeAgo } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Matches.module.css";

const RECENT_FEED_COUNT = 4;

export function Matches({ className }) {
  const {
    data,
    seasonForm,
    matchForm,
    opponentForm,
    showMatchPicker,
    setShowMatchPicker,
    flashEvent,
    eventDraft,
    setEventDraft,
    uploadMessage,
    extracting,
    extractionPreview,
    enrichedMatches,
    updateSeasonFormField,
    submitSeasonForm,
    updateMatchFormField,
    submitMatchForm,
    updateOpponentFormField,
    submitOpponentForm,
    deleteOpponent,
    logEventWithFlash,
    handleUpload,
    updateExtractionMatchField,
    updateExtractionScorecardField,
    confirmExtraction,
    discardExtraction,
  } = useFieldIQ();

  const playerNameMap = useMemo(
    () => new Map(data.players.map((player) => [player.id, player.name])),
    [data.players],
  );

  const isUploadError = uploadMessage.toLowerCase().startsWith("extraction failed");
  const activeMatch = enrichedMatches.find((match) => match.id === eventDraft.matchId);
  const activePlayers = data.players.filter((player) => player.active);

  const recentEvents = activeMatch
    ? [...activeMatch.events]
        .sort((left, right) => (left.timestamp < right.timestamp ? 1 : -1))
        .slice(0, RECENT_FEED_COUNT)
        .map((event) => ({
          ...event,
          meta: EVENT_META[event.type],
          player: data.players.find((player) => player.id === event.playerId),
        }))
    : [];

  function handleSeasonSubmit(event) {
    event.preventDefault();
    submitSeasonForm();
  }

  function handleMatchSubmit(event) {
    event.preventDefault();
    submitMatchForm();
  }

  function handleOpponentSubmit(event) {
    event.preventDefault();
    submitOpponentForm();
  }

  return (
    <section className={cx(styles.root, className)}>
      <div className={shared.stack}>
        <div className={shared.panel}>
          <SectionTitle title="Create season" subtitle="Organise the calendar first" />
          <form className={shared.formGrid} onSubmit={handleSeasonSubmit}>
            <label>
              Season name
              <input
                value={seasonForm.name}
                onChange={(event) => updateSeasonFormField("name", event.target.value)}
                placeholder="2025 Season 2"
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                value={seasonForm.startDate}
                onChange={(event) => updateSeasonFormField("startDate", event.target.value)}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={seasonForm.endDate}
                onChange={(event) => updateSeasonFormField("endDate", event.target.value)}
              />
            </label>
            <button className={shared.primaryButton} type="submit">
              Save season
            </button>
          </form>
        </div>

        <div className={shared.panel}>
          <SectionTitle title="Opponent teams" subtitle="Master list — select when logging a match" />
          <form className={styles.opponentForm} onSubmit={handleOpponentSubmit}>
            <input
              value={opponentForm.name}
              onChange={(event) => updateOpponentFormField(event.target.value)}
              placeholder="Team name e.g. The Falcons"
            />
            <button className={shared.primaryButton} type="submit">
              Add team
            </button>
          </form>
          {data.opponents.length === 0 ? (
            <p className={shared.muted}>No opponent teams yet. Add your first one above.</p>
          ) : (
            <ul className={styles.opponentList}>
              {data.opponents.map((opponent) => (
                <li key={opponent.id} className={styles.opponentItem}>
                  <span>{opponent.name}</span>
                  <button
                    className={cx(shared.ghostButton, styles.opponentDelete)}
                    type="button"
                    aria-label={`Remove ${opponent.name}`}
                    onClick={() => deleteOpponent(opponent.id)}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={shared.panel}>
          <SectionTitle title="Add match" subtitle="Capture the result and scoreboard context" />
          <form className={shared.formGrid} onSubmit={handleMatchSubmit}>
            <label>
              Season
              <select
                value={matchForm.seasonId}
                onChange={(event) => updateMatchFormField("seasonId", event.target.value)}
              >
                {data.seasons.map((season) => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </label>
            <label>
              Match date
              <input
                type="date"
                value={matchForm.date}
                onChange={(event) => updateMatchFormField("date", event.target.value)}
              />
            </label>
            <label>
              Opponent
              {data.opponents.length > 0 ? (
                <select
                  value={matchForm.opponent}
                  onChange={(event) => updateMatchFormField("opponent", event.target.value)}
                >
                  <option value="">Select opponent...</option>
                  {data.opponents.map((opponent) => (
                    <option key={opponent.id} value={opponent.name}>{opponent.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={matchForm.opponent}
                  onChange={(event) => updateMatchFormField("opponent", event.target.value)}
                  placeholder="Add teams above first"
                />
              )}
            </label>
            <label>
              Result
              <select
                value={matchForm.result}
                onChange={(event) => updateMatchFormField("result", event.target.value)}
              >
                {RESULT_OPTIONS.map((result) => <option key={result} value={result}>{result}</option>)}
              </select>
            </label>
            <label>
              Our score
              <input
                type="number"
                value={matchForm.ourScore}
                onChange={(event) => updateMatchFormField("ourScore", event.target.value)}
              />
            </label>
            <label>
              Opponent score
              <input
                type="number"
                value={matchForm.opponentScore}
                onChange={(event) => updateMatchFormField("opponentScore", event.target.value)}
              />
            </label>
            <button className={shared.primaryButton} type="submit">
              Save match
            </button>
          </form>
        </div>

        <div className={cx(shared.panel, styles.loggerPanel)}>
          <SectionTitle title="Live event logger" subtitle="Tap player → tap event" />

          <div className={styles.loggerMatchBar}>
            {activeMatch ? (
              <button
                type="button"
                className={styles.loggerMatchChip}
                onClick={() => setShowMatchPicker((visible) => !visible)}
              >
                <span className={styles.loggerMatchLabel}>
                  {formatDate(activeMatch.date)} vs {activeMatch.opponent}
                </span>
                <span className={styles.loggerMatchToggle}>
                  {showMatchPicker ? "Done" : "Change"}
                </span>
              </button>
            ) : (
              <p className={shared.muted}>No matches yet — create one first.</p>
            )}
          </div>

          {showMatchPicker && (
            <select
              className={styles.loggerMatchSelect}
              value={eventDraft.matchId}
              onChange={(event) => {
                setEventDraft((current) => ({ ...current, matchId: event.target.value }));
                setShowMatchPicker(false);
              }}
            >
              {enrichedMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {formatDate(match.date)} vs {match.opponent}
                </option>
              ))}
            </select>
          )}

          {activePlayers.length === 0 ? (
            <p className={shared.muted}>No active players — add players first.</p>
          ) : (
            <div className={styles.playerChips}>
              {activePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={cx(
                    styles.playerChip,
                    eventDraft.playerId === player.id && styles.playerChipActive,
                  )}
                  onClick={() => setEventDraft((current) => ({ ...current, playerId: player.id }))}
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}

          <div className={styles.eventButtons}>
            {Object.entries(EVENT_META).map(([key, meta]) => (
              <button
                key={key}
                className={cx(
                  styles.eventBtn,
                  meta.success ? styles.eventBtnGood : styles.eventBtnBad,
                  flashEvent === key && styles.eventBtnFlash,
                )}
                type="button"
                disabled={!eventDraft.matchId || !eventDraft.playerId}
                onClick={() => logEventWithFlash(key)}
              >
                <span className={styles.eventBtnIcon}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            ))}
          </div>

          {recentEvents.length > 0 && (
            <div className={styles.recentFeed}>
              <p className={styles.recentFeedTitle}>Recent</p>
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className={cx(
                    styles.recentFeedItem,
                    event.meta?.success ? styles.recentFeedGood : styles.recentFeedBad,
                  )}
                >
                  <span className={styles.recentFeedLabel}>{event.meta?.label}</span>
                  <span className={shared.muted}>{event.player?.name || "Unknown"}</span>
                  <span className={cx(shared.muted, styles.recentFeedTime)}>
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={shared.panel}>
          <SectionTitle title="Scoresheet upload" subtitle="Upload a scoresheet to auto-create a match and extract stats" />
          <label className={cx(shared.uploadCard, extracting && styles.uploading)}>
            <input
              type="file"
              accept="image/*"
              disabled={extracting}
              onChange={(event) => {
                handleUpload(event.target.files?.[0], matchForm.seasonId);
                event.target.value = "";
              }}
            />
            {extracting ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <span>Extracting stats with AI...</span>
              </>
            ) : (
              <>
                <span>Upload scoresheet image</span>
                <small className={shared.muted}>
                  Creates a match (opponent, scores, result) and extracts player stats automatically.
                  Uses the season selected above.
                </small>
              </>
            )}
          </label>
          {uploadMessage && (
            <p className={isUploadError ? shared.noticeError : shared.notice}>{uploadMessage}</p>
          )}
        </div>

        {extractionPreview && (
          <div className={shared.panel}>
            <SectionTitle
              title="Review extraction"
              subtitle="Edit any incorrect values before saving"
            />
            <div className={styles.previewMatchGrid}>
              <label>
                Opponent
                <input
                  value={extractionPreview.match.opponent}
                  onChange={(event) => updateExtractionMatchField("opponent", event.target.value)}
                />
              </label>
              <label>
                Our score
                <input
                  type="number"
                  value={extractionPreview.match.ourScore}
                  onChange={(event) =>
                    updateExtractionMatchField("ourScore", Number(event.target.value) || 0)
                  }
                />
              </label>
              <label>
                Opponent score
                <input
                  type="number"
                  value={extractionPreview.match.opponentScore}
                  onChange={(event) =>
                    updateExtractionMatchField("opponentScore", Number(event.target.value) || 0)
                  }
                />
              </label>
              <label>
                Result
                <select
                  value={extractionPreview.match.result}
                  onChange={(event) => updateExtractionMatchField("result", event.target.value)}
                >
                  {RESULT_OPTIONS.map((result) => (
                    <option key={result} value={result}>{result}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={extractionPreview.match.date}
                  onChange={(event) => updateExtractionMatchField("date", event.target.value)}
                />
              </label>
            </div>

            {extractionPreview.scorecards.length > 0 && (
              <div className={styles.previewTable}>
                <div className={cx(styles.previewRow, styles.previewHead)}>
                  <span>Player</span>
                  <span>RS</span>
                  <span>SR</span>
                  <span>OB</span>
                  <span>RC</span>
                  <span>Wkts</span>
                  <span>Econ</span>
                  <span>C</span>
                </div>
                {extractionPreview.scorecards.map((scorecard, index) => (
                  <div className={styles.previewRow} key={scorecard.playerId}>
                    <span className={styles.previewPlayerName}>
                      {playerNameMap.get(scorecard.playerId) || scorecard.playerId}
                    </span>
                    {["rs", "sr", "ob", "rc", "wkts", "econ", "c"].map((field) => (
                      <input
                        key={field}
                        type="number"
                        step="any"
                        className={styles.previewInput}
                        value={scorecard[field]}
                        onChange={(event) =>
                          updateExtractionScorecardField(index, field, event.target.value)
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.previewActions}>
              <button
                className={shared.primaryButton}
                type="button"
                onClick={confirmExtraction}
              >
                Confirm & Save
              </button>
              <button
                className={shared.ghostButton}
                type="button"
                onClick={discardExtraction}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

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
                      .sort((left, right) => (left.timestamp > right.timestamp ? 1 : -1))
                      .map((event) => {
                        const player = data.players.find((entry) => entry.id === event.playerId);
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
