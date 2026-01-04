import express from "express";


const app = express();
const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/gtg-test", async (req, res) => {
  try {
    const url =
      "https://nomads.ncep.noaa.gov/pub/data/nccf/com/dafs/prod/dafs.20260104/00/dafs.t00z.gtg.3km.conus.f012.grib2";

    const r = await fetch(url, {
  headers: {
    "User-Agent": "gtg-proxy/1.0 (contact: daniel@example.com)",
    "Accept": "*/*"
  }
});

    res.json({
      status: r.status,
      ok: r.ok,
      contentType: r.headers.get("content-type"),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("GTG proxy running on", PORT);
});
