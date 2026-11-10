import type { APIRoute } from 'astro';
import { ageLabel, buyUrl, photoFor, priceFor, primaryInterest, products } from '../lib/products';
import { artUrl } from '../lib/art';

// Compact index for the header search and the saved gift list.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      products.map((p) => ({
        id: p.id,
        t: p.title,
        b: p.brand,
        a: ageLabel(p),
        i: primaryInterest(p).name,
        img: photoFor(p)?.kind === 'brand' ? photoFor(p)!.src.replace('.webp', '-sm.webp') : artUrl(p),
        tl: p.tagline,
        pb: priceFor(p).approx,
        ph: Boolean(photoFor(p)),
        u: buyUrl(p),
        k: `${p.title} ${p.brand} ${p.tagline} ${p.skills.join(' ')} ${p.categories.join(' ')}`.toLowerCase(),
      })),
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
