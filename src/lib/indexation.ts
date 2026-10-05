// Règle d'indexation des fiches et des duels, partagée par les pages et le sitemap.
// Une fiche est indexable si :
//  - elle a un avis rédigé (src/content/avis/{id}.md) dont indexable n'est pas à false, OU
//  - elle est dans le top TOP_PER_TYPE de son type, OU dans le top 3 d'une page de classement.
// Les autres restent en noindex,follow tant qu'elles n'ont pas fait leurs preuves.
import { getCollection } from "astro:content";
import { fridges, FACETS, facetItems, sortDefault } from "./catalog";

export const TOP_PER_TYPE = 20;

const topIds = new Set<string>();
for (const t of new Set(fridges.map((f) => f.type))) {
  fridges.filter((f) => f.type === t).sort(sortDefault).slice(0, TOP_PER_TYPE).forEach((f) => topIds.add(f.id));
}
for (const fc of FACETS) facetItems(fc).slice(0, 3).forEach((f) => topIds.add(f.id));

let cache: Set<string> | null = null;
export async function indexableFiches(): Promise<Set<string>> {
  if (cache) return cache;
  const avis = await getCollection("avis");
  const out = new Set(topIds);
  for (const a of avis) {
    if (a.data.indexable) out.add(a.id);
    else out.delete(a.id);
  }
  cache = out;
  return out;
}
