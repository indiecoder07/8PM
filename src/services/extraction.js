const API_URL     = "/api/extract";
const API_SECRET  = import.meta.env.VITE_API_SECRET || "";

/**
 * Send a scoresheet image to the extraction API and return match metadata + scorecards.
 * @param {string} imageDataUrl - base64 data URL of the scoresheet image
 * @param {Array<{id: string, name: string}>} players - active players to match against
 * @returns {Promise<{match?: object, scorecards?: Array, error?: string, status?: number, detail?: string}>}
 */
export async function extractScorecard(imageDataUrl, players) {
  const headers = { "Content-Type": "application/json" };
  if (API_SECRET) headers.Authorization = `Bearer ${API_SECRET}`;

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ image: imageDataUrl, players }),
    });
  } catch (err) {
    return {
      error: "Could not reach the extraction API.",
      detail: err?.message || "Network request failed.",
    };
  }

  const raw = await res.text().catch(() => "");
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    let error = body.error || `Server returned ${res.status}`;
    if (res.status === 401) error = "Unauthorized request to extraction API.";
    if (res.status === 413) error = "Uploaded image is too large for the extraction API.";
    if (res.status === 429) error = "Extraction API is rate-limited. Please retry in a moment.";
    if (res.status >= 500 && !body.error) error = "Extraction service failed on the server.";

    return {
      error,
      status: res.status,
      detail: body.detail || body.raw || raw.slice(0, 240),
    };
  }

  if (!raw) {
    return { error: "Extraction API returned an empty response.", status: res.status };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      error: "Extraction API returned invalid JSON.",
      status: res.status,
      detail: raw.slice(0, 240),
    };
  }
}
