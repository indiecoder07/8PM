import { cx } from "../../utils/helpers";
import { Avatar } from "../Avatar";
import styles from "./PlayerRow.module.css";

/**
 * Compact player row used in the "Top fielders" dashboard panel.
 * @param {{ player: object, className?: string }} props
 */
export function PlayerRow({ player, className }) {
  return (
    <div className={cx(styles.row, className)}>
      <div className={styles.head}>
        <Avatar name={player.name} color={player.color} avatar={player.avatar} small />
        <div>
          <strong className={styles.name}>{player.name}</strong>
          <p className={styles.sub}>{player.success.attempts} attempts</p>
        </div>
      </div>
      <div className={styles.score}>
        <strong>{player.success.rate}%</strong>
        <span className={styles.cscore}>C {player.totalContribution}</span>
      </div>
    </div>
  );
}
