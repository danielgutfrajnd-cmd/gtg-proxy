import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

// Health check (Render uses this implicitly)
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Simple outbound connectivity test
app.get("/net-test", async (req, res) => {
  try {
    const r = await fetch("https://example.com");
    res.json({
      url: "https://example.com",
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get("content-type"),
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      name: e.name,
    });
  }
});

app.listen(PORT, () => {
  console.log("GTG proxy running on", PORT);
});
