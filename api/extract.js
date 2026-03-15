/**
 * /api/extract — Scoresheet image → structured match + player stats via Gemini Vision
 *
 * POST /api/extract
 *   Body: { image: "<base64 data URL>", players: [{ id, name }] }
 *   Returns: {
 *     match:      { opponent, ourScore, opponentScore, result },
 *     scorecards: [ { playerId, rs, sr, ob, rc, wkts, econ, c } ]
 *   }
 *
 * Requires GEMINI_API_KEY environment variable.
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  // ── Auth (same shared secret as /api/state) ───────────────────
  const secret = process.env.API_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized." });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  try {
    const { image, players } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Missing `image` (base64 data URL)." });
    }
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: "Missing `players` array." });
    }

    // Extract base64 content and media type from data URL
    const imgMatch = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!imgMatch) {
      return res.status(400).json({ error: "Invalid image data URL format." });
    }
    const [, mimeType, base64Data] = imgMatch;

    const playerList = players.map((p) => `- ${p.name} (id: ${p.id})`).join("\n");

    const prompt = `You are extracting indoor cricket scorecard data from a scoresheet image.

IMPORTANT: Our team is called "8PM". The scoresheet contains data for two teams. You must ONLY extract data from the "8PM" section. Ignore the opponent team's player data entirely.

Here are the 8PM players:
${playerList}

TASK 1 — Match metadata:
Look at the top of the scoresheet for the team names and total scores.
- The opponent is the OTHER team (not 8PM).
- "ourScore" is the TOTAL score for 8PM.
- "opponentScore" is the TOTAL score for the opponent.
- "result": "W" if ourScore > opponentScore, "L" if less, "D" if tied.

TASK 2 — Player scorecards:
Find the summary table under the "8PM" heading. It has columns: Name, RS, SR, OB, RC, Wkts, Econ, C.
For each player you can match by name to the list above, extract their row.

Return ONLY a valid JSON object with this exact structure:
{
  "match": {
    "opponent": "Team Name",
    "ourScore": 95,
    "opponentScore": 45,
    "result": "W"
  },
  "scorecards": [
    {"playerId":"player-abc123","rs":17,"sr":130.77,"ob":2,"rc":-5,"wkts":3,"econ":-2.5,"c":22}
  ]
}

Rules:
- Match player names from the scoresheet to the player list above. Use fuzzy matching for partial names (e.g. "Mayank Ghosh #16" matches "Mayank Ghosh").
- If a value is negative, keep it negative (e.g. econ can be negative in indoor cricket).
- If you cannot find a player's data, omit them from the array.
- Return ONLY the JSON object, no markdown, no explanation.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[/api/extract] Gemini API error:", response.status, errBody);
      return res.status(502).json({ error: "Gemini API request failed.", detail: errBody });
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Parse the JSON object from Gemini's response
    let parsed;
    try {
      const strippedText = rawText.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(strippedText);
    } catch (parseErr) {
      console.error("[/api/extract] Failed to parse Gemini response:", rawText);
      return res.status(502).json({ error: "Could not parse extraction result.", raw: rawText });
    }

    // ── Validate match metadata ───────────────────────────────────
    const matchData = parsed.match || {};
    const extractedMatch = {
      opponent:      String(matchData.opponent || "Unknown"),
      ourScore:      Number(matchData.ourScore) || 0,
      opponentScore: Number(matchData.opponentScore) || 0,
      result:        ["W", "L", "D"].includes(matchData.result) ? matchData.result : "D",
    };

    // ── Validate scorecards ───────────────────────────────────────
    const rawCards = Array.isArray(parsed.scorecards) ? parsed.scorecards : [];
    const validPlayerIds = new Set(players.map((p) => p.id));
    const sanitisedCards = rawCards
      .filter((sc) => sc && validPlayerIds.has(sc.playerId))
      .map((sc) => ({
        playerId: sc.playerId,
        rs:   Number(sc.rs)   ?? 0,
        sr:   Number(sc.sr)   ?? 0,
        ob:   Number(sc.ob)   ?? 0,
        rc:   Number(sc.rc)   ?? 0,
        wkts: Number(sc.wkts) ?? 0,
        econ: Number(sc.econ) ?? 0,
        c:    Number(sc.c)    ?? 0,
      }));

    return res.status(200).json({
      match:      extractedMatch,
      scorecards: sanitisedCards,
    });
  } catch (err) {
    console.error("[/api/extract]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
