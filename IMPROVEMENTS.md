# FieldIQ — Improvement Recommendations

A comprehensive review covering UI/UX design, code quality, and feature gaps against the PRD.

---

## 1. UI/UX & Design

### Accessibility
- **No focus styles:** Keyboard users can't see where they are. Add visible `:focus-visible` outlines on all interactive elements (buttons, inputs, links).
- **No ARIA labels:** The nav buttons just show raw text like "dashboard" — add `aria-label` or `aria-current="page"` for screen readers. The event logger buttons especially need descriptive labels.
- **Color contrast:** The `--muted` text (#b8c7bc on dark bg) may not meet WCAG AA contrast ratios. Verify and bump if needed.
- **Form labels:** Color picker says "Profile color" but gives no context. Upload card's hidden `<input>` has no accessible label.
- **Delete confirmation:** Deleting a player is instant and irreversible — add a confirmation dialog.

### Layout & Responsiveness
- **Sidebar nav text is lowercase and generic:** "dashboard", "players", "matches", "stats" — capitalize them and consider adding icons for visual scanning.
- **Hero section `max-width: 14ch`** on the heading is very narrow and may cause awkward line breaks on mid-sized screens.
- **Mobile sidebar:** On small screens the sidebar stacks above content, pushing the actual app way down. Consider a hamburger menu or bottom tab bar for mobile.
- **Form grid on mobile:** Already collapses to 1 column, which is good. But the event logger buttons could use more vertical spacing on small screens.

### Visual Polish
- **No loading states:** Everything renders instantly from localStorage, but if Supabase is added later, you'll need skeleton loaders.
- **No empty states:** When there are zero players, matches, or events, the panels just show... nothing. Add friendly empty-state messages with CTAs.
- **No success/error feedback:** After adding a player, season, or match there's zero visual confirmation. Add a brief toast or flash message.
- **Upload card clickability:** The upload area doesn't look obviously clickable — add a dashed border, hover effect, or upload icon.
- **Trend bar scaling:** `Math.max(8, Math.min(100, average + 50))` means a C score of 0 shows as 50% filled. This is misleading — normalize the bars relative to the actual data range.

---

## 2. Code Quality & Architecture

### Component Architecture
- **Monolithic App.jsx (1125 lines):** Everything lives in one file — state, business logic, all views, sub-components. Split into:
  - `components/Dashboard.jsx`, `components/Players.jsx`, `components/Matches.jsx`, `components/Stats.jsx`
  - `hooks/useFieldIQ.js` for state management logic
  - `utils/helpers.js` for `uid()`, `formatDate()`, `exportCsv()`, etc.
  - `data/seed.js` for `createSeedState()`
- **Inline sub-components:** `MetricCard`, `SectionTitle`, and `PlayerRow` are defined at the bottom of App.jsx. Move them to their own files.

### State Management
- **Direct localStorage in component:** `readState()` + `useEffect` for persistence works but won't scale. Consider a custom hook like `usePersistedState()` or a lightweight state manager.
- **No undo/redo:** Deleting a player nukes all their events and scorecards with no way back. At minimum, soft-delete by toggling `active` rather than removing data.
- **Stale closure risk in `useEffect`:** The effect that auto-sets `matchForm.seasonId` and `eventDraft` has a complex dependency array. This could cause subtle bugs when state updates don't propagate as expected.

### Performance
- **`useMemo` depends on entire `state`:** `enrichedMatches` recalculates on *any* state change because it takes `[state]` as its dependency. Narrow it to `[state.matches, state.seasons, state.events, state.scorecards]`.
- **`.find()` inside `.map()` loops:** `leaderboard`, `enrichedMatches`, and dashboard event rendering all do O(n*m) lookups. Pre-build a `Map<id, player>` and `Map<id, match>` for O(1) access.
- **Re-renders on every keystroke:** Every form input calls `setState` which re-renders the entire App. With component splitting plus `React.memo`, this would be much more efficient.

### Data Integrity
- **`uid()` uses `Math.random()`:** Has collision risk, especially over many sessions. Consider `crypto.randomUUID()` (supported in all modern browsers).
- **No data versioning:** `STORAGE_KEY = "fieldiq-state-v1"` is great, but there's no migration path if the schema changes in v2. Add a `version` field inside the stored state.
- **`normalizeState` is defensive but lossy:** If a player ID doesn't match, events get silently reassigned to the first player. Logging a warning or dropping orphaned records would be safer.

### Error Handling
- **Error boundary exists** (good!), but there's no error handling for `JSON.parse`, `localStorage.setItem` (quota exceeded), or date formatting with invalid strings.
- **`exportCsv` doesn't revoke the blob URL** in all code paths (it does call `revokeObjectURL`, but the timing is immediate — the browser may not have finished the download).

### Code Style
- **Consistent and clean overall** — good use of modern JS, no unnecessary comments, functional approach. The codebase reads well.
- **Missing PropTypes or TypeScript:** No type safety on component props. At minimum add PropTypes, or ideally migrate to TypeScript for a project of this complexity.

---

## 3. Features & Functionality vs. PRD

### Implemented
- Player management (add, delete, toggle active) ✅
- Season & match management ✅
- Live fielding event logger (4 event types) ✅
- Scoresheet upload (simulated extraction) ✅
- Stats with filters and CSV export ✅
- Dashboard with metrics, top fielders, recent events ✅
- Dark/light mode toggle ✅
- Responsive layout ✅

### Missing from PRD

| PRD Feature | Status | Notes |
|---|---|---|
| **Player avatar/photo upload** | ❌ Missing | `avatar` field exists in data but no UI to upload. Only initials shown. |
| **Player profile page** with career stats | ❌ Missing | PRD says "Player profile page with career stats summary" — currently just a card in the list. |
| **Match timeline view** showing all events chronologically | ⚠️ Partial | Mini-timeline in match cards, but no dedicated full-screen timeline view. |
| **Claude Vision API** for real extraction | ❌ Simulated | `buildMockScorecards()` generates fake data. The PRD's core value prop — auto-extracting stats from scoresheet images — isn't wired up. |
| **Success rate trend over time** | ❌ Missing | PRD specifies "player improvement across matches over time." Current trend view just shows average C score, not a temporal trend. |
| **Date range filter** | ❌ Missing | PRD lists date range as a filter option. Only season/match/player/opponent filters exist. |
| **PDF export** | ❌ Missing | PRD says "Export to PDF or CSV." Only CSV is implemented. |
| **Season at-a-glance** (matches, wins, losses per season) | ⚠️ Partial | Dashboard shows global stats, not per-season breakdown. |

### Bugs & Issues
- **Event logger shows inactive players:** The player dropdown in the live event logger includes all players, not just active ones. An inactive player shouldn't be loggable.
- **No match deletion:** You can delete players but not matches or seasons. Missing CRUD completeness.
- **Scoresheet upload replaces all scores for a match** without warning. If you upload twice, the first extraction is silently overwritten.
- **CSV export ignores filters partially:** The leaderboard respects filters, but the export button uses `leaderboard` which is the filtered view — this is actually correct, but there's no indication to the user about what they're exporting.

---

## 4. Priority Recommendations

### Quick Wins (Low effort, high impact)
1. Add empty states for all lists ("No players yet. Add your first player above.")
2. Add confirmation dialogs for destructive actions (delete player)
3. Filter inactive players from the event logger dropdown
4. Capitalize nav labels and add icons
5. Add `:focus-visible` styles for keyboard accessibility
6. Replace `Math.random()` IDs with `crypto.randomUUID()`

### Medium Effort
7. Split App.jsx into separate view components and a custom state hook
8. Add a player profile/detail view with career stats
9. Implement a real temporal trend chart (matches on x-axis, success rate on y-axis) — consider adding `recharts` as a dependency
10. Add toast notifications for form submissions
11. Add match and season deletion
12. Add date range filter to the stats view

### Larger Investments
13. Wire up Claude Vision API for real scoresheet extraction (the core PRD differentiator)
14. Add player avatar/photo upload
15. Add PDF export alongside CSV
16. Migrate to TypeScript
17. Add Supabase backend for persistence beyond localStorage
