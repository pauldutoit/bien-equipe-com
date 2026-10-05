// Prix saisis par le visiteur (« prix vu en magasin »), gardés dans son navigateur et partagés
// entre la fiche et Ma sélection. Quand des flux de prix marchands seront branchés, ils serviront
// de valeur par défaut ; un prix saisi reste prioritaire.
const KEY = "be-prix";

export function readPrices(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function setPrice(id: string, price: number | null) {
  const all = readPrices();
  if (price && price > 0) all[id] = Math.round(price);
  else delete all[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* stockage indisponible : le calcul marche quand même pour la page en cours */
  }
  document.dispatchEvent(new CustomEvent("prices:change", { detail: all }));
}

export const parsePrice = (v: string) => {
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
};

// Espace fine insécable (U+202F) remplacée : certaines graisses de la police ne l'ont pas.
export const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).replace(/\u202f/g, "\u00a0");
