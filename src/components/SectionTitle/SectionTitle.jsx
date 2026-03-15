import { cx } from "../../utils/helpers";
import styles from "./SectionTitle.module.css";

/**
 * Panel heading with an optional subtitle.
 * @param {{ title: string, subtitle?: string, className?: string }} props
 */
export function SectionTitle({ title, subtitle, className }) {
  return (
    <div className={cx(styles.root, className)}>
      <h3 className={styles.title}>{title}</h3>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
