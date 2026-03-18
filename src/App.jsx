import { useFieldIQ } from "./context/FieldIQContext";
import { useState } from "react";
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
  const { view, setView, theme, toggleTheme, currentSeason, data, loading } = useFieldIQ();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleNavSelect = (option) => {
    setView(option);
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} aria-hidden="true" />
        <p className={shared.muted}>Loading from Neon…</p>
      </div>
    );
  }

  const ActiveView = FEATURE_MAP[view] || Dashboard;

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={cx(styles.mobileMenu, menuOpen && styles.mobileMenuOpen)}>
          <div className={styles.mobileSummary}>
            <div className={styles.brand}>
              <div className={styles.brandMark} aria-hidden="true">8P</div>
              <div className={styles.brandText}>
                <p className={cx(shared.eyebrow, styles.brandEyebrow)}>Indoor Cricket Ops</p>
                <h1 className={styles.brandName}>8PM</h1>
              </div>
            </div>
            <button
              className={styles.menuToggle}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <div className={styles.sidebarBody}>
            <nav className={styles.nav} aria-label="Main navigation">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={cx(styles.navLink, view === option && styles.navLinkActive)}
                  onClick={() => handleNavSelect(option)}
                  type="button"
                  aria-current={view === option ? "page" : undefined}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </nav>

            <div className={styles.sidePanel}>
              <p className={shared.eyebrow}>Workspace</p>
              <button className={shared.ghostButton} type="button" onClick={toggleTheme}>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.heroLead}>
            <h2 className={styles.heroTitle}>Overview</h2>
            <p className={shared.muted}>{currentSeason?.name || "No active season"}</p>
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
