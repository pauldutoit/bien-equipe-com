import fridgesJson from "../data/fridges.json";
import site from "../data/site.config.json";

export interface Offer { merchant: string; merchantName: string; url: string; ref?: string; official?: boolean }
export interface Fridge {
  id: string; brand: string; ref: string; modelIdentifier: string; name: string;
  type: string; typeLabel: string; eprel: string; design: string;
  width: number; height: number; depth: number;
  totalVolume: number; fridgeVolume: number; freezerVolume: number;
  energyClass: string; kwh: number; eei: number; noise: number; noiseClass: string;
  noFrost: boolean; fridgeAutoDefrost: boolean; fastFreeze: boolean; chill: boolean; variableTemp: boolean;
  climate: string[]; minTemp: number; maxTemp: number; winterSetting: boolean; guarantee: number | null;
  onMarket: string; compartments: { type: string; volume: number; temp: number; defrost: string }[];
  manufacturerUrl: string | null;
  scores: { global: number; energie: number; silence: number; volume: number; equipements: number; ratio: number };
  offers: Offer[];
  variants: { ref: string; eprel: string; offers: Offer[] }[];
}

export const fridges = fridgesJson as Fridge[];
export const byId = new Map(fridges.map((f) => [f.id, f]));
export const YEAR = new Date(site.dataUpdated).getFullYear();

