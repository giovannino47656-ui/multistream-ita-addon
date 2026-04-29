const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const { getStreams } = require("./scrapers/resolver");
const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 7000;
const PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

// ─── MANIFEST ────────────────────────────────────────────────────────────────
const manifest = {
  id: "org.itastream.addon",
  version: "2.0.0",
  name: "ITA Stream",
  description: "Stream in italiano da VidSrc, 2Embed e altre sorgenti",
  logo: `${PUBLIC_DOMAIN}/logo.png`,
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  behaviorHints: { configurable: false, adult: false },
};

// ─── ADDON ───────────────────────────────────────────────────────────────────
const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`\n[ITA Stream] ▶ Richiesta: type=${type} id=${id}`);
  const [imdbId, season, episode] = id.split(":");
  const streams = await getStreams(type, imdbId, season, episode);
  console.log(`[ITA Stream] ✅ Trovati ${streams.length} stream totali\n`);
  return { streams };
});

// ─── SERVER ──────────────────────────────────────────────────────────────────
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.use("/logo.png", express.static(path.join(__dirname, "logo.png")));
app.use("/", getRouter(builder.getInterface()));

app.listen(PORT, () => {
  console.log(`✅ ITA Stream v2.0 avviato sulla porta ${PORT}`);
  console.log(`📺 Manifest: ${PUBLIC_DOMAIN}/manifest.json`);
});
