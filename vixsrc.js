const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://vixsrc.to";

/**
 * Cerca gli stream su VixSRC
 * @param {string} type - "movie" o "series"
 * @param {string} imdbId - es. "tt1234567"
 * @param {string} season - numero stagione (solo per serie)
 * @param {string} episode - numero episodio (solo per serie)
 */
async function getVixSRCStreams(type, imdbId, season, episode) {
  try {
    let pageUrl;

    if (type === "movie") {
      pageUrl = `${BASE_URL}/movie/${imdbId}`;
    } else {
      pageUrl = `${BASE_URL}/tv/${imdbId}/${season}/${episode}`;
    }

    console.log(`[VixSRC] Caricamento pagina: ${pageUrl}`);

    const response = await axios.get(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: BASE_URL,
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Cerca tutti gli iframe/player embeds nella pagina
    const streams = [];
    const iframeSrc = $("iframe").attr("src");

    if (iframeSrc) {
      const resolvedUrl = await resolveVixSRCEmbed(iframeSrc);
      if (resolvedUrl) {
        streams.push({
          name: "MultiStream ITA",
          title: "▶ VixSRC",
          url: resolvedUrl,
          behaviorHints: {
            notWebReady: false,
          },
        });
      }
    }

    // Cerca anche link diretti .m3u8 nella pagina
    const m3u8Match = response.data.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
    if (m3u8Match) {
      m3u8Match.forEach((url, i) => {
        streams.push({
          name: "MultiStream ITA",
          title: `▶ VixSRC HD${i > 0 ? ` (${i + 1})` : ""}`,
          url: url,
        });
      });
    }

    // Se non trova stream diretti, offre il link alla pagina web come fallback
    if (streams.length === 0) {
      streams.push({
        name: "MultiStream ITA",
        title: "🌐 VixSRC (apri nel browser)",
        externalUrl: pageUrl,
      });
    }

    return streams;
  } catch (err) {
    console.error(`[VixSRC] Errore nel fetch: ${err.message}`);
    return [];
  }
}

/**
 * Tenta di risolvere un URL embed per ottenere il link diretto
 */
async function resolveVixSRCEmbed(embedUrl) {
  try {
    const fullUrl = embedUrl.startsWith("http") ? embedUrl : `${BASE_URL}${embedUrl}`;
    const response = await axios.get(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: BASE_URL,
      },
      timeout: 10000,
    });

    // Cerca link m3u8 diretto nel sorgente della pagina embed
    const m3u8Match = response.data.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (m3u8Match) return m3u8Match[0];

    return null;
  } catch {
    return null;
  }
}

module.exports = { getVixSRCStreams };
