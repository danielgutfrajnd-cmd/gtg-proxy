import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

/**
 * Health check (Render uses this)
 */
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * GTG connectivity test
 * This ONLY checks that Render can reach NOAA with headers
 */
app.get("/gtg-test", async (req, res) => {
  try {
    const url = "https://ftpprd.ncep.noaa.gov/";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "gtg-proxy/1.0",
        "Accept": "*/*",
      },
    });

    res.json({
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
    });
  } catch (err) {
    res.status(500).json({
      error: "fetch failed",
      message: err.message,
      name: err.name,
    });
  }
});

app.listen(PORT, () => {
  console.log("GTG proxy running on", PORT);
});
