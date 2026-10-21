/* Original editorial picks remain distinct from verified Amazon sales rankings. */
(async function () {
  'use strict';
  const api = window.ElectroysCatalog;
  const deals = document.getElementById('homeDealsGrid');
  const ribbons = [
    [document.getElementById('homeBestSellersGrid'), document.getElementById('homeBestSellersStatus')],
    [document.getElementById('bestSellersRibbon'), document.getElementById('bestSellersRibbonStatus')]
  ].filter(([grid]) => grid);
  if (!api || (!deals && !ribbons.length)) return;
  const dealStatus = document.getElementById('homeDealsStatus');
  const node = (tag, cls, label) => {const n=document.createElement(tag);n.className=cls;if(label!==undefined)n.textContent=label;return n;};
  function card(product, offer, namespace) {
    const result = api.card(product, offer);
    result.classList.remove('product-item');
    result.classList.add('collection-card');
    result.removeAttribute('data-brand');
    result.querySelectorAll('[id]').forEach(el => {el.id = namespace + '-' + el.id;});
    result.querySelectorAll('[aria-labelledby]').forEach(el => {el.setAttribute('aria-labelledby', namespace + '-' + el.getAttribute('aria-labelledby'));});
    return result;
  }
  function makeRibbon(grid, status, products) {
    const selected = products.filter(p => api.isAmazonPick(p) || (api.isBestSeller(p) && api.amazonDestination(p))).sort((a,b) => (a.amazonPickOrder ?? 1000) - (b.amazonPickOrder ?? 1000)).slice(0,15);
    if (status) {status.textContent = selected.length ? '' : 'No curated Amazon picks are available yet. Explore All Products for more ideas.'; status.hidden = selected.length > 0;}
    grid.replaceChildren(...selected.map((p,index) => {
      const result=card({...p,url:api.amazonDestination(p),store:'Amazon'}, undefined, grid.id);
      result.className='collection-card ribbon-card';
      result.setAttribute('role','group');result.setAttribute('aria-roledescription','slide');result.setAttribute('aria-label',`${index+1} of ${selected.length}: ${p.t}`);
      const label=node('span','ribbon-pick-label','Electroys pick');result.querySelector('.catalog-card-body')?.prepend(label);
      return result;
    }));
    grid.className='amazon-ribbon';grid.tabIndex=0;grid.setAttribute('role','region');grid.setAttribute('aria-roledescription','carousel');grid.setAttribute('aria-label','Electroys Amazon picks');grid.setAttribute('aria-live','off');
    if (selected.length<2) return;
    const controls=node('div','ribbon-controls');
    const previous=node('button','btn btn-outline-primary btn-sm','← Previous');
    const next=node('button','btn btn-outline-primary btn-sm','Next →');
    const pause=node('button','btn btn-outline-primary btn-sm','Pause rotation');
    const announcement=node('span','visually-hidden');announcement.setAttribute('aria-live','polite');
    for(const button of [previous,pause,next]){button.type='button';button.setAttribute('aria-controls',grid.id);}
    controls.append(previous,pause,next,announcement);grid.before(controls);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused=motion.matches,hover=false,index=0,visible=false;
    if ('IntersectionObserver' in window) {const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);});observer.observe(grid);} else visible=true;
    function updatePause(){pause.textContent=paused?'Start rotation':'Pause rotation';pause.setAttribute('aria-label',paused?'Start automatic product rotation':'Pause automatic product rotation');}
    function move(delta,manual=false){
      const cards=[...grid.children];
      if(!cards.length)return;
      index=(index+delta+cards.length)%cards.length;
      const left=cards[index].offsetLeft-cards[0].offsetLeft;
      grid.scrollTo({left,behavior:motion.matches?'auto':'smooth'});
      if(manual)announcement.textContent=`Product ${index+1} of ${cards.length}: ${selected[index].t}`;
    }
    previous.addEventListener('click',()=>{paused=true;updatePause();move(-1,true);});
    next.addEventListener('click',()=>{paused=true;updatePause();move(1,true);});
    pause.addEventListener('click',()=>{paused=!paused;updatePause();});
    grid.addEventListener('mouseenter',()=>{hover=true;});grid.addEventListener('mouseleave',()=>{hover=false;});
    grid.addEventListener('focusin',()=>{paused=true;updatePause();});
    grid.addEventListener('pointerdown',()=>{paused=true;updatePause();});
    grid.addEventListener('keydown',event=>{
      if(event.target!==grid)return;
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();paused=true;updatePause();if(event.key==='Home')index=selected.length-1;if(event.key==='End')index=selected.length-2;move(event.key==='ArrowLeft'?-1:1,true);}
    });
    motion.addEventListener?.('change',()=>{if(motion.matches){paused=true;updatePause();}});
    updatePause();
    setInterval(()=>{if(!paused&&!hover&&visible&&!document.hidden&&grid.scrollWidth>grid.clientWidth)move(1);},6000);
  }
  try {
    const results=await Promise.allSettled([fetch('products.json',{cache:'no-cache'}),fetch('offers.json',{cache:'no-cache'})]);
    if(results[0].status!=='fulfilled'||!results[0].value.ok)throw new Error('Catalog unavailable');
    const products=api.normalizeProducts(await results[0].value.json());
    let offers={offers:[]};
    if(results[1].status==='fulfilled'&&results[1].value.ok){try{offers=await results[1].value.json();}catch(_){/* Honest empty offers. */}}
    for(const [grid,status] of ribbons)makeRibbon(grid,status,products);
    function refreshDeals(){
      if(!deals)return;
      const current=Array.isArray(offers?.offers)?offers.offers.filter(offer=>api.isDeal(offer)):[];
      const prices=api.priceMap({offers:current});const chosen=products.filter(p=>prices.has(p.id)).slice(0,6);
      deals.replaceChildren(...chosen.map(p=>card(p,prices.get(p.id),deals.id)));
      if(dealStatus)dealStatus.textContent=chosen.length?'Verified offers. Check conditions and current retailer availability.':'No verified deals right now. Browse All Products for more project ideas.';
    }
    refreshDeals();setInterval(refreshDeals,60000);
  }catch(error){
    console.error('Electroys collections could not load:', error);
    if(dealStatus)dealStatus.textContent='Current deals could not be checked. Open Deals or browse All Products.';
    for(const [,status] of ribbons)if(status){status.hidden=false;status.textContent='Amazon picks could not load. Please browse All Products or reload to try again.';}
  }
})();
