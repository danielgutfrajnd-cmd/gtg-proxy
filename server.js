import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Simple CORS (so your app can call this proxy from anywhere) ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Helper: fetch with timeout + 2 retries
async function fetchWithRetry(url, { timeoutMs = 30000, retries = 2 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const r = await fetch(url, {
        signal: controller.signal,
        // These headers help with NOAA / bot protections on some hosts
        headers: {
          "User-Agent": "gtg-proxy/1.0 (+https://gtg-proxy.onrender.com)",
          "Accept": "*/*",
          "Accept-Encoding": "identity",
        },
        redirect: "follow",
      });

      clearTimeout(t);
      return r;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      // tiny backoff
      await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
    }
  }

  throw lastErr;
}

/**
 * Debug: tests multiple NOAA mirrors.
 * If one mirror is blocked, this will show which.
 */
app.get("/gtg-test", async (req, res) => {
  // Try multiple base hosts (ftpprd is often blocked from cloud providers)
  const urls = [
    // Mirror 1 (try this first)
    "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.20260104/00/atmos/gfs.t00z.pgrb2.0p25.f012",
    // Mirror 2 (your original – likely to timeout)
    "https://ftpprd.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/gfs.20260104/00/atmos/gfs.t00z.pgrb2.0p25.f012",
  ];

  const results = [];

  for (const url of urls) {
    try {
      const r = await fetchWithRetry(url, { timeoutMs: 20000, retries: 1 });
      results.push({
        url,
        ok: r.ok,
        status: r.status,
        contentType: r.headers.get("content-type"),
      });

      // If we got a real response (even 403), stop and return that
      if (r.status !== 0) break;
    } catch (e) {
      results.push({
        url,
        ok: false,
        error: {
          name: e?.name,
          message: e?.message,
          cause: e?.cause?.code || e?.cause?.message || null,
        },
      });
    }
  }

  res.json({ results });
});

/**
 * Main proxy endpoint for your app:
 * GET /proxy?url=<ENCODED_URL>
 *
 * Example:
 * /proxy?url=https%3A%2F%2Fnomads.ncep.noaa.gov%2Fpub%2Fdata%2F...
 */
app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing ?url=" });
  }

  // Basic safety: only allow NOAA-ish URLs (adjust if you want)
  const allowed = [
    "nomads.ncep.noaa.gov",
    "ftpprd.ncep.noaa.gov",
    "tgftp.nws.noaa.gov",
  ];
  try {
    const u = new URL(url);
    if (!allowed.includes(u.hostname)) {
      return res.status(400).json({ error: "Host not allowed", host: u.hostname });
    }
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  try {
    const r = await fetchWithRetry(url, { timeoutMs: 30000, retries: 2 });

    // Pass through content type
    const ct = r.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", ct);

    // If upstream error, return text/json body for debugging
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    // Stream response
    const arrayBuf = await r.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (e) {
    res.status(502).json({
      error: "fetch failed",
      name: e?.name,
      message: e?.message,
      cause: e?.cause?.code || e?.cause?.message || null,
    });
  }
});

app.listen(PORT, () => {
  console.log("GTG proxy running on", PORT);
});
