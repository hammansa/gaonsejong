const RSSParser = require('rss-parser');
const parser = new RSSParser();
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');

function sanitizeFeedText(text){
  if(!text) return text;
  // Replace bare ampersands not part of an entity with &amp;
  // This helps feeds that include unescaped & which break XML parsing.
  text = text.replace(/&(?![A-Za-z0-9#]+;)/g, '&amp;');

  // Remove or replace common invalid control characters
  text = text.replace(/\x00|\x01|\x02|\x03|\x04|\x05|\x06|\x07|\x08|\x0B|\x0C|\x0E|\x0F/g, '');

  // Normalize BOM if present
  text = text.replace(/^\uFEFF/, '');

  // Fix bare attributes (e.g., <tag attr> -> <tag attr="">) which break XML parsers
  try{
    text = text.replace(/<([a-zA-Z0-9:_-]+)([^>]*)>/g, (m, tag, attrs) => {
      if(!attrs || attrs.indexOf('=') >= 0) return `<${tag}${attrs}>`;
      // replace standalone tokens in attrs with token=""
      const fixed = attrs.replace(/\s+([A-Za-z_:][\w:._-]*)(?=\s|$)/g, ' $1=""');
      return `<${tag}${fixed}>`;
    });
  }catch(e){
    // if regex fails, ignore
  }

  return text;
}

async function fetchFeed(rssUrl) {
  try {
    // Fetch raw text and sanitize before parsing to avoid parser errors
    const resp = await fetch(rssUrl, { timeout: 10000 });
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.text();
    const cleaned = sanitizeFeedText(raw);
    // If the response is HTML or parsing the cleaned text fails, try discovery
    const contentType = (resp.headers && resp.headers.get && resp.headers.get('content-type')) || '';
    // If HTML, try to extract feed links first
    if(/html/i.test(contentType) || /<html/i.test(cleaned.slice(0, 200))){
      const discovered = extractFeedUrlsFromHtml(cleaned, rssUrl);
      for(const f of discovered){
        try{
          const feed = await parser.parseURL(f);
          return { items: feed.items || [], discovered };
        }catch(e){
          // try next discovered URL
        }
      }
      // continue to try parsing as RSS below if discovery didn't work
    }

    try{
      const feed = await parser.parseString(cleaned);
      return { items: feed.items || [], discovered: [] };
    }catch(parseErr){
      // fallback: attempt to extract <item> blocks and build a minimal RSS wrapper
      try{
        const items = [];
        const re = /<item[\s\S]*?<\/item>/gi;
        let m;
        while((m = re.exec(cleaned))){ items.push(m[0]); }
        if(items.length){
          const safe = `<?xml version="1.0" encoding="UTF-8"?><rss><channel>${items.join('')}</channel></rss>`;
          const feed2 = await parser.parseString(safe);
          return { items: feed2.items || [], discovered: [] };
        }
      }catch(e2){
        // fallthrough to error
      }
      throw parseErr;
    }
  } catch (e) {
    console.error('RSS fetch failed', rssUrl, e.message);
    return { items: [], discovered: [] };
  }
}

function extractFeedUrlsFromHtml(html, baseUrl){
  try{
    const $ = cheerio.load(html);
    const urls = [];
    // <link type="application/rss+xml" href="...">
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((i, el) => {
      const href = $(el).attr('href');
      if(href){
        try{ urls.push(new URL(href, baseUrl).toString()); }catch(e){}
      }
    });
    // common anchor patterns
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if(!href) return;
      if(/\b(feed|rss|atom)\b|\.xml$/i.test(href)){
        try{ urls.push(new URL(href, baseUrl).toString()); }catch(e){}
      }
    });
    // de-duplicate and return
    return Array.from(new Set(urls));
  }catch(e){
    return [];
  }
}

module.exports = { fetchFeed };
