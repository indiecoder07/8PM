import { Component } from "react";
import styles from "./ErrorBoundary.module.css";

/**
 * Top-level error boundary. Catches render errors and shows a friendly fallback.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div className={styles.container}>
          <p className={styles.eyebrow}>Runtime Error</p>
          <h1 className={styles.heading}>8PM failed to render.</h1>
          <pre className={styles.stack}>
            {String(error?.stack || error?.message || error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
