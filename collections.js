/* Homepage collections use the same freshness/identity rules as All Products. */
(async function () {
  'use strict';
  const api = window.ElectroysCatalog;
  const deals = document.getElementById('homeDealsGrid');
  const sellers = document.getElementById('homeBestSellersGrid');
  if (!api || !deals || !sellers) return;
  const dealStatus = document.getElementById('homeDealsStatus');
  const sellerStatus = document.getElementById('homeBestSellersStatus');
  function card(product, offer) {
    const node = api.card(product, offer);
    node.classList.remove('product-item'); // Featured-product filters must not hide these collections.
    node.classList.add('collection-card');
    node.removeAttribute('data-brand');
    node.querySelectorAll('[id]').forEach(el => {el.id = 'collection-' + el.id;});
    node.querySelectorAll('[aria-labelledby]').forEach(el => {el.setAttribute('aria-labelledby', 'collection-' + el.getAttribute('aria-labelledby'));});
    return node;
  }
  try {
    const results = await Promise.allSettled([fetch('products.json', {cache: 'no-cache'}), fetch('offers.json', {cache: 'no-cache'})]);
    if (results[0].status !== 'fulfilled' || !results[0].value.ok) throw new Error('Catalog unavailable');
    const products = api.normalizeProducts(await results[0].value.json());
    let offers = {offers: []};
    if (results[1].status === 'fulfilled' && results[1].value.ok) {
      try {offers = await results[1].value.json();} catch (_) { /* No usable offers. */ }
    }
    function refresh() {
      const current = Array.isArray(offers?.offers) ? offers.offers.filter(offer => api.isDeal(offer)) : [];
      const prices = api.priceMap({offers: current});
      const dealProducts = products.filter(p => prices.has(p.id)).slice(0, 6);
      const bestProducts = products.filter(p => api.isBestSeller(p)).slice(0, 6);
      deals.replaceChildren(...dealProducts.map(p => card(p, prices.get(p.id))));
      sellers.replaceChildren(...bestProducts.map(p => card(p)));
      dealStatus.textContent = dealProducts.length ? 'Verified offers. Check conditions and current retailer availability.' : 'No verified deals right now. Browse All Products for more project ideas.';
      sellerStatus.textContent = bestProducts.length ? 'Current category evidence is available for these products.' : 'No current best-seller rankings are verified. Explore Electroys picks for editorial recommendations.';
    }
    refresh();
    setInterval(refresh, 60000);
  } catch (_) {
    dealStatus.textContent = 'Current deals could not be checked. Open Deals or browse All Products.';
    sellerStatus.textContent = 'Current rankings could not be checked. Explore Electroys picks for editorial recommendations.';
  }
})();
