'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.dataset={}; this.textContent=''; }
  append(...items) { this.children.push(...items); }
  setAttribute() {}
}
const context = {URL, URLSearchParams, console, document:{createElement:tag=>new Element(tag),getElementById:()=>null,querySelectorAll:()=>[]},setInterval:()=>{}};
context.window=context;
vm.runInNewContext(fs.readFileSync(require.resolve('../catalog.js'),'utf8'), context);
const card=context.ElectroysCatalog.card({id:'test',t:'Test robot',store:'Example',url:'https://example.com/robot',cat:'Robotics',categories:['Robotics']}, {url:'https://example.com/robot',retailer:'Example',price:123.45,referencePrice:199.99,currency:'USD',checkedAt:'2026-10-25T07:00:00Z',coupon:{percent:25,code:'SAVE'}});
const contents=n=>[n.textContent,...n.children.map(contents)].join(' ');
const rendered=contents(card);
assert(rendered.includes('Check current price & availability'));
for (const forbidden of ['123.45','199.99','Price checked','% off','SAVE','comparison price']) assert(!rendered.includes(forbidden),forbidden);
console.log('Live-offer cards suppress prices, dates, savings and coupon claims.');
