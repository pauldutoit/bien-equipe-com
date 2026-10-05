import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Avis rédigés à la main : le fichier src/content/avis/{id}.md complète la fiche générée.
// Une fiche produit n'est indexable QUE si elle a un avis rédigé (gate anti contenu mince).
const avis = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/avis" }),
  schema: z.object({
    verdict: z.string(),
    pour: z.array(z.string()).default([]),
    contre: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    indexable: z.boolean().default(true),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    h1: z.string(),
    description: z.string(),
    rubrique: z.string(),
    publishDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    readingMinutes: z.number().optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { avis, guides };
