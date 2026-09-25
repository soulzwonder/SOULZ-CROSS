// クロッピーのブラウザ版から利用する品番検索。保存データは受け取らない。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 10000;
const ORIGINS = new Set(['https://soulz-cross.onrender.com', 'https://soulz-cross-app.onrender.com']);
const memo = new Map();
// 現場で確認した品番。外部検索が不安定な時も同じ品番だけを返す。
const VERIFIED_REPEATS = Object.freeze({TH34606: 64.1});

function textOnly(html) {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xff10)).replace(/．/g, '.')
    .replace(/\s+/g, ' ');
}

function candidates(raw, code, officialPage = false) {
  const body = textOnly(raw).toUpperCase();
  if (officialPage) {
    if (!body.includes(code)) return [];
    const vertical = body.match(/リピート[^\d]{0,90}(?:タテ|縦)\s*[:：]?\s*(\d{1,3}(?:\.\d{1,2})?)\s*(CM|㎝|MM)/i);
    if (vertical) {
      const n = Number(vertical[1]) / (vertical[2] === 'MM' ? 10 : 1);
      if (n > 0 && n <= 200) return [Math.round(n * 100) / 100];
    }
  }
  const positions = [];
  let at = -1;
  while ((at = body.indexOf(code, at + 1)) >= 0 && positions.length < 30) positions.push(at);
  const rules = [
    /(?:柄\s*)?リピート[^\d]{0,100}(?:タテ|縦)?\s*[:：]?\s*(\d{1,3}(?:\.\d{1,2})?)\s*(CM|㎝|MM)/gi,
    /(?:タテ|縦)\s*[:：]?\s*(\d{1,3}(?:\.\d{1,2})?)\s*(CM|㎝|MM)[^。]{0,70}リピート/gi
  ];
  const found = [];
  for (const pos of positions) {
    let excerpt = body.slice(pos + code.length, pos + code.length + 260);
    const nextProduct = excerpt.search(/\b[A-Z]{1,4}\d{3,8}\b/);
    if (nextProduct >= 0) excerpt = excerpt.slice(0, nextProduct);
    for (const re of rules) {
      re.lastIndex = 0;
      for (const match of excerpt.matchAll(re)) {
        let value = Number(match[1]);
        if (match[2] === 'MM') value /= 10;
        if (value > 0 && value <= 200) found.push(Math.round(value * 100) / 100);
      }
    }
  }
  return found;
}

async function load(url) {
  const resp = await fetch(url, {signal: AbortSignal.timeout(7500), headers: {'user-agent': 'Mozilla/5.0 (compatible; CROPPY/1.0)', 'accept-language': 'ja-JP,ja;q=0.9'}});
  if (!resp.ok) throw new Error('upstream ' + resp.status);
  const bytes = await resp.arrayBuffer();
  if (bytes.byteLength > 1500000) throw new Error('upstream too large');
  return new TextDecoder('utf-8').decode(bytes);
}

async function findRepeat(code) {
  if (memo.has(code) && Date.now() - memo.get(code).time < 1800000) return memo.get(code).value;
  if (Object.hasOwn(VERIFIED_REPEATS, code)) return {
    ok: true, code, repeatCm: VERIFIED_REPEATS[code],
    sourceName: '確認済みの品番', sourceUrl: 'https://www.sangetsu.co.jp/product/detail/' + encodeURIComponent(code) + '/', confidence: 'verified'
  };
  const official = 'https://www.sangetsu.co.jp/product/detail/' + encodeURIComponent(code) + '/';
  const q = '"' + code + '" 壁紙 リピート タテ cm';
  const sources = [
    {url: official, name: 'サンゲツ', confidence: 'official'},
    {url: 'https://www.bing.com/search?q=' + encodeURIComponent(q) + '&setlang=ja-jp', name: 'Bing検索', confidence: 'search'},
    {url: 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q), name: 'DuckDuckGo検索', confidence: 'search'}
  ];
  let accessible = false;
  let errors = 0;
  for (const source of sources) {
    try {
      const raw = await load(source.url);
      accessible = true;
      const values = candidates(raw, code, source.confidence === 'official');
      if (values.length) {
        const value = {ok: true, code, repeatCm: values[0], sourceName: source.name, sourceUrl: source.url, confidence: source.confidence};
        memo.set(code, {time: Date.now(), value});
        return value;
      }
    } catch (e) { errors++; console.warn('repeat lookup', source.name, String(e)); }
  }
  return {ok: false, code, error: errors ? 'connection_failed' : (accessible ? 'not_found' : 'connection_failed')};
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/health') { res.writeHead(200, {'Content-Type':'text/plain'}); res.end('ok'); return; }
  if (req.method === 'GET' && url.pathname === '/api/repeat') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const code = String(url.searchParams.get('code') || '').toUpperCase();
    if (!/^(?=.*\d)[A-Z0-9-]{4,14}$/.test(code)) { res.writeHead(400); res.end(JSON.stringify({ok:false,error:'invalid_code'})); return; }
    try { res.writeHead(200); res.end(JSON.stringify(await findRepeat(code))); }
    catch (e) { res.writeHead(502); res.end(JSON.stringify({ok:false,code,error:'connection_failed'})); }
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res); return;
  }
  res.writeHead(404);res.end();
});

if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log('CROPPY API listening', PORT));
module.exports = {server, candidates, findRepeat};
