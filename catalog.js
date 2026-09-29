/* Edit products.json and run tools/build_catalog.py to update static cards.
   Filter options and counts are derived from the catalog, not hard-coded. */
(async function () {
  document.querySelectorAll('.product-img-wrap img').forEach(img => {
    const fallback = () => {
      const label = document.createElement('span');
      label.className = 'image-fallback';
      label.textContent = img.alt;
      img.replaceWith(label);
    };
    img.addEventListener('error', fallback, {once: true});
    if (img.complete && !img.naturalWidth) fallback();
  });
  const form = document.getElementById('catalogFilters');
  const search = document.getElementById('catalogSearch');
  const category = document.getElementById('categoryFilter');
  const brand = document.getElementById('brandFilter');
  const level = document.getElementById('levelFilter');
  const age = document.getElementById('ageFilter');
  const count = document.getElementById('catalogCount');
  const empty = document.getElementById('catalogEmpty');
  const cards = [...document.querySelectorAll('[data-product-id]')];
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('Catalog unavailable');
    const data = await response.json();
    const entries = cards.map(card => ({card, product: data[card.dataset.productId]}));
    if (entries.some(entry => !entry.product)) throw new Error('Incomplete catalog');
    function options(select, values) {
      [...new Set(values)].sort().forEach(value => select.add(new Option(value, value)));
    }
    options(category, entries.flatMap(({product}) => product.categories));
    options(brand, entries.map(({product}) => product.store));
    options(level, entries.flatMap(({product}) => product.levels));
    const ageBand = guidance => {
      const value = guidance.toLowerCase();
      const grade = value.match(/grades?\s*(\d+)/);
      const match = value.match(/\b(\d{1,2})\s*(?:\+|[–-]|years?)/);
      const start = grade ? Number(grade[1]) + 5 : match ? Number(match[1]) : null;
      if (start === null) return 'Check maker guidance';
      if (start < 6) return '3–5';
      if (start < 8) return '6–7';
      if (start < 11) return '8–10';
      if (start < 14) return '11–13';
      if (start < 18) return '14–17';
      return '18+';
    };
    ['3–5', '6–7', '8–10', '11–13', '14–17', '18+', 'Check maker guidance']
      .filter(band => entries.some(({product}) => ageBand(product.age) === band))
      .forEach(band => age.add(new Option(band, band)));
    const requestedStore = new URLSearchParams(window.location.search).get('store');
    if ([...brand.options].some(option => option.value === requestedStore)) brand.value = requestedStore;
    function filter() {
      const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let visible = 0;
      entries.forEach(({card, product: p}) => {
        const haystack = [p.t, p.store, p.cat, p.age, p.focus, p.learn, p.fit, p.why].join(' ').toLowerCase();
        const match = terms.every(term => haystack.includes(term)) &&
          (!category.value || p.categories.includes(category.value)) &&
          (!brand.value || p.store === brand.value) &&
          (!age.value || ageBand(p.age) === age.value) &&
          (!level.value || p.levels.includes(level.value));
        card.hidden = !match;
        if (match) visible++;
      });
      count.textContent = `Showing ${visible} of ${entries.length} products`;
      empty.hidden = visible !== 0;
    }
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', filter);
    form.addEventListener('change', filter);
    form.addEventListener('reset', () => setTimeout(() => {
      search.value = ''; category.value = ''; brand.value = ''; level.value = ''; age.value = '';
      history.replaceState(null, '', location.pathname);
      filter();
    }, 0));
    filter();
    form.hidden = false;
  } catch (error) {
    // Static cards and product links remain available if catalog data cannot load.
    console.warn('Catalog filters could not load.', error);
  }
})();
