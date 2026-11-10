import type { APIRoute, GetStaticPaths } from 'astro';
import { products, ageLabel, priceFor, primaryInterest, fitsBand, interestsFor, ranked, type Product } from '../../lib/products';
import { productArtSvg } from '../../lib/art';
import { GIFT_GUIDES, guideProducts } from '../../lib/gifts';
import { AGE_BANDS, INTERESTS } from '../../lib/taxonomy';
import { productOg, collectionOg, readImage } from '../../lib/og';

// Brand photo when we have one (never Amazon images: those may not be stored),
// otherwise the product's own illustration.
const imageFor = (p: Product): Buffer => (p.image && readImage(p.image)) || Buffer.from(productArtSvg(p));
const topFour = (list: Product[]) => [...list.filter((p) => p.image), ...list.filter((p) => !p.image)].slice(0, 4).map(imageFor);

type Spec = { kind: 'product'; p: Product } | { kind: 'collection'; title: string; kicker: string; list: Product[] };

export const getStaticPaths: GetStaticPaths = () => {
  const out: { params: { slug: string }; props: { spec: Spec } }[] = [];
  for (const p of products) out.push({ params: { slug: `products/${p.id}` }, props: { spec: { kind: 'product', p } } });
  for (const g of GIFT_GUIDES) out.push({ params: { slug: `gifts/${g.slug}` }, props: { spec: { kind: 'collection', title: g.title, kicker: 'Electroys gift guide', list: guideProducts(g, products) } } });
  for (const b of AGE_BANDS) out.push({ params: { slug: `shop/${b.slug}` }, props: { spec: { kind: 'collection', title: `Best STEM gifts for ${b.label.toLowerCase()}`, kicker: b.name, list: ranked(products.filter((p) => fitsBand(p, b))) } } });
  for (const i of INTERESTS) out.push({ params: { slug: `shop/${i.slug}` }, props: { spec: { kind: 'collection', title: `${i.name} kits & gifts`, kicker: 'Shop by interest', list: ranked(products.filter((p) => interestsFor(p).some((x) => x.slug === i.slug))) } } });
  return out;
};

export const GET: APIRoute = async ({ props }) => {
  const spec = (props as { spec: Spec }).spec;
  let body: Buffer;
  if (spec.kind === 'product') {
    const p = spec.p;
    const price = priceFor(p);
    body = await productOg({
      title: p.title,
      kicker: `${ageLabel(p)} · ${primaryInterest(p).name.replace(' & Building', '')}`,
      // Only the brand's list price, rounded: Amazon prices must never be baked into cached images.
      price: price.kind === 'list' ? price.approx : null,
      image: imageFor(p),
    });
  } else {
    body = await collectionOg({ title: spec.title, kicker: spec.kicker, count: spec.list.length, images: topFour(spec.list) });
  }
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg' } });
};
