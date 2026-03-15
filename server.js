/**
 * Local development API server.
 * Serves /api/state and /api/extract exactly as Vercel would.
 *
 * Start with:  node --env-file=.env.local server.js
 * (Vite proxies /api/* here automatically when you run `npm run dev`)
 */

import http from "http";
import stateHandler   from "./api/state.js";
import extractHandler from "./api/extract.js";

const PORT = 3001;

// ── Minimal req/res wrappers to match the Vercel handler interface ──────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function makeRes(nodeRes) {
  const headers = {};
  let statusCode = 200;

  return {
    setHeader(k, v)   { headers[k] = v; nodeRes.setHeader(k, v); },
    status(code)      { statusCode = code; return this; },
    json(data)        {
      nodeRes.writeHead(statusCode, { "Content-Type": "application/json", ...headers });
      nodeRes.end(JSON.stringify(data));
    },
    end()             { nodeRes.writeHead(statusCode, headers); nodeRes.end(); },
  };
}

// ── Route table ─────────────────────────────────────────────────────────────

const routes = {
  "/api/state":   stateHandler,
  "/api/extract": extractHandler,
};

// ── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, nodeRes) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const handler = routes[url.pathname];

  if (!handler) {
    nodeRes.writeHead(404, { "Content-Type": "application/json" });
    nodeRes.end(JSON.stringify({ error: `No handler for ${url.pathname}` }));
    return;
  }

  try {
    const body = await parseBody(req);
    req.body = body;
    const res = makeRes(nodeRes);
    await handler(req, res);
  } catch (err) {
    console.error("Server error:", err);
    nodeRes.writeHead(500, { "Content-Type": "application/json" });
    nodeRes.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  API server running at http://localhost:${PORT}`);
  console.log("  Routes: /api/state  /api/extract\n");
});
