/**
 * Generate a short prefixed unique ID.
 * Uses crypto.randomUUID when available, falls back to Math.random.
 */
export function uid(prefix = "") {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return prefix ? `${prefix}-${random}` : random;
}

/**
 * Combine class names, filtering out falsy values.
 * @param {...string} args
 */
export function cx(...args) {
  return args.filter(Boolean).join(" ");
}

/**
 * Compute success/failure stats for a single player across all events.
 */
export function playerSuccess(events, playerId) {
  const own = events.filter((e) => e.playerId === playerId);
  if (own.length === 0) return { attempts: 0, successful: 0, rate: 0 };
  const successful = own.filter((e) => e.meta?.success).length;
  return {
    attempts: own.length,
    successful,
    rate: Math.round((successful / own.length) * 100),
  };
}

/**
 * Format an ISO date string (YYYY-MM-DD) to a human-readable date.
 */
export function formatDate(value) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

/**
 * Format a full ISO timestamp to a human-readable date + time.
 */
export function formatTimestamp(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Trigger a CSV download in the browser.
 * @param {Array<Array<string|number>>} rows
 * @param {string} filename
 */
export function exportCsv(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").split('"').join('""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format an ISO timestamp as a relative time string (e.g., "just now", "2m ago").
 */
export function timeAgo(iso) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Generate placeholder scorecard rows for a match (used in simulated extraction).
 */
export function buildMockScorecards(players, matchId) {
  return players
    .filter((p) => p.active)
    .slice(0, 5)
    .map((player, index) => {
      const rs = 12 + index * 6;
      const rc = 8 + index * 4;
      const ob = index % 3 === 0 ? 2 : 1;
      return {
        id: uid("score"),
        matchId,
        playerId: player.id,
        rs,
        sr: 118 + index * 16,
        ob,
        rc,
        wkts: index % 3,
        econ: Number((rc / ob).toFixed(1)),
        c: rs - rc,
      };
    });
}
