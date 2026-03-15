import { useFieldIQ } from "./context/FieldIQContext";
import { Dashboard } from "./features/Dashboard";
import { Matches } from "./features/Matches";
import { Players } from "./features/Players";
import { Stats } from "./features/Stats";
import { VIEW_OPTIONS } from "./data/seed";
import { cx } from "./utils/helpers";
import shared from "./styles/shared.module.css";
import styles from "./App.module.css";

const FEATURE_MAP = {
  dashboard: Dashboard,
  players:   Players,
  matches:   Matches,
  stats:     Stats,
};

export function App() {
  const { view, setView, theme, toggleTheme, currentSeason, data, resetDemo } = useFieldIQ();

  const ActiveView = FEATURE_MAP[view] || Dashboard;

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">8P</div>
          <div>
            <p className={cx(shared.eyebrow, styles.brandEyebrow)}>Indoor Cricket Ops</p>
            <h1 className={styles.brandName}>8PM</h1>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option}
              className={cx(styles.navLink, view === option && styles.navLinkActive)}
              onClick={() => setView(option)}
              type="button"
              aria-current={view === option ? "page" : undefined}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </nav>

        <div className={styles.sidePanel}>
          <p className={shared.eyebrow}>Workspace</p>
          <p className={shared.muted}>Local-first MVP with browser persistence.</p>
          <button className={shared.ghostButton} type="button" onClick={toggleTheme}>
            Toggle {theme === "dark" ? "light" : "dark"} mode
          </button>
          <button className={shared.ghostButton} type="button" onClick={resetDemo}>
            Reset demo data
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.content}>
        <header className={styles.hero}>
          <div>
            <p className={shared.eyebrow}>Admin Command Centre</p>
            <h2 className={styles.heroHeading}>
              Track fielding in real time. Review contribution after the match.
            </h2>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.heroStat}>
              <span className={shared.muted}>Season</span>
              <strong>{currentSeason?.name || "None yet"}</strong>
            </div>
            <div className={styles.heroStat}>
              <span className={shared.muted}>Matches</span>
              <strong>{data.matches.length}</strong>
            </div>
            <div className={styles.heroStat}>
              <span className={shared.muted}>Events</span>
              <strong>{data.events.length}</strong>
            </div>
          </div>
        </header>

        <ActiveView className={styles.view} />
      </main>
    </div>
  );
}
