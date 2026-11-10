import type { APIRoute } from 'astro';
import {
  ageLabel, batteriesLabel, buyUrl, GLANCE_LABELS, interestsFor, photoFor, priceFor, products,
} from '../lib/products';
import { artUrl, illustrationUrl } from '../lib/art';

// Everything the compare page needs, one row per product.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      products.map((p) => {
        const price = priceFor(p);
        const photo = photoFor(p);
        return {
          id: p.id,
          title: p.title,
          brand: p.brand,
          img: photo?.kind === 'brand' ? photo.src.replace('.webp', '-sm.webp') : artUrl(p),
          fallback: illustrationUrl(p),
          photo: Boolean(photo),
          price: price.kind === 'band' ? `${p.priceBand} (typical range)` : price.kind === 'amazon' ? `${price.display} on Amazon` : `${price.display} list price`,
          priceAmount: price.amount,
          age: ageLabel(p),
          interests: interestsFor(p).map((i) => i.name).join(', '),
          screen: p.screenFree ? 'Screen-free' : p.requiresDevice ?? 'Needs a device',
          screenFree: p.screenFree,
          batteries: batteriesLabel(p.glance),
          adultHelp: p.glance ? GLANCE_LABELS.adultHelp[p.glance.adultHelp] : 'Varies',
          playStyle: p.glance ? GLANCE_LABELS.playStyle[p.glance.playStyle] : 'Solo or together',
          bestFor: p.glance?.bestFor ?? null,
          inTheBox: p.glance?.inTheBox ?? null,
          skills: p.skills,
          highlights: p.highlights,
          considerations: p.considerations,
          url: buyUrl(p),
          pick: p.editorPick,
        };
      }),
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
