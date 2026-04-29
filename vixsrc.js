const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://vixsrc.to";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
  "Connection": "keep-alive",
};

async function getVixSRCStreams(type, imdbId, season, episode) {
  try {
    let pageUrl;
    if (type === "movie") {
      pageUrl = `${BASE_URL}/movie/${imdbId}`;
    } else {
      pageUrl = `${BASE_URL}/tv/${imdbId}/${season}/${episode}`;
    }

    console.log(`[VixSRC] Caricamento: ${pageUrl}`);

    const response = await axios.get(pageUrl, {
      headers: { ...BROWSER_HEADERS, Referer: BASE_URL },
      timeout: 20000,
    });

    const streams = [];
    const html = response.data;
    const $ = cheerio.load(html);

    // Tentativo 1: link m3u8 diretti nella pagina
    const m3u8Matches = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
    if (m3u8Matches) {
      const unique = [...new Set(m3u8Matches)];
      unique.slice(0, 3).forEach((url, i) => {
        streams.push({
          name: "ITA Stream",
          title: `▶ VixSRC${i > 0 ? ` [${i + 1}]` : ""}`,
          url,
          behaviorHints: { notWebReady: false },
        });
      });
    }

    // Tentativo 2: link mp4 diretti
    if (streams.length === 0) {
      const mp4Matches = html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/g);
      if (mp4Matches) {
        [...new Set(mp4Matches)].slice(0, 2).forEach((url, i) => {
          streams.push({
            name: "ITA Stream",
            title: `▶ VixSRC MP4${i > 0 ? ` [${i + 1}]` : ""}`,
            url,
          });
        });
      }
    }

    // Tentativo 3: risolvi iframe embed
    if (streams.length === 0) {
      const iframeSrc = $("iframe").first().attr("src");
      if (iframeSrc) {
        const resolved = await resolveEmbed(iframeSrc, BASE_URL);
        if (resolved) {
          streams.push({
            name: "ITA Stream",
            title: "▶ VixSRC",
            url: resolved,
            behaviorHints: { notWebReady: false },
          });
        }
      }
    }

    // Tentativo 4: source tag HTML5
    if (streams.length === 0) {
      $("source[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (src && (src.includes(".m3u8") || src.includes(".mp4"))) {
          streams.push({
            name: "ITA Stream",
            title: "▶ VixSRC",
            url: src.startsWith("http") ? src : `${BASE_URL}${src}`,
          });
        }
      });
    }

    console.log(`[VixSRC] Trovati ${streams.length} stream`);
    return streams;
  } catch (err) {
    console.error(`[VixSRC] Errore: ${err.message}`);
    return [];
  }
}

async function resolveEmbed(embedUrl, referer) {
  try {
    const fullUrl = embedUrl.startsWith("http") ? embedUrl : `${referer}${embedUrl}`;
    console.log(`[VixSRC] Risolvo embed: ${fullUrl}`);

    const response = await axios.get(fullUrl, {
      headers: { ...BROWSER_HEADERS, Referer: referer, Origin: referer },
      timeout: 15000,
    });

    const html = response.data;

    const m3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
    if (m3u8) return m3u8[0];

    const mp4 = html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/);
    if (mp4) return mp4[0];

    const filePattern = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+)"/);
    if (filePattern) return filePattern[1];

    const sourcePattern = html.match(/"source"\s*:\s*"(https?:\/\/[^"]+)"/);
    if (sourcePattern) return sourcePattern[1];

    const srcPattern = html.match(/"src"\s*:\s*"(https?:\/\/[^"]+\.(?:m3u8|mp4)[^"]*)"/);
    if (srcPattern) return srcPattern[1];

    return null;
  } catch (err) {
    console.error(`[VixSRC] Errore resolve: ${err.message}`);
    return null;
  }
}

module.exports = { getVixSRCStreams };
