/* Shared catalog logic: browser enhancement plus dependency-free Node tests. */
(function (root) {
  'use strict';
  const PAGE_SIZES = [12, 24, 48, 100];
  const SORTS = ['recommended', 'newest', 'price-asc', 'price-desc', 'name'];
  const SOURCES = ['amazon-creators-api', 'retailer-api', 'retailer-feed'];
  const text = value => typeof value === 'string' ? value : '';
  function safeURL(value, image = false) {
    if (typeof value !== 'string' || !value.trim() || /[\x00-\x20]/.test(value)) return '';
    if (image && /^assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return value;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && url.hostname !== 'localhost' && !/\.(local|localhost)$/.test(url.hostname) && !/^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) && !url.hostname.includes(':') ? url.href : '';
    } catch (_) { return ''; }
  }
  function ageBand(guidance) {
    const value = text(guidance).toLowerCase();
    const grade = value.match(/grades?\s*(\d+)/);
    const match = value.match(/\b(\d{1,2})\s*(?:\+|[–-]|years?)/);
    const start = grade ? Number(grade[1]) + 5 : match ? Number(match[1]) : null;
    return start === null ? 'Check maker guidance' : start < 6 ? '3–5' : start < 8 ? '6–7' : start < 11 ? '8–10' : start < 14 ? '11–13' : start < 18 ? '14–17' : '18+';
  }
  function normalizeProducts(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid catalog format');
    return Object.entries(data).flatMap(([id, p], index) => {
      if (!p || typeof p !== 'object' || !text(p.t).trim() || !safeURL(p.url) || p.status === 'archived' || p.status === 'draft') return [];
      return [{...p, id, index, t: p.t, url: safeURL(p.url), store: text(p.store) || 'Retailer', image: safeURL(p.image, true), categories: Array.isArray(p.categories) ? p.categories.filter(x => typeof x === 'string') : [text(p.cat)].filter(Boolean), levels: Array.isArray(p.levels) ? p.levels.filter(x => typeof x === 'string') : [text(p.level)].filter(Boolean), relationship: ['core', 'support', 'general'].includes(p.relationship) ? p.relationship : 'core'}];
    });
  }
  function validOffer(offer, now = Date.now()) {
    if (!offer || offer.verification !== 'verified' || offer.availability !== 'in_stock' || !SOURCES.includes(offer.sourceType) || !['USD', 'GBP', 'EUR'].includes(offer.currency) || typeof offer.price !== 'number' || !Number.isFinite(offer.price) || offer.price <= 0 || !safeURL(offer.url)) return false;
    if (![offer.checkedAt, offer.expiresAt].every(value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))) return false;
    const checked = Date.parse(offer.checkedAt), expiry = Date.parse(offer.expiresAt);
    if (!Number.isFinite(checked) || checked > now + 300000 || now - checked >= 86400000 || !Number.isFinite(expiry) || expiry <= now || expiry <= checked || expiry > checked + 86400000) return false;
    const host = new URL(offer.url).hostname;
    if ((/amazon\./i.test(host) || /amzn\./i.test(host) || /amazon/i.test(text(offer.retailer))) && offer.sourceType !== 'amazon-creators-api') return false;
    if (offer.referencePrice !== undefined && (typeof offer.referencePrice !== 'number' || !Number.isFinite(offer.referencePrice) || offer.referencePrice <= offer.price)) return false;
    if (offer.coupon !== undefined && !validCoupon(offer.coupon, now)) return false;
    return true;
  }
  function validCoupon(coupon, now = Date.now()) {
    if (!coupon || typeof coupon !== 'object' || !['clip', 'code'].includes(coupon.type) || !text(coupon.conditions).trim()) return false;
    if (coupon.type === 'code' && !text(coupon.code).trim()) return false;
    if (coupon.percent !== undefined && (typeof coupon.percent !== 'number' || !Number.isFinite(coupon.percent) || coupon.percent <= 0 || coupon.percent > 100)) return false;
    if (coupon.amount !== undefined && (typeof coupon.amount !== 'number' || !Number.isFinite(coupon.amount) || coupon.amount <= 0)) return false;
    if (coupon.expiresAt && (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(coupon.expiresAt) || !Number.isFinite(Date.parse(coupon.expiresAt)) || Date.parse(coupon.expiresAt) <= now)) return false;
    return true;
  }
  function isDeal(offer, now = Date.now()) {
    return validOffer(offer, now) && offer.deal === true && (offer.referencePrice > offer.price || (offer.coupon && validCoupon(offer.coupon, now)));
  }
  function isBestSeller(product, now = Date.now()) {
    const evidence = product.bestSeller;
    if (!evidence || evidence.verified !== true || !safeURL(evidence.sourceUrl) || !text(evidence.category).trim()) return false;
    if (![evidence.checkedAt, evidence.expiresAt].every(value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))) return false;
    const checked = Date.parse(evidence.checkedAt), expires = Date.parse(evidence.expiresAt);
    return Number.isFinite(checked) && checked <= now + 300000 && now - checked < 86400000 && expires > now && expires > checked && expires <= checked + 86400000;
  }
  function priceMap(data, now = Date.now(), currency = 'USD') {
    const prices = new Map();
    for (const offer of (data && Array.isArray(data.offers) ? data.offers : [])) {
      if (!validOffer(offer, now) || typeof offer.productId !== 'string') continue;
      const previous = prices.get(offer.productId);
      if ( (!previous || (offer.currency === currency && previous.currency !== currency) || (offer.currency === previous.currency && offer.price < previous.price))) prices.set(offer.productId, offer);
    }
    return prices;
  }
  function stateFromParams(params, initialPage = 1) {
    const size = Number(params.get('size'));
    const page = Number(params.get('page') || initialPage);
    return {currency: ['USD', 'GBP', 'EUR'].includes(params.get('currency')) ? params.get('currency') : 'USD', q: (params.get('q') || '').slice(0, 200), category: params.get('category') || '', store: params.get('store') || '', level: params.get('level') || '', age: params.get('age') || '', type: params.get('type') || '', relationship: ['core', 'support', 'all'].includes(params.get('relationship')) ? params.get('relationship') : 'all', budget: ['5', '10', '25', '50', '100'].includes(params.get('budget')) ? params.get('budget') : '', sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'recommended', size: PAGE_SIZES.includes(size) ? size : 24, page: Number.isSafeInteger(page) && page > 0 ? page : 1};
  }
  function selectProducts(products, state, prices) {
    const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const selected = products.filter(p => {
      const haystack = [p.t, p.store, p.cat, p.age, p.focus, p.learn, p.fit, p.why, p.productType].join(' ').toLowerCase();
      const offer = prices.get(p.id);
      const price = offer?.currency === 'USD' ? offer.price : undefined;
      return terms.every(term => haystack.includes(term)) && (!state.category || p.categories.includes(state.category)) && (!state.store || (p.store === state.store || p.brand === state.store)) && (!state.level || p.levels.includes(state.level)) && (!state.age || ageBand(p.age) === state.age) && (!state.type || p.productType === state.type) && (state.relationship === 'all' || (state.relationship === 'core' ? p.relationship === 'core' : p.relationship !== 'general')) && (!state.budget || (price !== undefined && (state.budget === '5' ? price <= 5 : price < Number(state.budget))));
    });
    selected.sort((a, b) => {
      let diff = 0;
      if (state.sort.startsWith('price-')) {
        const ao = prices.get(a.id), bo = prices.get(b.id);
        const ap = ao?.currency === (state.budget ? 'USD' : state.currency) ? ao.price : undefined, bp = bo?.currency === (state.budget ? 'USD' : state.currency) ? bo.price : undefined;
        if (ap === undefined || bp === undefined) diff = ap === undefined && bp === undefined ? 0 : ap === undefined ? 1 : -1;
        else diff = state.sort === 'price-asc' ? ap - bp : bp - ap;
      } else if (state.sort === 'name') diff = a.t.localeCompare(b.t);
      else if (state.sort === 'newest') diff = (Date.parse(b.addedAt) || 0) - (Date.parse(a.addedAt) || 0);
      else diff = (Number.isFinite(a.editorialRank) ? a.editorialRank : a.index) - (Number.isFinite(b.editorialRank) ? b.editorialRank : b.index);
      return diff || a.index - b.index;
    });
    const pages = Math.max(1, Math.ceil(selected.length / state.size));
    const page = Math.min(Math.max(1, state.page), pages);
    return {items: selected.slice((page - 1) * state.size, page * state.size), total: selected.length, page, pages};
  }
  const api = {PAGE_SIZES, safeURL, ageBand, normalizeProducts, validOffer, validCoupon, isDeal, isBestSeller, priceMap, stateFromParams, selectProducts};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  root.ElectroysCatalog = api;
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = text(content);
    return node;
  }
  const fallback = label => el('span', 'image-fallback', label);
  function fixImage(img) {
    img.addEventListener('error', () => img.replaceWith(fallback(img.alt)), {once: true});
    if (img.complete && !img.naturalWidth) img.replaceWith(fallback(img.alt));
  }
  function card(p, offer) {
    const column = el('div', 'col-xl-3 col-lg-4 col-md-6 product-item');
    column.dataset.productId = p.id;
    const article = el('article', 'product-card h-100');
    const photo = el('div', 'product-img-wrap');
    if (p.image) {
      const img = document.createElement('img'); img.alt = p.t; img.loading = 'lazy'; img.decoding = 'async'; img.src = p.image; photo.append(img); fixImage(img);
    } else photo.append(fallback(p.t));
    const body = el('div', 'p-4 catalog-card-body');
    body.append(el('span', 'product-kicker', p.cat || p.categories[0] || 'Explore'), el('h3', '', p.t), el('p', 'catalog-store', p.store), el('p', 'product-copy', p.why));
    if (p.verification?.status === 'unavailable') body.append(el('p','small text-secondary','Currently unavailable at the last retailer check.'));
    const facts = el('div', 'product-facts');
    facts.append(el('span', '', 'Age / audience: ' + (p.age || 'Check maker guidance')), el('span', '', 'Level: ' + (p.level || 'Check product details')));
    body.append(facts);
    const details = el('details', 'product-details mt-3');
    details.append(el('summary', '', 'What you’ll learn'), el('p', 'small mt-2', p.learn), el('p', 'small text-secondary', p.consider)); body.append(details);
    const action = el('div', 'catalog-card-action');
    action.append(el('p', 'product-price', offer ? new Intl.NumberFormat('en-US', {style: 'currency', currency: offer.currency}).format(offer.price) : 'Check current price & availability'));
    if (offer && offer.variant && offer.variant !== 'Default Title') action.append(el('p', 'small', 'Selected option: ' + offer.variant));
    if (offer && isDeal(offer)) {
      if (offer.referencePrice > offer.price) action.append(el('p', 'small', 'Retailer comparison price: ' + new Intl.NumberFormat('en-US', {style: 'currency', currency: offer.currency}).format(offer.referencePrice)));
      if (offer.coupon) {
        const coupon = offer.coupon;
        action.append(el('p', 'small', (coupon.type === 'clip' ? 'Clip coupon at retailer' : 'Code: ' + coupon.code) + (coupon.percent ? ' — ' + coupon.percent + '% off' : coupon.amount ? ' — ' + new Intl.NumberFormat('en-US', {style: 'currency', currency: offer.currency}).format(coupon.amount) + ' off' : '') + '. ' + coupon.conditions));
      }
    }
    const destination = offer ? offer.url : p.url;
    const link = el('a', 'btn btn-primary btn-sm', 'View at ' + (offer ? offer.retailer : p.store));
    link.href = destination; link.target = '_blank'; link.rel = 'sponsored nofollow noopener noreferrer';
    link.setAttribute('aria-label', 'View ' + p.t + ' at ' + (offer ? offer.retailer : p.store)); action.append(link);
    if (/amazon\.|amzn\./i.test(destination)) action.append(el('small', 'd-block mt-2', 'Amazon paid link'));
    if (offer) {
      action.append(el('small', 'd-block mt-2', 'Price checked ' + new Date(offer.checkedAt).toLocaleString('en-US', {timeZoneName: 'short'})));
      const note = el('details', 'product-details mt-2');
      note.append(el('summary', '', 'Price details'), el('p', 'small', 'Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on the retailer’s site at the time of purchase will apply to the purchase of this product. Prices exclude shipping and tax; conditional coupons are not deducted.'));
      action.append(note);
    }
    body.append(action); article.append(photo, body); column.append(article); return column;
  }
  api.card = card;
  async function start() {
    const form = document.getElementById('catalogFilters'), toggle = document.getElementById('catalogFiltersToggle');
    if (!form || !toggle) return;
    document.querySelectorAll('.product-img-wrap img').forEach(fixImage);
    const count = document.getElementById('catalogCount'), grid = document.getElementById('productGrid'), empty = document.getElementById('catalogEmpty'), notice = document.getElementById('catalogNotice'), pagination = document.getElementById('catalogPagination');
    const controls = {q: 'catalogSearch', category: 'categoryFilter', store: 'brandFilter', level: 'levelFilter', age: 'ageFilter', type: 'typeFilter', relationship: 'relationshipFilter', budget: 'budgetFilter', sort: 'catalogSort', size: 'catalogPageSize', currency: 'currencyFilter'};
    let state = stateFromParams(new URLSearchParams(location.search), Number(document.body.dataset.catalogPage) || 1);
    toggle.addEventListener('click', () => {form.hidden = !form.hidden; toggle.setAttribute('aria-expanded', String(!form.hidden));});
    try {
      const response = await fetch('products.json', {cache: 'no-cache'});
      if (!response.ok) throw new Error('Catalog unavailable');
      const raw = await response.json(), products = normalizeProducts(raw);
      if (Object.keys(raw).length && !products.length) throw new Error('No valid catalog records');
      let offerData = {offers: []};
      try {const offersResponse = await fetch('offers.json', {cache: 'no-cache'}); if (offersResponse.ok) offerData = await offersResponse.json();} catch (_) { /* Prices remain unavailable; catalog still works. */ }
      const options = (id, values) => [...new Set(values.filter(x => typeof x === 'string' && x))].sort().forEach(value => document.getElementById(id).add(new Option(value, value)));
      options('categoryFilter', products.flatMap(p => p.categories)); options('brandFilter', products.flatMap(p => [p.store, p.brand])); options('levelFilter', products.flatMap(p => p.levels)); options('ageFilter', products.map(p => ageBand(p.age))); options('typeFilter', products.map(p => p.productType));
      function applyControls() {
        for (const [key, id] of Object.entries(controls)) {
          const control = document.getElementById(id);
          control.value = String(state[key]);
          if (control.tagName === 'SELECT' && control.selectedIndex < 0) {if (['store','category','type','age','level'].includes(key) && String(state[key]).length <= 100) {control.add(new Option(String(state[key]) + ' (no current listings)', String(state[key]))); control.value = String(state[key]);} else {control.selectedIndex = 0; state[key] = control.value;}}
        }
      }
      applyControls();
      function syncURL(push = false) {
        const params = new URLSearchParams();
        for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {const value = new URLSearchParams(location.search).get(key); if (value) params.set(key, value.slice(0, 200));}
        const defaults = {currency: 'USD', relationship: 'all', sort: 'recommended', size: 24, page: 1};
        for (const [key, value] of Object.entries(state)) if (value !== '' && value !== defaults[key]) params.set(key, String(value));
        const base = location.pathname.replace(/products-page-\d+\.html$/, 'products.html');
        const destination = base + (params.size ? '?' + params.toString() : '') + location.hash;
        if (push && destination !== location.pathname + location.search + location.hash) history.pushState(null, '', destination);
        else history.replaceState(null, '', destination);
      }
      function render(updateURL = true, push = false) {
        const collection = document.body.dataset.collection;
        const scopedOffers = collection === 'deals' ? {offers: (Array.isArray(offerData?.offers) ? offerData.offers : []).filter(offer => isDeal(offer))} : offerData;
        const prices = priceMap(scopedOffers, Date.now(), state.budget ? 'USD' : state.currency);
        const eligible = collection === 'deals' ? products.filter(p => prices.has(p.id)) : collection === 'bestsellers' ? products.filter(p => isBestSeller(p)) : products;
        const result = selectProducts(eligible, state, prices); state.page = result.page;
        grid.replaceChildren(...result.items.map(p => card(p, prices.get(p.id))));
        count.textContent = result.total ? `Showing ${(result.page - 1) * state.size + 1}–${Math.min(result.page * state.size, result.total)} of ${result.total} products` + (result.total !== products.length ? ` (${products.length} in the full catalog)` : '') : `Showing 0 of ${products.length} products`;
        empty.hidden = result.total !== 0;
        empty.querySelector('h3').textContent = collection === 'deals' && !eligible.length ? 'No verified deals right now.' : collection === 'bestsellers' && !eligible.length ? 'Best sellers are being verified.' : products.length ? 'No products match these filters.' : 'New discoveries are on their way.';
        empty.querySelector('p').textContent = collection && !eligible.length ? 'We only show current, verified listings here. Explore the full product catalog for more ideas.' : products.length ? 'Try another search or clear the filters to see the full collection.' : 'There are no published products in this collection yet. Please check back soon.';
        notice.hidden = true;
        if (state.budget && !prices.size) {notice.textContent = 'No current verified prices are available. Clear the budget filter to browse products and check prices at the retailer.'; notice.hidden = false;}
        pagination.replaceChildren();
        const pageButton = (label, page, disabled, current = false) => {
          const button = el('button', 'btn btn-outline-primary btn-sm', String(label)); button.type = 'button'; button.disabled = disabled;
          if (current) button.setAttribute('aria-current', 'page');
          button.setAttribute('aria-label', typeof label === 'number' ? 'Page ' + label : label + ' page');
          button.addEventListener('click', () => {state.page = page; render(true, true); document.getElementById('catalog-title').scrollIntoView({block: 'start'});}); pagination.append(button);
        };
        if (result.pages > 1) {
          pageButton('Previous', result.page - 1, result.page === 1);
          const pages = [...new Set([1, result.page - 1, result.page, result.page + 1, result.pages].filter(n => n >= 1 && n <= result.pages))].sort((a,b) => a-b);
          let previous = 0;
          for (const page of pages) {if (previous && page - previous > 1) pagination.append(el('span', 'pagination-gap', '…')); pageButton(page, page, page === result.page, page === result.page); previous = page;}
          pageButton('Next', result.page + 1, result.page === result.pages);
        }
        if (updateURL) syncURL(push);
      }
      form.addEventListener('submit', event => event.preventDefault());
      function changed(event) {for (const [key, id] of Object.entries(controls)) state[key] = document.getElementById(id).value; if (state.budget) {state.currency = 'USD'; document.getElementById('currencyFilter').value = 'USD';} state.size = Number(state.size); state.page = 1; render(true, event?.type !== 'input');}
      for (const id of Object.values(controls)) document.getElementById(id).addEventListener(id === 'catalogSearch' ? 'input' : 'change', changed);
      form.addEventListener('reset', event => {event.preventDefault(); state = stateFromParams(new URLSearchParams()); applyControls(); render(true, true);});
      document.getElementById('catalogEmptyReset').addEventListener('click', () => form.reset());
      window.addEventListener('popstate', () => {state = stateFromParams(new URLSearchParams(location.search)); applyControls(); render(false);});
      document.getElementById('catalogControls').hidden = false; toggle.hidden = false; form.hidden = false; toggle.setAttribute('aria-expanded', 'true');
      document.getElementById('catalogStaticPagination')?.setAttribute('hidden', '');
      render();
      // Reevaluate offer freshness on an open tab as well as on each user action.
      setInterval(() => render(false), 60000);
    } catch (_) {
      notice.textContent = 'Live filters could not load. You can still browse the saved collection below and use the page links. Please reload to try again.'; notice.hidden = false;
      count.textContent = 'Showing the saved catalog page';
    }
  }
  start();
})(typeof window !== 'undefined' ? window : globalThis);
