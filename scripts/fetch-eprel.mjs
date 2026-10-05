// Aspire une famille de produits EPREL (base publique UE des étiquettes énergie).
// Usage : node scripts/fetch-eprel.mjs refrigeratingappliances2019
// Écrit data/raw/<groupe>/page-<n>.json ; reprend là où il s'est arrêté.
import fs from 'node:fs';
import path from 'node:path';

const group = process.argv[2] || 'refrigeratingappliances2019';
const LIMIT = 100;
const dir = path.join('data', 'raw', group);
fs.mkdirSync(dir, { recursive: true });

const base = 'https://eprel.ec.europa.eu/api/products/' + group;
const headers = {
  'User-Agent': 'Mozilla/5.0 (bien-equipe.com data import)',
  Referer: 'https://eprel.ec.europa.eu/screen/product/' + group,
  Accept: 'application/json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(page) {
  const url = base + '?_page=' + page + '&_limit=' + LIMIT + '&sort0=onMarketStartDateTS&order0=DESC';
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    console.error('page', page, 'HTTP', res.status, 'retry', i + 1);
    await sleep(3000 * (i + 1));
  }
  throw new Error('page ' + page + ' failed');
}

const first = await get(1);
const pages = Math.ceil(first.size / LIMIT);
console.log(group, first.size, 'produits,', pages, 'pages');
fs.writeFileSync(path.join(dir, 'page-1.json'), JSON.stringify(first.hits));
for (let p = 2; p <= pages; p++) {
  const f = path.join(dir, 'page-' + p + '.json');
  if (fs.existsSync(f)) continue;
  const data = await get(p);
  fs.writeFileSync(f, JSON.stringify(data.hits));
  if (p % 50 === 0) console.log('page', p, '/', pages);
  await sleep(400);
}
console.log('terminé');