export const frDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); };
export const fmt = (n: number, d = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const yearlyCost = (f: Fridge) => f.kwh * site.electricity.price;
export const brandSlug = (b: string) => b.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const dims = (f: Fridge) => `${fmt(f.width, f.width % 1 ? 1 : 0)} × ${fmt(f.height, f.height % 1 ? 1 : 0)} × ${fmt(f.depth, f.depth % 1 ? 1 : 0)} cm`;
export const scoreLabel = (s: number) => (s >= 8 ? "Excellent" : s >= 7 ? "Très bon" : s >= 6 ? "Bon" : s >= 5 ? "Correct" : "Faible");
export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

export const CLIMATE: Record<string, string> = {
  SN: "SN (10 à 32 °C)", N: "N (16 à 32 °C)", ST: "ST (16 à 38 °C)", T: "T (16 à 43 °C)",
};
export const COMPARTMENT: Record<string, string> = {
  FRESH_FOOD: "Réfrigérateur", CHILL: "Zone fraîcheur (0 à 3 °C)", FOUR_STAR: "Congélateur ****",
  THREE_STAR: "Congélateur ***", TWO_STAR: "Compartiment **", TWO_STAR_SECTION: "Section **",
  ONE_STAR: "Compartiment *", ZERO_STAR: "Compartiment à glace", VARIABLE_TEMP: "Compartiment à température variable",
  PANTRY: "Cellier", CELLAR: "Cave", WINE_STORAGE: "Cave à vin",
};

// ---------- Facettes : chaque facette = une page /refrigerateur/{slug}/ ----------
export interface Facet {
  slug: string; group: "Type" | "Largeur" | "Critère";
  h1: string; title: string; short: string; intro: string;
  filter: (f: Fridge) => boolean;
  sort?: (a: Fridge, b: Fridge) => number;
}
const T = (type: string) => (f: Fridge) => f.type === type;

export const FACETS: Facet[] = [
  { slug: "combine", group: "Type", short: "Combiné", h1: `Meilleur réfrigérateur combiné ${YEAR}`, title: `Meilleur réfrigérateur combiné ${YEAR} : classement sur données officielles`,
    intro: "Le combiné place le congélateur en bas, dans des tiroirs. C'est le format le plus vendu en France : 60 cm de large en général, entre 1,75 m et 2,05 m de haut.", filter: T("combine") },
  { slug: "americain", group: "Type", short: "Américain", h1: `Meilleur réfrigérateur américain ${YEAR}`, title: `Meilleur réfrigérateur américain ${YEAR} : notre classement`,
    intro: "Deux portes côte à côte (side-by-side) sur environ 90 cm de large, souvent plus de 500 litres. Vérifiez d'abord la largeur de vos portes : l'appareil doit passer.", filter: T("americain") },
  { slug: "multiportes", group: "Type", short: "Multiportes", h1: `Meilleur réfrigérateur multiportes ${YEAR}`, title: `Meilleur réfrigérateur multiportes ${YEAR}`,
    intro: "Deux portes en haut, tiroirs congélateur en bas : le multiportes donne accès au froid sans tout ouvrir.", filter: T("multiportes") },
  { slug: "deux-portes", group: "Type", short: "2 portes", h1: `Meilleur réfrigérateur 2 portes ${YEAR}`, title: `Meilleur réfrigérateur 2 portes (congélateur en haut) ${YEAR}`,
    intro: "Le congélateur est en haut, derrière sa propre porte. Format souvent moins cher que le combiné à volume égal.", filter: T("deux-portes") },
  { slug: "une-porte", group: "Type", short: "1 porte", h1: `Meilleur réfrigérateur 1 porte ${YEAR}`, title: `Meilleur réfrigérateur 1 porte ${YEAR}`,
    intro: "Un seul grand volume de froid, avec ou sans petit compartiment freezer. Idéal à côté d'un congélateur armoire, ou quand on congèle peu.", filter: T("une-porte") },
  { slug: "table-top", group: "Type", short: "Table top", h1: `Meilleur réfrigérateur table top ${YEAR}`, title: `Meilleur réfrigérateur table top (petit frigo) ${YEAR}`,
    intro: "Environ 85 cm de haut, il se glisse sous un plan de travail sans être encastré : studio, location, appoint.", filter: T("table-top") },
  { slug: "encastrable", group: "Type", short: "Encastrable", h1: `Meilleur réfrigérateur encastrable ${YEAR}`, title: `Meilleur réfrigérateur encastrable ${YEAR} : par hauteur de niche`,
    intro: "Il s'installe dans une colonne de cuisine, derrière une porte de meuble. La hauteur de niche (88, 122, 140, 158, 178 cm…) décide de tout.", filter: T("encastrable") },
  { slug: "sous-plan", group: "Type", short: "Sous plan", h1: `Meilleur réfrigérateur sous plan encastrable ${YEAR}`, title: `Meilleur réfrigérateur sous plan encastrable ${YEAR}`,
    intro: "Encastré sous le plan de travail, dans une niche d'environ 82 cm de haut.", filter: T("sous-plan") },

  { slug: "largeur-55-cm", group: "Largeur", short: "55 cm et moins", h1: "Réfrigérateur de 55 cm de large ou moins", title: `Réfrigérateur étroit (55 cm et moins) : le classement ${YEAR}`,
    intro: "Pour une cuisine étroite ou une niche de 56 cm, ces modèles laissent de la place pour ouvrir la porte.", filter: (f) => f.width <= 55.5 && f.design !== "BUILT_IN", sort: (a, b) => b.scores.global - a.scores.global },
  { slug: "largeur-60-cm", group: "Largeur", short: "60 cm", h1: "Réfrigérateur de 60 cm de large", title: `Réfrigérateur 60 cm de large : les meilleurs modèles ${YEAR}`,
    intro: "La largeur standard des cuisines françaises. Prévoyez 1 à 2 cm de jeu sur les côtés et 5 cm derrière pour la ventilation.", filter: (f) => f.width > 55.5 && f.width <= 61 && f.design !== "BUILT_IN" },
  { slug: "largeur-70-cm", group: "Largeur", short: "70 cm", h1: "Réfrigérateur de 70 cm de large", title: `Réfrigérateur 70 cm de large : plus de volume sans passer à l'américain`,
    intro: "10 cm de plus qu'un modèle standard, environ 80 à 100 litres de gagnés, sans les contraintes d'un américain.", filter: (f) => f.width >= 66 && f.width < 80 && f.design !== "BUILT_IN" },

  { slug: "no-frost", group: "Critère", short: "No Frost", h1: `Meilleur réfrigérateur No Frost ${YEAR}`, title: `Meilleur réfrigérateur No Frost (froid ventilé) ${YEAR}`,
    intro: "Avec le froid ventilé, le congélateur ne se couvre pas de givre : plus de dégivrage à la main. La donnée vient de la fiche officielle (dégivrage automatique du compartiment congélation).", filter: (f) => f.noFrost },
  { slug: "silencieux", group: "Critère", short: "Silencieux", h1: `Réfrigérateur silencieux : les modèles à 35 dB et moins`, title: `Réfrigérateur silencieux ${YEAR} : classement au décibel près`,
    intro: "Dans une cuisine ouverte ou un studio, le bruit compte. Ces modèles déclarent 35 dB(A) ou moins sur leur étiquette énergie.", filter: (f) => f.noise <= 35, sort: (a, b) => a.noise - b.noise || b.scores.global - a.scores.global },
  { slug: "basse-consommation", group: "Critère", short: "Classe A à C", h1: `Réfrigérateur basse consommation (classe A, B ou C)`, title: `Réfrigérateur basse consommation ${YEAR} : classes A, B et C`,
    intro: "Depuis 2021, l'étiquette va de A à G et la plupart des frigos vendus sont en classe E. Les classes A à C consomment nettement moins, à volume égal.", filter: (f) => ["A", "B", "C"].includes(f.energyClass), sort: (a, b) => a.eei - b.eei },
  { slug: "grand-volume", group: "Critère", short: "400 L et plus", h1: `Réfrigérateur grand volume (400 litres et plus)`, title: `Réfrigérateur grand volume (400 L et plus) ${YEAR}`,
    intro: "Pour une famille de 4 personnes et plus, ou si vous faites les courses une fois par semaine.", filter: (f) => f.totalVolume >= 400 },
  { slug: "garage", group: "Critère", short: "Pour garage", h1: "Réfrigérateur pour garage ou cellier non chauffé", title: "Réfrigérateur pour garage : les modèles classe climatique T",
    intro: "Un garage dépasse souvent 32 °C l'été. Seuls les appareils de classe climatique T sont garantis jusqu'à 43 °C ambiant. Attention aussi à la température minimale en hiver.", filter: (f) => f.climate.includes("T") },
  { slug: "zone-fraicheur", group: "Critère", short: "Zone fraîcheur", h1: "Réfrigérateur avec zone fraîcheur (0 à 3 °C)", title: "Réfrigérateur avec zone fraîcheur : viandes et poissons plus longtemps",
    intro: "Un compartiment maintenu autour de 0 °C conserve viandes, poissons et fromages plus longtemps.", filter: (f) => f.chill },
];

export const facetBySlug = new Map(FACETS.map((f) => [f.slug, f]));
export const sortDefault = (a: Fridge, b: Fridge) => b.scores.global - a.scores.global || a.kwh - b.kwh;
export const facetItems = (fc: Facet) => fridges.filter(fc.filter).sort(fc.sort || sortDefault);
export const MIN_INDEX = 6; // en dessous : page en noindex

export const brands = Object.entries(
  fridges.reduce<Record<string, Fridge[]>>((m, f) => ((m[f.brand] ||= []).push(f), m), {}),
)
  .map(([name, items]) => ({ name, slug: brandSlug(name), items: items.sort(sortDefault) }))
  .sort((a, b) => b.items.length - a.items.length);

// Concurrents directs : même type, encombrement et volume proches.
export function rivals(f: Fridge, n = 4): Fridge[] {
  return fridges
    .filter((x) => x.id !== f.id && x.type === f.type)
    .map((x) => ({ x, d: Math.abs(x.totalVolume - f.totalVolume) / 40 + Math.abs(x.width - f.width) / 5 + Math.abs(x.height - f.height) / 15 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((r) => r.x);
}

// Duels publiés : pour chaque modèle du top 12 de son type, ses 2 plus proches rivaux du même top.
export function duels(): [Fridge, Fridge][] {
  const out = new Map<string, [Fridge, Fridge]>();
  const types = [...new Set(fridges.map((f) => f.type))];
  for (const t of types) {
    const top = fridges.filter((f) => f.type === t).sort(sortDefault).slice(0, 12);
    for (const f of top) {
      const near = top
        .filter((x) => x.id !== f.id)
        .map((x) => ({ x, d: Math.abs(x.totalVolume - f.totalVolume) / 40 + Math.abs(x.width - f.width) / 5 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { x } of near) {
        const [a, b] = [f, x].sort((p, q) => p.id.localeCompare(q.id));
        out.set(`${a.id}-vs-${b.id}`, [a, b]);
      }
    }
  }
  return [...out.values()];
}
export const duelSlug = (a: Fridge, b: Fridge) => { const [x, y] = [a, b].sort((p, q) => p.id.localeCompare(q.id)); return `${x.id}-vs-${y.id}`; };
export const duelSet = new Set(duels().map(([a, b]) => duelSlug(a, b)));

// Médianes par type : base de toutes les comparaisons « par rapport aux autres combinés ».
export const typeStats = Object.fromEntries(
  [...new Set(fridges.map((f) => f.type))].map((t) => {
    const ps = fridges.filter((f) => f.type === t);
    return [t, {
      count: ps.length,
      kwh: median(ps.map((f) => f.kwh)),
      noise: median(ps.map((f) => f.noise)),
      volume: median(ps.map((f) => f.totalVolume)),
      ratio: median(ps.map((f) => f.scores.ratio)),
      global: median(ps.map((f) => f.scores.global)),
      rank: (f: Fridge) => [...ps].sort(sortDefault).findIndex((x) => x.id === f.id) + 1,
    }];
  }),
) as Record<string, { count: number; kwh: number; noise: number; volume: number; ratio: number; global: number; rank: (f: Fridge) => number }>;

export const TYPE_PLURAL: Record<string, string> = {
  combine: "combinés", "deux-portes": "réfrigérateurs 2 portes", "une-porte": "réfrigérateurs 1 porte",
  americain: "américains", multiportes: "multiportes", "table-top": "tables top",
  encastrable: "réfrigérateurs encastrables", "sous-plan": "réfrigérateurs sous plan",
};
export const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);
export const TYPES_ORDER = ["combine", "americain", "multiportes", "deux-portes", "une-porte", "table-top", "encastrable", "sous-plan"];
