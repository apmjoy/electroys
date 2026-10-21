/* Personal preferences stay on this device; aggregate interactions use existing GA4. */
(function (root) {
  'use strict';
  const STORAGE_KEY = 'electroys.product-preferences.v1';
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(id);
  function parsePreferences(raw) {
    const result = new Map();
    if (typeof raw !== 'string' || raw.length > 250000) return result;
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return result;
      for (const [id, choice] of Object.entries(data).slice(-5000)) {
        if (validId(id) && ['like', 'dislike'].includes(choice)) result.set(id, choice);
      }
    } catch (_) { /* A damaged preference never prevents shopping. */ }
    return result;
  }
  function createStore(storage) {
    let values = new Map(), persistent = false;
    try {values = parsePreferences(storage?.getItem(STORAGE_KEY)); persistent = !!storage;} catch (_) {}
    return {
      get: id => values.get(id) || '',
      get persistent() {return persistent;},
      reload(raw) {values = parsePreferences(raw);},
      toggle(id, requested) {
        if (!validId(id) || !['like', 'dislike'].includes(requested)) throw new Error('Invalid preference');
        const previous = values.get(id) || '';
        const choice = previous === requested ? '' : requested;
        values.delete(id);
        if (choice) values.set(id, choice);
        while (values.size > 5000) values.delete(values.keys().next().value);
        let serialized=JSON.stringify(Object.fromEntries(values));
        while(serialized.length>250000){values.delete(values.keys().next().value);serialized=JSON.stringify(Object.fromEntries(values));}
        try {
          if (!storage) throw new Error('Storage unavailable');
          storage.setItem(STORAGE_KEY, serialized);
          persistent = true;
        } catch (_) {persistent = false;}
        return {choice, previous, persistent};
      }
    };
  }
  function analyticsAllowed(context) {
    return ['electroys.com', 'www.electroys.com'].includes(context.hostname) && !context.globalPrivacyControl && !['1', 'yes'].includes(String(context.doNotTrack || '').toLowerCase());
  }
  function outboundMetadata(id, href, surface = 'catalog', productName = '') {
    if (!validId(id)) return null;
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || ['electroys.com', 'www.electroys.com', 'localhost'].includes(url.hostname) || /^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.includes(':') || /\.(local|localhost)$/.test(url.hostname)) return null;
      const surfaces=['catalog','all_products','deals','bestsellers','home_deals','amazon_ribbon','quick_look','recommendations','homepage'];
      const params={product_id: id, link_id: id, link_domain: url.hostname, outbound: true, surface: surfaces.includes(surface)?surface:'catalog'};
      if(typeof productName==='string' && productName.trim())params.product_name=productName.trim().slice(0,100);
      return params;
    } catch (_) {return null;}
  }
  function sendEvent(name, params, context, gtag) {
    if (!analyticsAllowed(context) || typeof gtag !== 'function') return false;
    try {gtag('event', name, {...params, send_to: 'G-1H82DFLP86'}); return true;} catch (_) {return false;}
  }
  const api = {STORAGE_KEY, validId, parsePreferences, createStore, analyticsAllowed, outboundMetadata, sendEvent};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  let storage;
  try {storage = root.localStorage;} catch (_) {}
  const store = createStore(storage);
  const context = () => ({hostname: location.hostname, globalPrivacyControl: navigator.globalPrivacyControl, doNotTrack: navigator.doNotTrack || root.doNotTrack});
  const track = (name, params) => sendEvent(name, params, context(), root.gtag);
  const grid = document.getElementById('productGrid');
  const personalControls = grid && document.getElementById('catalogFilters') && !document.body.dataset.collection;
  const text = (tag, className, value) => {const e = document.createElement(tag);e.className=className;e.textContent=value;return e;};
  function paint(group, announcement) {
    const choice = store.get(group.dataset.feedbackId);
    group.querySelectorAll('button').forEach(button => {
      const selected = button.dataset.reaction === choice;
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('span').textContent = selected ? (choice === 'like' ? 'Liked' : 'Disliked') : (button.dataset.reaction === 'like' ? 'Like' : 'Dislike');
    });
    if (announcement) group.querySelector('[role="status"]').textContent = announcement;
  }
  function enhance() {
    if (!personalControls) return;
    grid.querySelectorAll('[data-product-id]').forEach(column => {
      const id = column.dataset.productId;
      if (!validId(id) || column.querySelector('.product-feedback')) return;
      const name = column.querySelector('h3')?.textContent || 'this product';
      const group = document.createElement('div');group.className='product-feedback';group.dataset.feedbackId=id;group.dataset.productName=name;group.setAttribute('role','group');group.setAttribute('aria-label','Your preference for '+name);
      for (const choice of ['like','dislike']) {
        const button = document.createElement('button');button.type='button';button.className='btn btn-outline-primary btn-sm';button.dataset.reaction=choice;button.setAttribute('aria-label',(choice==='like'?'Like ':'Dislike ')+name);
        const icon=document.createElement('i');icon.className='bi bi-hand-thumbs-'+(choice==='like'?'up':'down');icon.setAttribute('aria-hidden','true');button.append(icon,text('span','',choice==='like'?'Like':'Dislike'));group.append(button);
      }
      const status=text('span','visually-hidden','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');group.append(status);
      const action=column.querySelector('.catalog-card-action');if(action)action.before(group);else column.querySelector('article')?.append(group);
      paint(group);
    });
  }
  enhance();
  if (personalControls) {
    new MutationObserver(enhance).observe(grid,{childList:true});
    root.addEventListener('storage',event=>{if(event.key===STORAGE_KEY || event.key===null){store.reload(event.newValue);grid.querySelectorAll('.product-feedback').forEach(g=>paint(g));}});
  }
  document.addEventListener('click',event=>{
    const button=event.target instanceof Element ? event.target.closest('.product-feedback button') : null;
    if (!button || !personalControls || !grid.contains(button)) return;
    const group=button.closest('.product-feedback');
    const result=store.toggle(group.dataset.feedbackId,button.dataset.reaction);
    const announcement=result.choice ? (result.choice==='like'?'Liked. ':'Disliked. ')+(result.persistent?'Saved on this device.':'Saved for this visit only; device storage is unavailable.') : 'Preference cleared.';
    group.querySelector('[role="status"]').className=result.choice && !result.persistent ? 'feedback-storage-note' : 'visually-hidden';
    paint(group,announcement);
    track('product_reaction',{product_id:group.dataset.feedbackId,link_id:group.dataset.feedbackId,product_name:group.dataset.productName.slice(0,100),reaction:result.choice || 'clear',previous_reaction:result.previous || 'none'});
  });
  function outbound(event) {
    if (event.defaultPrevented || event.isTrusted === false || (event.type==='click' && event.button!==0) || (event.type==='auxclick' && event.button!==1)) return;
    const link=event.target instanceof Element ? event.target.closest('a[href]') : null;
    const product=link?.closest('[data-product-id]');
    if (!product) return;
    const section=product.closest('#homeDealsGrid')?'home_deals':product.closest('.amazon-ribbon')?'amazon_ribbon':product.closest('#quickBody')?'quick_look':product.closest('#askResults')?'recommendations':document.body.dataset.collection || (document.getElementById('catalogFilters')?'all_products':'homepage');
    const name=product.dataset.productName || product.querySelector('h3,h5')?.textContent || '';
    const params=outboundMetadata(product.dataset.productId,link.href,section,name);
    if(params)track('product_outbound_click',params);
    // Never prevent navigation or wait for analytics before opening the retailer.
  }
  document.addEventListener('click',outbound);
  document.addEventListener('auxclick',outbound);
})(typeof window !== 'undefined' ? window : globalThis);
