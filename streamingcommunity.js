const axios = require("axios");
const cheerio = require("cheerio");

// StreamingCommunity cambia dominio spesso — aggiorna qui se necessario
const BASE_URL = "https://streamingcommunity.computer";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
  "Connection": "keep-alive",
};

async function getStreamingCommunityStreams(type, imdbId, season, episode) {
  try {
    // Step 1: ottieni il titolo del film tramite OMDb (API key dalla variabile d'ambiente)
    const title = await getTitleFromOMDb(imdbId);
    if (!title) {
      console.log(`[SC] Titolo non trovato per ${imdbId}. Controlla OMDB_API_KEY nelle variabili Railway.`);
      return [];
    }

    console.log(`[SC] Cerco: "${title}"`);

    // Step 2: cerca su StreamingCommunity
    const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(title)}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: { ...BROWSER_HEADERS, Referer: BASE_URL },
      timeout: 15000,
    });

    const $ = cheerio.load(searchResponse.data);
    let contentUrl = null;

    // Cerca link alla pagina del contenuto
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.includes("/titles/") || href.includes("/watch/")) && !contentUrl) {
        contentUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      }
    });

    if (!contentUrl) {
      console.log(`[SC] Nessun risultato per "${title}"`);
      return [];
    }

    // Step 3: per le serie vai alla stagione/episodio
    if (type === "series" && season && episode) {
      contentUrl = `${contentUrl}/stagione-${season}/episodio-${episode}`;
    }

    console.log(`[SC] Pagina contenuto: ${contentUrl}`);

    // Step 4: carica la pagina del contenuto
    const contentResponse = await axios.get(contentUrl, {
      headers: { ...BROWSER_HEADERS, Referer: BASE_URL },
      timeout: 15000,
    });

    const streams = [];
    const html = contentResponse.data;
    const $c = cheerio.load(html);

    // Cerca m3u8 diretti
    const m3u8Matches = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
    if (m3u8Matches) {
      [...new Set(m3u8Matches)].slice(0, 3).forEach((url, i) => {
        streams.push({
          name: "ITA Stream",
          title: `🇮🇹 StreamingCommunity${i > 0 ? ` [${i + 1}]` : ""}`,
          url,
          behaviorHints: { notWebReady: false },
        });
      });
    }

    // Cerca mp4 diretti
    if (streams.length === 0) {
      const mp4Matches = html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/g);
      if (mp4Matches) {
        [...new Set(mp4Matches)].slice(0, 2).forEach((url, i) => {
          streams.push({
            name: "ITA Stream",
            title: `🇮🇹 StreamingCommunity MP4${i > 0 ? ` [${i + 1}]` : ""}`,
            url,
          });
        });
      }
    }

    // Cerca pattern "file":"url" o "source":"url" nei dati del player
    if (streams.length === 0) {
      const filePattern = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/);
      if (filePattern) {
        streams.push({
          name: "ITA Stream",
          title: "🇮🇹 StreamingCommunity",
          url: filePattern[1],
        });
      }
    }

    // Risolvi iframe se ancora nessuno stream trovato
    if (streams.length === 0) {
      const iframeSrc = $c("iframe").first().attr("src");
      if (iframeSrc) {
        const resolved = await resolveEmbed(iframeSrc, BASE_URL);
        if (resolved) {
          streams.push({
            name: "ITA Stream",
            title: "🇮🇹 StreamingCommunity",
            url: resolved,
          });
        }
      }
    }

    console.log(`[SC] Trovati ${streams.length} stream`);
    return streams;
  } catch (err) {
    console.error(`[SC] Errore: ${err.message}`);
    return [];
  }
}

/**
 * Ottiene il titolo del film/serie da OMDb usando la API key dalla variabile d'ambiente Railway
 */
async function getTitleFromOMDb(imdbId) {
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    console.warn("[SC] OMDB_API_KEY non impostata nelle variabili d'ambiente!");
    return null;
  }

  try {
    const response = await axios.get(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`,
      { timeout: 8000 }
    );

    if (response.data && response.data.Title) {
      // Prova prima il titolo italiano, altrimenti usa quello inglese
      return response.data.Title;
    }
    return null;
  } catch (err) {
    console.error(`[SC] OMDb errore: ${err.message}`);
    return null;
  }
}

async function resolveEmbed(embedUrl, referer) {
  try {
    const fullUrl = embedUrl.startsWith("http") ? embedUrl : `${referer}${embedUrl}`;
    const response = await axios.get(fullUrl, {
      headers: { ...BROWSER_HEADERS, Referer: referer, Origin: referer },
      timeout: 12000,
    });

    const html = response.data;

    const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
    if (m3u8) return m3u8[0];

    const mp4 = html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/);
    if (mp4) return mp4[0];

    const filePattern = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/);
    if (filePattern) return filePattern[1];

    return null;
  } catch {
    return null;
  }
}

module.exports = { getStreamingCommunityStreams };
