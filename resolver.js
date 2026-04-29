const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAZIONE — tutto gestito da variabili Railway
// Vai su Railway → Variables e aggiungi/rimuovi le sorgenti che vuoi
//
//  VIDSRC_ENABLED=true         abilita VidSrc (default: true)
//  VIDSRC2_ENABLED=true        abilita VidSrc2 (default: true)
//  EMBED2_ENABLED=true         abilita 2Embed (default: true)
//  SUPEREMBED_ENABLED=true     abilita SuperEmbed (default: true)
//  MOVIESAPI_ENABLED=true      abilita MoviesAPI (default: true)
//  AUTOEMBED_ENABLED=true      abilita AutoEmbed (default: true)
//
//  LANGUAGE=it                 lingua preferita (default: it)
// ─────────────────────────────────────────────────────────────────────────────

const LANG = process.env.LANGUAGE || "it";

function isEnabled(varName, defaultVal = true) {
  const val = process.env[varName];
  if (val === undefined) return defaultVal;
  return val.toLowerCase() === "true";
}

// ─── SORGENTI ────────────────────────────────────────────────────────────────

/**
 * VidSrc.to — una delle API più affidabili per Stremio
 * Supporta film e serie, multi-lingua
 */
async function getVidSrcStreams(type, imdbId, season, episode) {
  if (!isEnabled("VIDSRC_ENABLED")) return [];
  try {
    let url;
    if (type === "movie") {
      url = `https://vidsrc.to/embed/movie/${imdbId}`;
    } else {
      url = `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
    }

    // VidSrc espone un endpoint API JSON con i server disponibili
    const apiUrl = type === "movie"
      ? `https://vidsrc.to/vapi/movie/imdb/${imdbId}`
      : `https://vidsrc.to/vapi/tv/imdb/${imdbId}/${season}/${episode}`;

    console.log(`[VidSrc] Chiamata API: ${apiUrl}`);
    const response = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://vidsrc.to" },
      timeout: 10000,
    });

    const data = response.data;
    const streams = [];

    if (data && data.status === 200 && data.result && data.result.sources) {
      data.result.sources.forEach((source) => {
        if (source.url) {
          streams.push({
            name: "ITA Stream",
            title: `▶ VidSrc — ${source.title || "HD"}`,
            url: source.url,
            behaviorHints: { notWebReady: false },
          });
        }
      });
    }

    // Fallback: se l'API non dà stream diretti, usa l'URL embed
    // che Stremio può aprire internamente su alcuni dispositivi
    if (streams.length === 0) {
      streams.push({
        name: "ITA Stream",
        title: "▶ VidSrc",
        url,
        behaviorHints: { notWebReady: false },
      });
    }

    console.log(`[VidSrc] ${streams.length} stream trovati`);
    return streams;
  } catch (err) {
    console.error(`[VidSrc] Errore: ${err.message}`);
    return [];
  }
}

/**
 * VidSrc2 / VidSrc.me — sorgente alternativa
 */
async function getVidSrc2Streams(type, imdbId, season, episode) {
  if (!isEnabled("VIDSRC2_ENABLED")) return [];
  try {
    let url;
    if (type === "movie") {
      url = `https://vidsrc.me/embed/movie?imdb=${imdbId}&lang=${LANG}`;
    } else {
      url = `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}&lang=${LANG}`;
    }

    console.log(`[VidSrc2] URL: ${url}`);

    // Cerca stream diretto nella pagina
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        "Referer": "https://vidsrc.me",
      },
      timeout: 12000,
    });

    const html = response.data;
    const streams = [];

    // Cerca m3u8
    const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
    if (m3u8) {
      [...new Set(m3u8)].slice(0, 2).forEach((streamUrl, i) => {
        streams.push({
          name: "ITA Stream",
          title: `▶ VidSrc2${i > 0 ? ` [${i + 1}]` : ""}`,
          url: streamUrl,
          behaviorHints: { notWebReady: false },
        });
      });
    }

    // Cerca pattern "file":"url"
    if (streams.length === 0) {
      const fileMatch = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/);
      if (fileMatch) {
        streams.push({
          name: "ITA Stream",
          title: "▶ VidSrc2",
          url: fileMatch[1],
        });
      }
    }

    console.log(`[VidSrc2] ${streams.length} stream trovati`);
    return streams;
  } catch (err) {
    console.error(`[VidSrc2] Errore: ${err.message}`);
    return [];
  }
}

/**
 * 2Embed.cc — sorgente gratuita con buon supporto multilingua
 */
