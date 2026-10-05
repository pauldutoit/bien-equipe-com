// Récupère les URLs « froid » des plans de site (marchands ou sites officiels France des marques).
// Usage : node scripts/fetch-sitemaps.mjs            (toutes les sources)
//         node scripts/fetch-sitemaps.mjs samsung    (une source)
// Écrit data/retail/<source>.txt. Ces listes servent de preuve « vendu en France » dans build-catalog.
import fs from "node:fs";

const SOURCES = {
  samsung: { root: "https://www.samsung.com/fr/sitemap.xml", keep: /\/fr\/(refrigerators|refrigerateurs)\// },
  lg: { root: "https://www.lg.com/fr/sitemap.xml", keep: /\/fr\/(refrigerateurs|refrigerateur|froid)/ },
  beko: { root: "https://www.beko.fr/sitemap.xml", keep: /refrig|froid|combine|congel/ },
  bosch: { root: "https://www.bosch-home.fr/sitemap.xml", keep: /refrig|froid|combine|congel|\/product\/|\/produit/ },
  whirlpool: { root: "https://www.whirlpool.fr/sitemap.xml", keep: /refrig|froid|combine|congel|frigo/ },
  liebherr: { root: "https://www.liebherr.com/sitemap-index.xml", keep: /\/fr-fr\/.*(refrig|froid|combine|congel|frigo)/ },
};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) bien-equipe.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function crawl(name, { root, keep }) {
  const queue = [root];
  const seenMaps = new Set();
  const out = new Set();
  while (queue.length && seenMaps.size < 120) {
    const url = queue.shift();
    if (seenMaps.has(url)) continue;
    seenMaps.add(url);
    const xml = await get(url);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(xml)) {
      // Index : on ne descend que dans les sous-plans plausibles (produits, France).
      for (const l of locs) if (!/image|video|blog|news|article|store|magasin|business|b2b/i.test(l)) queue.push(l);
    } else {
      for (const l of locs) if (keep.test(l.toLowerCase())) out.add(l);
    }
    await sleep(250);
  }
  fs.writeFileSync(`data/retail/${name}.txt`, [...out].join("\n") + "\n");
  console.log(name, ":", out.size, "URLs froid,", seenMaps.size, "plans lus");
}

const only = process.argv[2];
for (const [name, src] of Object.entries(SOURCES)) if (!only || only === name) await crawl(name, src);
