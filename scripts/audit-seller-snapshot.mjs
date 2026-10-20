// Usage: node scripts/audit-seller-snapshot.mjs /path/to/exported-protected-seller.html
// Audits the actual exported function body, never a reimplementation of its formula.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const path=process.argv[2];
if(!path)throw Error('Export the live protected seller HTML snapshot and pass its path');
const html=fs.readFileSync(path,'utf8');
const start=html.indexOf('function getTransfer(price){'),end=html.indexOf('function addText(',start);
if(start<0||end<0)throw Error('Snapshot contract changed; review before auditing');
const source=html.slice(start,end);
function calc({state='KY',price=200000,...patch}={}){
 const fields={county:'Jefferson',propertyType:'single',assumed:0,ilRetainedMortgage:0,mortgage1:100000,mortgage2:20000,hasSecondMortgage:false,
  otherDebt:0,listingPct:3,buyerAgentPct:2,creditPct:1,creditDollar:1000,settlement:500,admin:100,propertyTax:200,
  recording:50,misc:150,localTax:20,stateTaxOverride:'',isExempt:false,sellerShare:100,...patch};
 const ctx={state:{value:state},$:(id)=>({value:String(fields[id]??''),checked:!!fields[id]}),n:id=>Math.max(0,Number(fields[id]??0))};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.price=price;
 return vm.runInContext('calc(price)',ctx);
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,a+' != '+b);
near(calc().net,85780);near(calc().fees,14220);near(calc().tax.sellerTax,200);
near(calc({hasSecondMortgage:true}).net,65780);
near(calc({mortgage1:0}).net,185780);
near(calc({mortgage1:300000}).net,-114220);
near(calc({price:0}).net,-102020);
near(calc({price:500.01}).tax.sellerTax,1);
near(calc({stateTaxOverride:1000,sellerShare:50}).tax.sellerTax,500);
near(calc({isExempt:true}).tax.sellerTax,0);
assert.equal(calc({state:'CA'}).tax.known,false);
assert.equal(calc({state:'CA'}).tax.sellerTax,null);
near(calc({state:'FL',county:'Orange'}).tax.sellerTax,1400);
near(calc({state:'FL',county:'Miami-Dade'}).tax.sellerTax,1200);
near(calc({state:'FL',county:'Miami-Dade',propertyType:'multi'}).tax.sellerTax,2100);
near(calc({state:'TX'}).tax.sellerTax,0);
near(calc({state:'IL'}).tax.sellerTax,200);
if(html.includes('id="ilRetainedMortgage"')){
 near(calc({state:'IL',ilRetainedMortgage:150000}).tax.basis,50000);
 near(calc({state:'IL',ilRetainedMortgage:150000}).tax.sellerTax,50);
 near(calc({state:'IL',ilRetainedMortgage:200000}).tax.sellerTax,0);
 near(calc({state:'IL',assumed:100000,ilRetainedMortgage:100000}).tax.sellerTax,200);
 assert.equal(calc({state:'IL',ilRetainedMortgage:200001}).tax.known,false);
 assert.equal(calc({state:'IL',ilRetainedMortgage:200001}).tax.sellerTax,null);
 near(calc({state:'IL',ilRetainedMortgage:200001,stateTaxOverride:180}).tax.sellerTax,180);
 near(calc({ilRetainedMortgage:150000}).tax.sellerTax,200);
 near(calc({state:'IL',ilRetainedMortgage:150000,mortgage1:0}).debt,0);
 near(calc({state:'IL',ilRetainedMortgage:150000,mortgage1:0}).net,35930);
 near(calc({state:'IL',ilRetainedMortgage:150000,mortgage1:0}).cashPrice,50000);
 near(calc({state:'IL',assumed:150000,ilRetainedMortgage:150000,mortgage1:0}).cashPrice,200000);
 near(calc({state:'IL',assumed:100000,ilRetainedMortgage:150000,mortgage1:0}).cashPrice,150000);
 assert.ok(Number.isNaN(calc({state:'IL',ilRetainedMortgage:200001,stateTaxOverride:180}).net));
 console.log('PASS: 14 retained-mortgage assertions: equity basis, zero equity, included consideration, invalid basis pending, override, state isolation and payoff separation.');
}
console.log('PASS: Seller Net snapshot: 14 scenarios covering proceeds, optional second mortgage, losses, zero, rounding, override, share, exemption, unknown tax and four state formulas.');
console.log('Snapshot SHA-256: '+createHash('sha256').update(html).digest('hex'));
