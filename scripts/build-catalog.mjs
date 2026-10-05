// Construit le catalogue réfrigérateurs à partir de :
//  - data/raw/refrigeratingappliances2019/*.json (EPREL, base officielle UE, via fetch-eprel.mjs)
//  - data/retail/*.txt (URLs produits des plans de site de marchands français)
// Un modèle EPREL n'entre au catalogue que s'il est retrouvé chez au moins un marchand
// français (preuve qu'il est vendu en France). Sorties :
//  - src/data/fridges.json      catalogue complet (pages)
//  - public/data/niche.json     index compact pour le calculateur de niche (client)
//  - src/data/market.json       statistiques sur tout le marché EPREL (page État du marché)
import fs from "node:fs";
import path from "node:path";

const RAW = "data/raw/refrigeratingappliances2019";
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- 1. EPREL ----------
let raw = [];
for (const f of fs.readdirSync(RAW)) raw.push(...JSON.parse(fs.readFileSync(path.join(RAW, f), "utf8")));
console.log("EPREL brut :", raw.length);

const isLive = (h) => {
  if (h.status !== "PUBLISHED" || h.blocked) return false;
  if (!h.onMarketEndDate) return true;
  const [y, m, d] = h.onMarketEndDate;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` >= TODAY;
};

const BRANDS = {
  "lg electronics": "LG", lg: "LG", samsung: "Samsung", bosch: "Bosch", siemens: "Siemens", neff: "Neff",
  beko: "Beko", grundig: "Grundig", whirlpool: "Whirlpool", hotpoint: "Hotpoint", indesit: "Indesit",
  bauknecht: "Bauknecht", liebherr: "Liebherr", haier: "Haier", candy: "Candy", hoover: "Hoover",
  hisense: "Hisense", aeg: "AEG", electrolux: "Electrolux", smeg: "Smeg", miele: "Miele", sharp: "Sharp",
  gorenje: "Gorenje", tcl: "TCL", midea: "Midea", "de dietrich": "De Dietrich", sauter: "Sauter",
  brandt: "Brandt", vedette: "Vedette", rosieres: "Rosières", "rosières": "Rosières", faure: "Faure",
  continental: "Continental Edison", "continental edison": "Continental Edison", "listo": "Listo",
  proline: "Proline", valberg: "Valberg", essentielb: "Essentielb", "essentiel b": "Essentielb",
  "signature": "Signature", schneider: "Schneider", amica: "Amica", fagor: "Fagor", thomson: "Thomson",
  daewoo: "Daewoo", "winia": "Winia", "sharp home appliances": "Sharp", "teka": "Teka", "asko": "Asko",
  "fisher & paykel": "Fisher & Paykel", "fisher&paykel": "Fisher & Paykel", "gaggenau": "Gaggenau",
  "kitchenaid": "KitchenAid", "zanussi": "Zanussi", "sogelux": "Sogelux", "bomann": "Bomann",
  "exquisit": "Exquisit", "severin": "Severin", "klarstein": "Klarstein", "cecotec": "Cecotec",
  "philco": "Philco", "oceanic": "Oceanic", "frigelux": "Frigelux", "qilive": "Qilive", "sharp europe": "Sharp",
};
const brandOf = (h) => {
  const k = String(h.supplierOrTrademark || "").trim().toLowerCase();
  if (BRANDS[k]) return BRANDS[k];
  return String(h.supplierOrTrademark || "").trim().replace(/\b([a-z])/g, (m) => m.toUpperCase());
};

// Référence de base : premier jeton du modelIdentifier ("RB34C605CS9/EF" -> RB34C605CS9).
const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const baseRef = (id) => norm(String(id).split(/[\s/]/)[0]);
const looksLikeRef = (t) => t.length >= 6 && /[A-Z]/.test(t) && /[0-9]/.test(t);

// ---------- 2. Marchands ----------
const MERCHANTS = {
  but: { name: "BUT", file: "data/retail/but.txt" },
  conforama: { name: "Conforama", file: "data/retail/conforama.txt" },
  electrodepot: { name: "Electro Dépôt", file: "data/retail/electrodepot.txt" },
  // Sites officiels France des marques : preuve de commercialisation en France, pas des marchands.
  samsung: { name: "Samsung France", file: "data/retail/samsung.txt", official: true },
  lg: { name: "LG France", file: "data/retail/lg.txt", official: true },
  beko: { name: "Beko France", file: "data/retail/beko.txt", official: true },
  bosch: { name: "Bosch France", file: "data/retail/bosch.txt", official: true },
  whirlpool: { name: "Whirlpool France", file: "data/retail/whirlpool.txt", official: true },
  liebherr: { name: "Liebherr France", file: "data/retail/liebherr.txt", official: true },
};
const tokenIndex = new Map(); // jeton -> [{merchant, url, slug}]
for (const [key, m] of Object.entries(MERCHANTS)) {
  if (!fs.existsSync(m.file)) continue;
  for (const url of fs.readFileSync(m.file, "utf8").split(/\r?\n/).filter(Boolean)) {
    const slug = decodeURIComponent(new URL(url).pathname).toLowerCase();
    const toks = new Set(slug.split(/[^a-z0-9]+/i).map(norm).filter(looksLikeRef));
    // Les refs sont parfois coupées par un tiret ("ki51-fade0") : on ajoute les paires.
    const parts = slug.split(/[^a-z0-9]+/i).map(norm);
    for (let i = 0; i < parts.length - 1; i++) {
      const t = parts[i] + parts[i + 1];
      if (looksLikeRef(t) && t.length <= 16) toks.add(t);
    }
    for (const t of toks) {
      if (!tokenIndex.has(t)) tokenIndex.set(t, []);
      tokenIndex.get(t).push({ merchant: key, url, slug });
    }
  }
}

function retailFor(h) {
  const b = baseRef(h.modelIdentifier);
  if (!looksLikeRef(b)) return [];
  const full = norm(h.modelIdentifier.split(" ")[0]); // RB34C605CS9EF
  const hits = [...(tokenIndex.get(b) || []), ...(full !== b ? tokenIndex.get(full) || [] : [])];
  // Préfixe : la fiche marchand peut porter la ref + suffixe couleur/pays (RB34C605CS9EF).
  if (!hits.length && b.length >= 8) {
    for (const [t, list] of tokenIndex) if (t.startsWith(b) && t.length - b.length <= 3) hits.push(...list);
  }
  const seen = new Set();
  return hits.filter((x) => (seen.has(x.url) ? false : seen.add(x.url)));
}

// ---------- 3. Typage ----------
const comps = (h) => (h.compartments || []).map((c) => c.compartmentType);
function typeOf(h, retail) {
  const c = comps(h);
  const w = h.dimensionWidth, ht = h.dimensionHeight;
  const text = retail.map((r) => r.slug).join(" ");
  if (h.applianceType === "WINE_STORAGE" || c.every((x) => x === "WINE_STORAGE")) return "cave";
  if (!c.includes("FRESH_FOOD") && !c.includes("CHILL") && !c.includes("PANTRY") && !c.includes("CELLAR")) return "congelateur";
  const builtIn = h.designType === "BUILT_IN";
  if (builtIn) return ht <= 900 ? "sous-plan" : "encastrable";
  if (w >= 830 || /americain|side-by-side|side-by/.test(text)) return "americain";
  if (/multi-?portes|multiporte|french-door|4-portes|4portes/.test(text)) return "multiportes";
  if (ht <= 900) return "table-top";
  const freezer = c.some((x) => /STAR/.test(x) && x !== "ZERO_STAR") || (h.capFreezeNet || 0) > 0;
  const bigFreezer = (h.capFreezeNet || 0) >= 40;
  if (!bigFreezer) return "une-porte";
  if (/2-portes|congel-en-haut|congelateur-en-haut|double-porte/.test(text)) return "deux-portes";
  if (/combine|congel-en-bas|congelateur-bas/.test(text)) return "combine";
  return ht >= 1500 && freezer ? "combine" : "deux-portes";
}

export const TYPES = {
  combine: "Réfrigérateur combiné",
  "deux-portes": "Réfrigérateur 2 portes",
  "une-porte": "Réfrigérateur 1 porte",
  americain: "Réfrigérateur américain",
  multiportes: "Réfrigérateur multiportes",
  "table-top": "Réfrigérateur table top",
  encastrable: "Réfrigérateur encastrable",
  "sous-plan": "Réfrigérateur sous plan encastrable",
};

// ---------- 4. Notes ----------
const clamp = (x, a = 0, b = 10) => Math.max(a, Math.min(b, x));
const r1 = (x) => Math.round(x * 10) / 10;
const noFrost = (h) => (h.compartments || []).some((c) => /STAR/.test(c.compartmentType) && c.defrostingType === "A");
const fridgeAuto = (h) => (h.compartments || []).some((c) => c.compartmentType === "FRESH_FOOD" && c.defrostingType === "A");
const climate = (h) => ["SN", "N", "ST", "T"].filter((k) => h["climateClass" + k]);

function scores(h) {
  // Efficacité : indice d'efficacité énergétique officiel (EEI, plus bas = mieux).
  const energie = clamp(10 - (h.energyEfficiencyIndex - 35) * 0.08);
  // Silence : niveau sonore en dB(A) déclaré.
  const silence = clamp(10 - (h.noise - 30) * 0.5);
  // Rendement de volume : litres utiles par litre d'encombrement extérieur.
  const ext = (h.dimensionWidth * h.dimensionDepth * h.dimensionHeight) / 1e6; // en litres
  const ratio = h.totalVolume / ext;
  const volume = clamp((ratio - 0.35) / 0.025);
  // Équipements utiles mesurables dans la donnée officielle.
  let eq = 3;
  if (noFrost(h)) eq += 2.5;
  if (fridgeAuto(h)) eq += 0.5;
  if (h.fastFreeze) eq += 1;
  if (comps(h).includes("CHILL")) eq += 1;
  if (comps(h).includes("VARIABLE_TEMP")) eq += 0.5;
  if (h.climateClassT) eq += 1;
  if (h.winterSetting) eq += 0.5;
  if ((h.guaranteeDuration || 24) > 24) eq += 0.5;
  const equipements = clamp(eq);
  const global = energie * 0.35 + silence * 0.2 + volume * 0.2 + equipements * 0.25;
  return { global: r1(global), energie: r1(energie), silence: r1(silence), volume: r1(volume), equipements: r1(equipements), ratio: Math.round(ratio * 100) / 100 };
}

// ---------- 5. Assemblage ----------
const live = raw.filter(isLive);
const byRef = new Map();
for (const h of live) {
  const k = brandOf(h) + "|" + baseRef(h.modelIdentifier);
  const prev = byRef.get(k);
  if (!prev || (h.publishedOnDateTS || 0) > (prev.publishedOnDateTS || 0)) byRef.set(k, h);
}

const slugify = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const products = [];
const usedSlugs = new Set();
for (const h of byRef.values()) {
  const retail = retailFor(h);
  if (!retail.length) continue;
  const type = typeOf(h, retail);
  if (!TYPES[type]) continue; // caves et congélateurs : plus tard
  if (!h.dimensionHeight || !h.dimensionWidth || !h.dimensionDepth || !h.totalVolume || !h.noise) continue;
  const brand = brandOf(h);
  const ref = h.modelIdentifier.split(/[\s]/)[0].replace(/\/.*$/, "");
  let slug = slugify(`${brand}-${ref}`);
  if (usedSlugs.has(slug)) continue;
  usedSlugs.add(slug);
  const s = scores(h);
  products.push({
    id: slug,
    brand,
    ref,
    modelIdentifier: h.modelIdentifier,
    name: `${brand} ${ref}`,
    type,
    typeLabel: TYPES[type],
    eprel: h.eprelRegistrationNumber,
    design: h.designType,
    width: Math.round(h.dimensionWidth / 10 * 10) / 10,
    height: Math.round(h.dimensionHeight / 10 * 10) / 10,
    depth: Math.round(h.dimensionDepth / 10 * 10) / 10,
    totalVolume: h.totalVolume,
    fridgeVolume: h.capRefrNet || 0,
    freezerVolume: h.capFreezeNet || 0,
    energyClass: h.energyClass,
    kwh: h.energyConsAnnualV2 ?? h.energyConsAnnual ?? h.consolidatedEnergyConsAnnual,
    eei: h.energyEfficiencyIndex,
    noise: h.noise,
    noiseClass: h.noiseClass,
    noFrost: noFrost(h),
    fridgeAutoDefrost: fridgeAuto(h),
    fastFreeze: !!h.fastFreeze,
    chill: comps(h).includes("CHILL"),
    variableTemp: comps(h).includes("VARIABLE_TEMP"),
    climate: climate(h),
    minTemp: h.minAmbientTemp,
    maxTemp: h.maxAmbientTemp,
    winterSetting: !!h.winterSetting,
    guarantee: h.guaranteeDuration || null,
    onMarket: (h.onMarketFirstStartDate || h.onMarketStartDate || []).join("-"),
    compartments: (h.compartments || []).map((c) => ({ type: c.compartmentType, volume: c.volume, temp: c.temperature, defrost: c.defrostingType })),
    manufacturerUrl: h.webLinkManufacturer || null,
    scores: s,
    offers: retail.map((r) => ({ merchant: r.merchant, merchantName: MERCHANTS[r.merchant].name, url: r.url, ...(MERCHANTS[r.merchant].official ? { official: true } : {}) })),
  });
}
// Variantes : mêmes cotes, volumes, conso et bruit = même appareil (couleur, charnière…).
// Une seule fiche par appareil, les autres références deviennent des variantes.
const groups = new Map();
for (const p of products) {
  const k = [p.brand, p.type, p.width, p.height, p.depth, p.totalVolume, p.kwh, p.noise].join("|");
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(p);
}
const merged = [];
for (const g of groups.values()) {
  g.sort((a, b) => b.offers.length - a.offers.length || a.ref.length - b.ref.length || a.ref.localeCompare(b.ref));
  const [main, ...rest] = g;
  main.variants = rest.map((v) => ({ ref: v.ref, eprel: v.eprel, offers: v.offers }));
  const seen = new Set(main.offers.map((o) => o.url));
  for (const v of rest) for (const o of v.offers) if (!seen.has(o.url)) { seen.add(o.url); main.offers.push({ ...o, ref: v.ref }); }
  merged.push(main);
}
products.length = 0;
products.push(...merged);
products.sort((a, b) => b.scores.global - a.scores.global);
console.log("Catalogue (vendu en France) :", products.length);
const tc = {};
for (const p of products) tc[p.type] = (tc[p.type] || 0) + 1;
console.log(tc);

fs.mkdirSync("src/data", { recursive: true });
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("src/data/fridges.json", JSON.stringify(products, null, 1));
fs.writeFileSync(
  "public/data/niche.json",
  JSON.stringify(products.map((p) => [p.id, p.name, p.type, p.width, p.height, p.depth, p.totalVolume, p.energyClass, p.kwh, p.noise, p.scores.global, p.design === "BUILT_IN" ? 1 : 0, p.noFrost ? 1 : 0])),
);

// ---------- 6. État du marché (tous les modèles EPREL en vente) ----------
const fr = live.filter((h) => (h.compartments || []).some((c) => c.compartmentType === "FRESH_FOOD") && h.applianceType !== "WINE_STORAGE");
const med = (arr) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const classes = ["A", "B", "C", "D", "E", "F", "G"];
const market = {
  updated: TODAY,
  totalEprel: raw.length,
  liveFridges: fr.length,
  catalog: products.length,
  classShare: Object.fromEntries(classes.map((c) => [c, fr.filter((h) => h.energyClass === c).length])),
  classShareCatalog: Object.fromEntries(classes.map((c) => [c, products.filter((p) => p.energyClass === c).length])),
  medianKwhByClass: Object.fromEntries(classes.map((c) => [c, med(fr.filter((h) => h.energyClass === c).map((h) => h.energyConsAnnualV2 ?? h.energyConsAnnual))])),
  medianNoise: med(fr.map((h) => h.noise)),
  noFrostShare: Math.round((fr.filter(noFrost).length / fr.length) * 100),
  byType: Object.fromEntries(Object.keys(TYPES).map((t) => {
    const ps = products.filter((p) => p.type === t);
    return [t, { count: ps.length, medianKwh: med(ps.map((p) => p.kwh)), medianNoise: med(ps.map((p) => p.noise)), medianVolume: med(ps.map((p) => p.totalVolume)), medianWidth: med(ps.map((p) => p.width)), medianHeight: med(ps.map((p) => p.height)), medianDepth: med(ps.map((p) => p.depth)) }];
  })),
  byBrand: Object.entries(products.reduce((m, p) => ((m[p.brand] ||= []).push(p), m), {}))
    .map(([b, ps]) => ({ brand: b, count: ps.length, medianScore: med(ps.map((p) => p.scores.global)), medianKwh: med(ps.map((p) => p.kwh)), medianNoise: med(ps.map((p) => p.noise)) }))
    .sort((a, b) => b.count - a.count),
};
fs.writeFileSync("src/data/market.json", JSON.stringify(market, null, 1));
console.log("market.json écrit");
