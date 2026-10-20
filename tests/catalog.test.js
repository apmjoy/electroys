'use strict';
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const C = require('../catalog.js');
const now = Date.parse('2026-10-20T12:00:00Z');
const offer = (id, price = 10, currency = 'USD') => ({productId:id, price, currency, url:'https://retailer.example/item/'+id, retailer:'Example', sourceType:'retailer-feed', verification:'verified', availability:'in_stock', checkedAt:'2026-10-20T11:00:00Z', expiresAt:'2026-10-21T11:00:00Z'});
const fixture = n => Object.fromEntries(Array.from({length:n}, (_,i) => ['item-'+i, {t:'Product '+String(i).padStart(5,'0'),url:'https://retailer.example/item/'+i,store:'Example',cat:'Robotics',categories:['Robotics'],level:'Beginner',levels:['Beginner'],relationship:i%3===0?'general':i%3===1?'support':'core',age:'8+',addedAt:'2026-10-20T00:00:00Z'}]));
const state = query => C.stateFromParams(new URLSearchParams(query));
for (const size of [0,1,24,25,100,500,1000,10000]) {
  const before = performance.now();
  const products = C.normalizeProducts(fixture(size));
  for (const pageSize of [12,24,48,100]) {
    const result = C.selectProducts(products, state(`size=${pageSize}&page=99999`), new Map());
    assert.equal(result.total,size); assert(result.items.length<=pageSize); assert(result.items.length<=100);
    assert.equal(result.page,Math.max(1,Math.ceil(size/pageSize)));
  }
  console.log(`${size} records: normalize + four full-catalog filters ${Math.round((performance.now()-before)*100)/100} ms`);
}
assert.throws(()=>C.normalizeProducts(null)); assert.throws(()=>C.normalizeProducts([]));
assert.equal(C.normalizeProducts({bad:null,missing:{},unsafe:{t:'Unsafe',url:'javascript:alert(1)'}}).length,0);
assert.equal(C.normalizeProducts({safe:{t:'<img onerror=alert(1)>',url:'https://example.com'}})[0].t,'<img onerror=alert(1)>');
for (const url of ['javascript:alert(1)','data:text/html,test','//evil.example','http://example.com','https://user:pass@example.com','https://localhost/test','https://test.local/a','https://example.com:8000','https://exam\nple.com']) assert.equal(C.safeURL(url),'',url);
assert.equal(C.safeURL('assets/../secret',true),''); assert.equal(C.safeURL('assets/test.png',true),'assets/test.png');
assert(C.validOffer(offer('a'),now));
for (const patch of [{price:0},{price:-1},{price:'10'},{price:Infinity},{currency:'XYZ'},{verification:'unknown'},{sourceType:'scrape'},{availability:'unknown'},{checkedAt:'2026-10-20T11:00:00'},{checkedAt:'2026-10-20T12:10:00Z'},{expiresAt:'2026-10-20T12:00:00Z'},{expiresAt:'2026-10-22T12:00:00Z'},{referencePrice:9},{coupon:{type:'clip'}}]) assert(!C.validOffer({...offer('a'),...patch},now),JSON.stringify(patch));
assert(!C.validOffer({...offer('a'),url:'https://www.amazon.com/dp/B000000001'},now));
assert(C.validOffer({...offer('a'),url:'https://www.amazon.com/dp/B000000001',sourceType:'amazon-creators-api'},now));
assert(!C.isDeal({...offer('a'),deal:true},now));
assert(C.isDeal({...offer('a'),deal:true,referencePrice:20},now));
assert(C.isDeal({...offer('a'),deal:true,coupon:{type:'clip',conditions:'Select accounts only',percent:10}},now));
assert(!C.isDeal({...offer('a'),deal:true,coupon:{type:'code',conditions:'Select accounts only'}},now));
const products = C.normalizeProducts(fixture(25));
const offers = {offers:[offer('item-0',5),offer('item-1',10),offer('item-2',25),offer('item-3',2,'GBP'),offer('item-4',9.99)]};
const prices = C.priceMap(offers,now);
assert.deepEqual(C.selectProducts(products,state('budget=5'),prices).items.map(p=>p.id),['item-0']);
assert.deepEqual(C.selectProducts(products,state('budget=10'),prices).items.map(p=>p.id),['item-0','item-4']);
assert.deepEqual(C.selectProducts(products,state('sort=price-asc'),prices).items.slice(0,4).map(p=>p.id),['item-0','item-4','item-1','item-2']);
assert.equal(C.selectProducts(products,state('sort=price-desc'),prices).items[0].id,'item-2');
assert.equal(C.selectProducts(products,state('sort=price-asc&currency=GBP'),prices).items[0].id,'item-3');
assert.equal(C.selectProducts(products,state('q=Product+00024'),prices).items[0].id,'item-24');
assert(C.selectProducts(products,state('relationship=core'),prices).items.every(p=>p.relationship==='core'));
assert(C.selectProducts(products,state('relationship=support'),prices).items.every(p=>p.relationship!=='general'));
assert.equal(C.selectProducts(products,state('q=notfound'),prices).total,0);
assert.equal(C.selectProducts(products,state('category=unknown'),prices).total,0);
assert.equal(state('size=100000&page=-99&sort=bogus&currency=XX').size,24);
assert.equal(state('size=100000&page=-99&sort=bogus').page,1);
assert.equal(state('q='+'x'.repeat(10000)).q.length,200);
assert.equal(C.priceMap({offers:[offer('a',10,'USD'),offer('a',1,'GBP')]},now).get('a').currency,'USD');
assert.equal(C.priceMap({offers:[offer('a',10,'USD'),offer('a',1,'GBP')]},now,'GBP').get('a').currency,'GBP');
assert(!C.isBestSeller({bestSeller:{verified:true,sourceUrl:'https://amazon.com',category:'Robotics',checkedAt:'2026-10-19T10:00:00Z',expiresAt:'2026-10-20T10:00:00Z'}},now));
assert(C.isBestSeller({bestSeller:{verified:true,sourceUrl:'https://amazon.com',category:'Robotics',checkedAt:'2026-10-20T11:00:00Z',expiresAt:'2026-10-21T11:00:00Z'}},now));
console.log('Catalog logic/security tests passed.');

assert.equal(C.priceMap({offers:[null,{},42]},now).size,0);
assert.equal(C.safeURL('https://127.0.0.1/'),'');
assert.deepEqual(C.selectProducts(products,state('budget=25&sort=price-asc&currency=GBP'),prices).items.map(p=>p.id),['item-0','item-4','item-1']);
