import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import site from "../data/site.config.json";
import { FACETS, facetItems, brands, duels, duelSlug, MIN_INDEX } from "../lib/catalog";
import { indexableFiches } from "../lib/indexation";

// Le sitemap ne liste QUE les pages indexables (mêmes règles que les balises robots).
export const GET: APIRoute = async ({ site: s }) => {
  const base = (s?.toString() ?? `https://${site.domain}/`).replace(/\/$/, "");
  const lastmod = site.dataUpdated;
  const avis = await getCollection("avis");
  const avisDate = new Map(avis.map((a) => [a.id, a.data.updated.toISOString().slice(0, 10)]));
  const fiches = await indexableFiches();
  const guides = (await getCollection("guides")).filter((g) => !g.data.draft);

  const urls: { loc: string; lastmod?: string }[] = [
    "/", "/refrigerateur/", "/marques/", "/comparatif/", "/guides/", "/etat-du-marche/",
    "/outils/quel-frigo-rentre/", "/outils/cout-electricite-frigo/",
    "/methodologie/", "/transparence/", "/qui-sommes-nous/", "/contact/",
  ].map((p) => ({ loc: p, lastmod }));
  for (const fc of FACETS) if (facetItems(fc).length >= MIN_INDEX) urls.push({ loc: `/refrigerateur/${fc.slug}/`, lastmod });
  for (const b of brands) if (b.items.length >= MIN_INDEX) urls.push({ loc: `/marques/${b.slug}/`, lastmod });
  for (const id of fiches) urls.push({ loc: `/avis/${id}/`, lastmod: avisDate.get(id) ?? lastmod });
  for (const [a, b] of duels()) if (fiches.has(a.id) && fiches.has(b.id)) urls.push({ loc: `/comparatif/${duelSlug(a, b)}/`, lastmod });
  for (const g of guides) urls.push({ loc: `/guides/${g.id}/`, lastmod: (g.data.updated ?? g.data.publishDate).toISOString().slice(0, 10) });

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
