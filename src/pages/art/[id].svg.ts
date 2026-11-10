import type { APIRoute, GetStaticPaths } from 'astro';
import { products, type Product } from '../../lib/products';
import { productArtSvg } from '../../lib/art';

export const getStaticPaths: GetStaticPaths = () =>
  products.map((p) => ({ params: { id: p.id }, props: { p } }));

export const GET: APIRoute = ({ props }) =>
  new Response(productArtSvg(props.p as Product), { headers: { 'Content-Type': 'image/svg+xml' } });
