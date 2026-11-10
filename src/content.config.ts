import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updated: z.coerce.date(),
    tone: z.enum(['sun', 'leaf', 'sky', 'grape', 'flame', 'coral', 'rose', 'night']).default('sky'),
    /** Product ids featured at the end of the guide. */
    products: z.array(z.string()).default([]),
  }),
});

export const collections = { guides };