async function get2EmbedStreams(type, imdbId, season, episode) {
  if (!isEnabled("EMBED2_ENABLED")) return [];
  try {
    let url;
    if (type === "movie") {
      url = `https://www.2embed.cc/embed/${imdbId}`;
    } else {
      url = `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`;
    }

    console.log(`[2Embed] URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        "Referer": "https://www.2embed.cc",
      },
      timeout: 12000,
    });

    const html = response.data;
    const streams = [];

    const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
    if (m3u8) {
      [...new Set(m3u8)].slice(0, 2).forEach((streamUrl, i) => {
        streams.push({
          name: "ITA Stream",
          title: `▶ 2Embed${i > 0 ? ` [${i + 1}]` : ""}`,
          url: streamUrl,
          behaviorHints: { notWebReady: false },
        });
      });
    }

    if (streams.length === 0) {
      const fileMatch = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/);
      if (fileMatch) {
        streams.push({
          name: "ITA Stream",
          title: "▶ 2Embed",
          url: fileMatch[1],
        });
      }
    }

    console.log(`[2Embed] ${streams.length} stream trovati`);
    return streams;
  } catch (err) {
    console.error(`[2Embed] Errore: ${err.message}`);
    return [];
  }
}

/**
 * SuperEmbed — supporta parametro lingua esplicito
 */
async function getSuperEmbedStreams(type, imdbId, season, episode) {
  if (!isEnabled("SUPEREMBED_ENABLED")) return [];
  try {
    let url;
    if (type === "movie") {
      url = `https://multiembed.mov/?video_id=${imdbId}&tmdb=0`;
    } else {
      url = `https://multiembed.mov/?video_id=${imdbId}&tmdb=0&s=${season}&e=${episode}`;
    }

    console.log(`[SuperEmbed] URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        "Referer": "https://multiembed.mov",
      },
      timeout: 12000,
    });

    const html = response.data;
    const streams = [];

    const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
    if (m3u8) {
      [...new Set(m3u8)].slice(0, 2).forEach((streamUrl, i) => {
        streams.push({
          name: "ITA Stream",
          title: `▶ SuperEmbed${i > 0 ? ` [${i + 1}]` : ""}`,
          url: streamUrl,
          behaviorHints: { notWebReady: false },
        });
      });
    }

    console.log(`[SuperEmbed] ${streams.length} stream trovati`);
    return streams;
  } catch (err) {
    console.error(`[SuperEmbed] Errore: ${err.message}`);
    return [];
  }
}

/**
 * MoviesAPI.club — API JSON diretta, molto semplice
 */
async function getMoviesAPIStreams(type, imdbId, season, episode) {
  if (!isEnabled("MOVIESAPI_ENABLED")) return [];
  try {
    let apiUrl;
    if (type === "movie") {
      apiUrl = `https://moviesapi.club/movie/${imdbId}`;
    } else {
      apiUrl = `https://moviesapi.club/tv/${imdbId}-${season}-${episode}`;
    }

    console.log(`[MoviesAPI] URL: ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        "Referer": "https://moviesapi.club",
      },
      timeout: 12000,
    });

    const html = response.data;
    const streams = [];

    // MoviesAPI espone i dati come JSON dentro la pagina
    const jsonMatch = html.match(/var\s+data\s*=\s*(\{[^;]+\})/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        if (data.file) {
          streams.push({
            name: "ITA Stream",
            title: `▶ MoviesAPI ${data.title || ""}`.trim(),
            url: data.file,
            behaviorHints: { notWebReady: false },
          });
        }
        // Aggiungi sottotitoli italiani se disponibili
        if (data.subtitle) {
          streams[streams.length - 1].subtitles = [
            { id: "it", url: data.subtitle, lang: "ita" }
          ];
        }
      } catch {}
    }

    // Fallback: cerca m3u8
    if (streams.length === 0) {
      const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
      if (m3u8) {
        streams.push({
          name: "ITA Stream",
          title: "▶ MoviesAPI",
          url: m3u8[0],
        });
      }
    }

    console.log(`[MoviesAPI] ${streams.length} stream trovati`);
    return streams;
  } catch (err) {
    console.error(`[MoviesAPI] Errore: ${err.message}`);
    return [];
  }
}

/**
 * AutoEmbed — sorgente semplice e affidabile
 */
async function getAutoEmbedStreams(type, imdbId, season, episode) {
  if (!isEnabled("AUTOEMBED_ENABLED")) return [];
  try {
    let url;
    if (type === "movie") {
      url = `https://autoembed.co/movie/imdb/${imdbId}`;
    } else {
      url = `https://autoembed.co/tv/imdb/${imdbId}-${season}-${episode}`;
    }

    console.log(`[AutoEmbed] URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        "Referer": "https://autoembed.co",
      },
      timeout: 12000,
    });

    const html = response.data;
    const streams = [];

    const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
    if (m3u8) {
      [...new Set(m3u8)].slice(0, 2).forEach((streamUrl, i) => {
        streams.push({
          name: "ITA Stream",
          title: `▶ AutoEmbed${i > 0 ? ` [${i + 1}]` : ""}`,
          url: streamUrl,
          behaviorHints: { notWebReady: false },
        });
      });
    }

    console.log(`[AutoEmbed] ${streams.length} stream trovati`);
    return streams;
  } catch (err) {
    console.error(`[AutoEmbed] Errore: ${err.message}`);
    return [];
  }
}

// ─── AGGREGATORE PRINCIPALE ───────────────────────────────────────────────────
async function getStreams(type, imdbId, season, episode) {
  console.log(`[Resolver] Cerco stream per ${type} ${imdbId} S${season}E${episode}`);

  const results = await Promise.allSettled([
    getVidSrcStreams(type, imdbId, season, episode),
    getVidSrc2Streams(type, imdbId, season, episode),
    get2EmbedStreams(type, imdbId, season, episode),
    getSuperEmbedStreams(type, imdbId, season, episode),
    getMoviesAPIStreams(type, imdbId, season, episode),
    getAutoEmbedStreams(type, imdbId, season, episode),
  ]);

  const streams = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return streams;
}

module.exports = { getStreams };
