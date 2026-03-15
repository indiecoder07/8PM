/**
 * /api/extract — Scoresheet image → structured player stats via Gemini Vision
 *
 * POST /api/extract
 *   Body: { image: "<base64 data URL>", players: [{ id, name }] }
 *   Returns: { scorecards: [ { playerId, rs, sr, ob, rc, wkts, econ, c } ] }
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
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid image data URL format." });
    }
    const [, mimeType, base64Data] = match;

    const playerList = players.map((p) => `- ${p.name} (id: ${p.id})`).join("\n");

    const prompt = `You are extracting indoor cricket scorecard data from a scoresheet image.

Here are the players in the team:
${playerList}

Look at the scoresheet image and extract each player's performance stats. For each player you can identify in the scoresheet, return their stats.

Return ONLY a valid JSON array. Each entry must have exactly these fields:
- "playerId": the player's id from the list above (match by name)
- "rs": runs scored (number)
- "sr": strike rate (number)
- "ob": overs bowled (number)
- "rc": runs conceded (number)
- "wkts": wickets taken (number)
- "econ": economy rate (number, rc/ob rounded to 1 decimal)
- "c": contribution score (number, rs minus rc)

If you cannot find a player's data, omit them. If a field is unclear, use 0.

Return ONLY the JSON array, no markdown, no explanation. Example:
[{"playerId":"player-abc123","rs":24,"sr":150,"ob":2,"rc":14,"wkts":1,"econ":7.0,"c":10}]`;

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
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Parse the JSON array from Gemini's response
    let scorecards;
    try {
      // Strip any markdown code fences if present
      const strippedText = rawText.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      scorecards = JSON.parse(strippedText);
    } catch (parseErr) {
      console.error("[/api/extract] Failed to parse Gemini response:", rawText);
      return res.status(502).json({ error: "Could not parse extraction result.", raw: rawText });
    }

    if (!Array.isArray(scorecards)) {
      return res.status(502).json({ error: "Extraction did not return an array.", raw: rawText });
    }

    // Validate and sanitise each entry
    const validPlayerIds = new Set(players.map((p) => p.id));
    const sanitised = scorecards
      .filter((sc) => sc && validPlayerIds.has(sc.playerId))
      .map((sc) => ({
        playerId: sc.playerId,
        rs:   Number(sc.rs)   || 0,
        sr:   Number(sc.sr)   || 0,
        ob:   Number(sc.ob)   || 0,
        rc:   Number(sc.rc)   || 0,
        wkts: Number(sc.wkts) || 0,
        econ: Number(sc.econ) || 0,
        c:    Number(sc.c)    || 0,
      }));

    return res.status(200).json({ scorecards: sanitised });
  } catch (err) {
    console.error("[/api/extract]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
