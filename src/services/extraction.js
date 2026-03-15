const API_URL     = "/api/extract";
const API_SECRET  = import.meta.env.VITE_API_SECRET || "";

/**
 * Send a scoresheet image to the extraction API and return match metadata + scorecards.
 * @param {string} imageDataUrl - base64 data URL of the scoresheet image
 * @param {Array<{id: string, name: string}>} players - active players to match against
 * @returns {Promise<{match?: object, scorecards?: Array, error?: string}>}
 */
export async function extractScorecard(imageDataUrl, players) {
  const headers = { "Content-Type": "application/json" };
  if (API_SECRET) headers.Authorization = `Bearer ${API_SECRET}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ image: imageDataUrl, players }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error || `Server returned ${res.status}` };
  }

  return res.json();
}
