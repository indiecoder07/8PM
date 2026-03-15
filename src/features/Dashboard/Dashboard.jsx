import { Badge } from "../../components/Badge";
import { MetricCard } from "../../components/MetricCard";
import { PlayerRow } from "../../components/PlayerRow";
import { SectionTitle } from "../../components/SectionTitle";
import { useFieldIQ } from "../../context/FieldIQContext";
import { cx, formatTimestamp } from "../../utils/helpers";
import shared from "../../styles/shared.module.css";
import styles from "./Dashboard.module.css";

export function Dashboard({ className }) {
  const { dashboard, topFielders } = useFieldIQ();

  return (
    <div className={cx(styles.root, className)}>
      {/* Metric cards */}
      <section className={styles.cardGrid}>
        <MetricCard label="Active players"  value={dashboard.activePlayers}  accent="mint"  />
        <MetricCard label="Matches played"  value={dashboard.matchesPlayed}  accent="sand"  />
        <MetricCard label="Wins"            value={dashboard.wins}           accent="gold"  />
        <MetricCard label="Events logged"   value={dashboard.totalEvents}    accent="coral" />
      </section>

      {/* Dashboard grid */}
      <section className={styles.grid}>
        {/* Top fielders */}
        <div className={shared.panel}>
          <SectionTitle title="Top fielders" subtitle="Sorted by success rate" />
          <div className={shared.stack}>
            {topFielders.length === 0 ? (
              <p className={shared.muted}>No fielding events logged yet.</p>
            ) : (
              topFielders.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))
            )}
          </div>
        </div>

        {/* Recent events */}
        <div className={shared.panel}>
          <SectionTitle title="Recent events" subtitle="Latest match actions" />
          {dashboard.recentEvents.length === 0 ? (
            <p className={shared.muted}>No events logged yet.</p>
          ) : (
            <div className={styles.timeline}>
              {dashboard.recentEvents.map((event) => (
                <div className={styles.timelineItem} key={event.id}>
                  <Badge variant={event.meta?.success ? "good" : "bad"}>
                    {event.meta?.icon}
                  </Badge>
                  <div className={styles.timelineBody}>
                    <strong>{event.meta?.label}</strong>
                    <p className={shared.muted}>
                      {event.player?.name || "Unknown"} vs {event.match?.opponent || "Unknown"}{" "}
                      • {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
