import { cx } from "../../utils/helpers";
import styles from "./Badge.module.css";

/**
 * Small pill badge, optionally coloured for success / failure.
 * @param {{ children: React.ReactNode, variant?: 'default'|'good'|'bad', className?: string }} props
 */
export function Badge({ children, variant = "default", className }) {
  return (
    <span className={cx(styles.badge, styles[variant], className)}>
      {children}
    </span>
  );
}
