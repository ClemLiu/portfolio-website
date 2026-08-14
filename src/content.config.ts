import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const caseStudies = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/case-studies" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      meta: z.string().optional(),
      mainImage: image(),
      mainImageAlt: z.string(),
      /** dedicated homepage grid thumbnail — distinct from mainImage on the detail page */
      homeImage: image(),
      homeImageAlt: z.string(),
      /** controls homepage grid order, lower first; defaults to alphabetical by slug if omitted */
      order: z.number().optional(),
    }),
});

export const collections = { caseStudies };
