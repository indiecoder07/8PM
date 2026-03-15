import { createSeedState, normalizeState } from "../data/seed";

const STORAGE_KEY = "8pm-state-v1";
const API_URL     = "/api/state";
const API_SECRET  = import.meta.env.VITE_API_SECRET || "";

// ── Synchronous localStorage (instant startup) ───────────────────────────────

/**
 * Read and validate state from localStorage.
 * Returns seed state if nothing is stored or the payload is corrupt.
 * Intentionally synchronous — called inside useState() initialiser.
 */
export function readStateSync() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    return normalizeState(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return createSeedState();
  }
}

/**
 * Persist state to localStorage.
 * Silently swallows quota-exceeded errors.
 */
export function writeStateSync(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage unavailable — no-op.
  }
}

// ── Async Neon API (background cloud sync) ────────────────────────────────────

/**
 * Fetch state from the Neon-backed /api/state endpoint.
 * Returns null if the server has no state yet or if the request fails.
 * Failures are silent — the app falls back to localStorage.
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
 * Fire-and-forget — the app continues working if the push fails.
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
    // Network unavailable — localStorage copy is sufficient locally.
  }
}
