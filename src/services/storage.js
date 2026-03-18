import { normalizeState } from "../data/seed";

const LEGACY_KEY = "8pm-state-v1";
const API_URL    = "/api/state";
const API_SECRET = import.meta.env.VITE_API_SECRET || "";

// ── One-time localStorage cleanup ────────────────────────────────────────────
// Remove any leftover data from the previous localStorage-backed architecture.
try {
  window.localStorage.removeItem(LEGACY_KEY);
} catch {
  // Storage unavailable — no-op.
}

// ── Neon API ──────────────────────────────────────────────────────────────────

/**
 * Fetch state from the Neon-backed /api/state endpoint.
 * Returns null if the server has no state yet or if the request fails.
 */
export async function fetchStateFromServer() {
  try {
    const headers = API_SECRET ? { Authorization: `Bearer ${API_SECRET}` } : {};
    const res = await fetch(API_URL, { cache: "no-store", headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data ? normalizeState(data) : null;
  } catch {
    return null;
  }
}

/**
 * Push state to the Neon-backed /api/state endpoint.
 * Fire-and-forget — failures are silent.
 */
export async function pushStateToServer(state) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (API_SECRET) headers.Authorization = `Bearer ${API_SECRET}`;
    await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(state),
    });
  } catch {
    // Network unavailable — no-op.
  }
}
