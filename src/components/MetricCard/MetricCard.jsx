import { cx } from "../../utils/helpers";
import styles from "./MetricCard.module.css";

/**
 * Summary metric tile displayed on the dashboard.
 * @param {{ label: string, value: number|string, accent?: 'mint'|'sand'|'gold'|'coral', className?: string }} props
 */
export function MetricCard({ label, value, accent = "mint", className }) {
  return (
    <article className={cx(styles.card, styles[accent], className)}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
    </article>
  );
}
