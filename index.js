const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const { getVixSRCStreams } = require("./scrapers/vixsrc");
const { getStreamingCommunityStreams } = require("./scrapers/streamingcommunity");

const PORT = process.env.PORT || 7000;

// Il dominio pubblico Railway viene iniettato automaticamente come variabile d'ambiente
const PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

// ─── MANIFEST ────────────────────────────────────────────────────────────────
const manifest = {
  id: "org.itastream.addon",
  version: "1.0.0",
  name: "ITA Stream",
  description: "Stream in italiano da VixSRC e StreamingCommunity",
  logo: `${PUBLIC_DOMAIN}/logo.png`,
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: false,
    adult: false,
  },
};

// ─── ADDON ────────────────────────────────────────────────────────────────────
const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`[ITA Stream] Richiesta: type=${type} id=${id}`);

  const [imdbId, season, episode] = id.split(":");

  const results = await Promise.allSettled([
    getVixSRCStreams(type, imdbId, season, episode).catch((err) => {
      console.error("[VixSRC] Errore:", err.message);
      return [];
    }),
    getStreamingCommunityStreams(type, imdbId, season, episode).catch((err) => {
      console.error("[SC] Errore:", err.message);
      return [];
    }),
  ]);

  const streams = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  console.log(`[ITA Stream] Trovati ${streams.length} stream`);
  return { streams };
});

// ─── SERVER ────────────────────────────────────────────────────────────────────
const { getRouter } = require("stremio-addon-sdk");
const express = require("express");
const path = require("path");

const addonRouter = getRouter(builder.getInterface());
const app = express();

// CORS — necessario per Stremio
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// Servi il logo statico
app.use("/logo.png", express.static(path.join(__dirname, "logo.png")));

// Tutte le rotte Stremio
app.use("/", addonRouter);

app.listen(PORT, () => {
  console.log(`✅ ITA Stream avviato sulla porta ${PORT}`);
  console.log(`📺 Manifest: ${PUBLIC_DOMAIN}/manifest.json`);
  console.log(`🖼️  Logo:     ${PUBLIC_DOMAIN}/logo.png`);
});
