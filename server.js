import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

function errToJson(err) {
  return {
    name: err?.name,
    message: err?.message,
    stack: err?.stack?.split("\n").slice(0, 4).join("\n"),
    cause: err?.cause
      ? {
          name: err.cause.name,
          message: err.cause.message,
          code: err.cause.code,
          errno: err.cause.errno,
          syscall: err.cause.syscall,
          address: err.cause.address,
          port: err.cause.port,
        }
      : null,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * 1) Checks if Render can reach the general internet
 * Expect: status 200
 */
app.get("/net-test", async (req, res) => {
  try {
    const r = await fetchWithTimeout("https://example.com", {
      method: "GET",
      headers: {
        "User-Agent": "gtg-proxy/1.0",
        Accept: "*/*",
      },
    });

    res.json({
      url: "https://example.com",
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get("content-type"),
    });
  } catch (e) {
    res.status(500).json({ url: "https://example.com", error: errToJson(e) });
  }
});

/**
 * 2) NOAA test (this is what we actually need)
 * If this fails but /net-test works, NOAA is blocking/handshaking oddly from Render.
 */
app.get("/gtg-test", async (req, res) => {
  const url = "https://ftpprd.ncep.noaa.gov/pub/";

  try {
    const r = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "User-Agent": "gtg-proxy/1.0",
        Accept: "*/*",
      },
    });

    res.json({
      url,
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get("content-type"),
    });
  } catch (e) {
    res.status(500).json({ url, error: errToJson(e) });
  }
});

app.listen(PORT, () => {
  console.log("GTG proxy running on", PORT);
});
