const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const { getVixSRCStreams } = require("./vixsrc");
const { getStreamingCommunityStreams } = require("./streamingcommunity");

const manifest = {
  id: "org.addon.multistream-ita",
  version: "1.0.0",
  name: "MultiStream ITA",
  description: "Stream da VixSRC e StreamingCommunity in italiano",
  logo: "https://i.imgur.com/p3XBWXF.png",
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: false,
    adult: false,
  },
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`[MultiStream ITA] Richiesta stream: type=${type} id=${id}`);

  // Per le serie, id è formato "tt1234567:1:2" (serie:stagione:episodio)
  const [imdbId, season, episode] = id.split(":");

  const promises = [
    getVixSRCStreams(type, imdbId, season, episode).catch((err) => {
      console.error("[VixSRC] Errore:", err.message);
      return [];
    }),
    getStreamingCommunityStreams(type, imdbId, season, episode).catch((err) => {
      console.error("[StreamingCommunity] Errore:", err.message);
      return [];
    }),
  ];

  const results = await Promise.allSettled(promises);
  const streams = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  console.log(`[MultiStream ITA] Trovati ${streams.length} stream totali`);
  return { streams };
});

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`✅ MultiStream ITA addon avviato sulla porta ${PORT}`);
console.log(`📺 Installa su Stremio: http://localhost:${PORT}/manifest.json`);
