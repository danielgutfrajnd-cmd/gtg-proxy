import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/gtg-test", async (req, res) => {
  try {
    const url =
      "https://ftpprd.ncep.noaa.gov/pub/data/nccf/com/dafs/prod/dafs.20260104/00/dafs.t00z.gtg.3km.conus.f012.grib2";

    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.noaa.gov/",
      },
    });

    res.json({
      status: r.status,
      ok: r.ok,
      contentType: r.headers.get("content-type"),
      contentLength: r.headers.get("content-length"),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("GTG proxy running on", PORT);
});
