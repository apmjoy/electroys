'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const api=require('../catalog.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'products.json'),'utf8'));
const selection=JSON.parse(fs.readFileSync(path.join(root,'amazon-picks.json'),'utf8'));
assert.equal(selection.kind,'editorial');assert.equal(selection.productIds.length,15);assert.equal(new Set(selection.productIds).size,15);
for(const id of selection.productIds){const p=data[id];assert(p,id);assert(api.isAmazonPick(p),id);const url=new URL(api.amazonDestination(p));assert.equal(url.searchParams.get('tag'),'myelectroys-20');assert(p.image,id+' must have image or illustration');assert(!p.bestSeller,id+' cannot invent rank evidence');}
const books=selection.productIds.filter(id=>id.startsWith('book-'));assert.equal(books.length,6);
assert.equal(new Set(books.map(id=>data[id].isbn)).size,6);
for(const id of books){const p=data[id];assert.equal(p.format,'Paperback');assert.equal(p.relationship,'core');assert.equal(p.productType,'Books & Learning Resources');assert(p.source.startsWith('https://'));assert(p.retailerSource.includes(p.asin));assert(fs.existsSync(path.join(root,p.image)));assert(p.imageAlt.includes('not the book cover'));assert.equal(p.price,'Check current price & availability');assert(p.verification.scope.includes('identity'),id+' needs canonical identity evidence for flyer eligibility');}
assert.equal(api.amazonDestination({url:'https://www.amazon.com.evil.test/dp/B000000001',amazonPick:true}),'');
assert.equal(api.amazonDestination({url:'javascript:alert(1)',amazonPick:true}),'');
assert.equal(api.amazonDestination({url:'https://www.amazon.com/s?k=robot',amazonPick:true}),'');
assert(!api.isAmazonPick({url:'https://www.amazon.com/dp/B000000001'}));
assert.equal(api.amazonDestination(data['snap-junior']),'https://www.amazon.com/dp/B00008BFZH?tag=myelectroys-20');
console.log('15 curated Amazon destinations and six source-backed books validated; no invented rankings/prices.');
