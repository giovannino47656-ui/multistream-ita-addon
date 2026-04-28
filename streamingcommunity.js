const axios = require("axios");
const cheerio = require("cheerio");

// StreamingCommunity cambia dominio spesso — aggiorna qui se necessario
const BASE_URL = "https://streamingcommunity.computer";

/**
 * Cerca gli stream su StreamingCommunity
 * @param {string} type - "movie" o "series"
 * @param {string} imdbId - es. "tt1234567"
 * @param {string} season - numero stagione (solo per serie)
 * @param {string} episode - numero episodio (solo per serie)
 */
async function getStreamingCommunityStreams(type, imdbId, season, episode) {
  try {
    // Step 1: Cerca il titolo tramite IMDb per ottenere il nome
    const title = await getTitleFromIMDb(imdbId);
    if (!title) {
      console.log(`[SC] Impossibile ottenere il titolo per ${imdbId}`);
      return [];
    }

    console.log(`[SC] Cercando: "${title}"`);

    // Step 2: Cerca su StreamingCommunity
    const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(title)}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: BASE_URL,
        "Accept-Language": "it-IT,it;q=0.9",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(searchResponse.data);

    // Cerca il primo risultato pertinente
    let contentUrl = null;

    // Selettore generico per i risultati di ricerca SC
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (
        href &&
        (href.includes("/titles/") || href.includes("/watch/")) &&
        !contentUrl
      ) {
        contentUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      }
    });

    if (!contentUrl) {
      console.log(`[SC] Nessun risultato trovato per "${title}"`);
      return [];
    }

    console.log(`[SC] Trovato contenuto: ${contentUrl}`);

    // Step 3: Per le serie, naviga alla stagione/episodio giusto
    if (type === "series" && season && episode) {
      contentUrl = `${contentUrl}/stagione-${season}/episodio-${episode}`;
    }

    // Step 4: Carica la pagina del contenuto
    const contentResponse = await axios.get(contentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: BASE_URL,
        "Accept-Language": "it-IT,it;q=0.9",
      },
      timeout: 15000,
    });

    const streams = [];

    // Cerca m3u8 nel sorgente
    const m3u8Matches = contentResponse.data.match(
      /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g
    );
    if (m3u8Matches) {
      m3u8Matches.forEach((url, i) => {
        streams.push({
          name: "MultiStream ITA",
          title: `🇮🇹 StreamingCommunity${i > 0 ? ` (${i + 1})` : ""}`,
          url: url,
        });
      });
    }

    // Cerca iframe embed
    const $content = cheerio.load(contentResponse.data);
    const iframeSrc = $content("iframe").attr("src");
    if (iframeSrc && streams.length === 0) {
      const resolvedUrl = await resolveEmbed(iframeSrc, BASE_URL);
      if (resolvedUrl) {
        streams.push({
          name: "MultiStream ITA",
          title: "🇮🇹 StreamingCommunity",
          url: resolvedUrl,
        });
      }
    }

    // Fallback: link diretto alla pagina
    if (streams.length === 0) {
      streams.push({
        name: "MultiStream ITA",
        title: "🌐 StreamingCommunity (apri nel browser)",
        externalUrl: contentUrl,
      });
    }

    return streams;
  } catch (err) {
    console.error(`[SC] Errore: ${err.message}`);
    return [];
  }
}

/**
 * Ottiene il titolo di un film/serie dall'API pubblica di IMDb (OMDb)
 */
async function getTitleFromIMDb(imdbId) {
  try {
    // Usa l'API di OMDb (gratuita con registrazione) oppure scraping IMDb
    const response = await axios.get(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=trilogy`,
      { timeout: 5000 }
    );
    if (response.data && response.data.Title) {
      return response.data.Title;
    }
    return null;
  } catch {
    // Fallback: prova a estrarre il titolo dalla pagina IMDb
    try {
      const imdbResponse = await axios.get(
        `https://www.imdb.com/title/${imdbId}/`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
          },
          timeout: 8000,
        }
      );
      const $ = cheerio.load(imdbResponse.data);
      const title =
        $("h1[data-testid='hero__pageTitle'] span").first().text().trim() ||
        $("title").text().replace(" - IMDb", "").trim();
      return title || null;
    } catch {
      return null;
    }
  }
}

/**
 * Risolve un embed per ottenere il link diretto allo stream
 */
async function resolveEmbed(embedUrl, referer) {
  try {
    const fullUrl = embedUrl.startsWith("http")
      ? embedUrl
      : `${referer}${embedUrl}`;
    const response = await axios.get(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: referer,
      },
      timeout: 10000,
    });

    const m3u8Match = response.data.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (m3u8Match) return m3u8Match[0];

    return null;
  } catch {
    return null;
  }
}

module.exports = { getStreamingCommunityStreams };
