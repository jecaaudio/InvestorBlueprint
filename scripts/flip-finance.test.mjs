import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('tools/tool-script.js','utf8');
const window={};
vm.runInNewContext(source,{window,document:{readyState:'loading',addEventListener(){}},Intl});
assert.equal(typeof window.IBCalculateFlipFinance,'function','Finance engine not exposed for deterministic QA');
const calc=window.IBCalculateFlipFinance;
const basic={purchase:200000,sale:320000,rehabTotal:50000,buyerClosing:5000,
  titleFees:0,prorations:0,inspectionCost:0,monthlyHolding:1000,holdingMonths:6,
  realtorPct:6,concessionPct:1,sellerClosingPct:0,stagingCost:1000,transferTax:0,
  isPro:false,financingType:'cash',loanAmount:0,loanPurchasePct:85,loanRehabPct:100,
  pointsPct:2,interestRate:10,drawFee:0,drawInspectionFee:0,drawCount:0,
  originationFees:0,loanClosingCosts:0,prepayPenalty:0,taxRate:0};
function near(actual,expected,message){assert.ok(Math.abs(actual-expected)<=0.01,message+': '+actual+' vs '+expected)}
test('cash flip reconcile acquisition, sale profit, capital and break-even',()=>{
  const r=calc(basic);
  near(r.acquisition,205000,'acquisition');
  near(r.totalCosts,284400,'total project cost');
  near(r.netProfit,35600,'profit');
  near(r.cashCommitted,261000,'equity capital');
  near(r.breakEven,262000/.93,'break even with sale fee');
  near(r.roi,35600/261000*100,'ROI');
});
test('earnest money remains purchase credit, never counted as extra cost',()=>{
  const base=calc(basic),deposit=calc({...basic,earnestDeposit:15000});
  near(deposit.acquisition,base.acquisition,'acquisition with earnest');
  near(deposit.netProfit,base.netProfit,'profit with earnest');
});
test('hard-money interest and points accrue on actual principal, not full purchase',()=>{
  const r=calc({...basic,isPro:true,financingType:'hard-money',loanAmount:100000});
  near(r.financedAmount,100000,'explicit principal');
  near(r.financingTotal,100000*(.02+.10*.5),'financing');
  near(r.netProfit,28600,'financed profit');
  near(r.cashCommitted,168000,'capital');
});
test('derive principal from percentages when explicit loan is absent',()=>{
  const r=calc({...basic,isPro:true,financingType:'hard-money',loanAmount:0,loanPurchasePct:50,loanRehabPct:50});
  near(r.financedAmount,125000,'derived principal');
});
test('scenario selling percentages move with each gross sale amount',()=>{
  const r=calc(basic);
  near(r.scenarioLow,320000*.95*(1-.07)-262000,'low');
  near(r.scenarioHigh,320000*1.05*(1-.07)-262000,'high');
  near(r.scenarioBase,r.netProfit,'base');
});
test('no spurious ROI when net capital is zero or negative',()=>{
  const r=calc({...basic,isPro:true,financingType:'hard-money',loanAmount:500000});
  assert.equal(r.roi,null);
});
test('extreme selling fee never generates fictitious break-even',()=>{
  assert.equal(calc({...basic,realtorPct:100,concessionPct:1}).breakEven,null);
});

test('rental monthly and annual effective cash flow',()=>{
 const r=window.IBSimpleFinanceModels.rentalModel(2400,5,[220,120,180,190]);
 near(r.monthlyCashFlow,1570,'rental month');
 near(r.annualCashFlow,18840,'rental year');
});
test('rental NOI, cash flow, reserves and equity return reconcile without counting debt in cap rate',()=>{
 const model=window.IBSimpleFinanceModels.rentalModel;
 const r=model(2400,5,[220,120,180,190],{debtService:900,capitalReserve:100,hoa:50,utilities:80,otherExpenses:20,cashInvested:60000,totalBasis:240000});
 near(r.effectiveIncome,2280,'effective rent');near(r.operatingExpenses,860,'operating costs');
 near(r.annualNoi,17040,'NOI');near(r.monthlyCashFlow,420,'cash after debt and reserve');
 near(r.annualCashFlow,5040,'annual cash');near(r.cashOnCash,8.4,'equity return');near(r.capRate,7.1,'cap rate');
 const vacant=model(2400,100,[220,120],{debtService:900,capitalReserve:100});
 near(vacant.monthlyCashFlow,-1340,'full-vacancy ongoing costs');
 assert.equal(vacant.capRate,null);assert.equal(vacant.cashOnCash,null);
 for(const value of [-1,NaN,Infinity,'900'])assert.throws(()=>model(2400,5,[],{debtService:value}),/Invalid financial input/);
});
test('gross rent target with annual expense disclosure',()=>{
 const r=window.IBSimpleFinanceModels.rentModel(320000,9600,8.5,95);
 near(r.annualIncome,27200,'gross rent collected');
 near(r.grossYield,8.5,'gross yield');
 near(r.netAfterExpenses,17600,'net annual');
});
test('three-comp simple ARV with seventy-percent heuristic',()=>{
 const r=window.IBSimpleFinanceModels.arvModel([305000,315000,322000],38000);
 near(r.average,314000,'ARV average');
 near(r.maxOffer,181800,'MAO 70 heuristic');
});
test('manual comparable adjustments are signed, disclosed and cannot fabricate negative prices',()=>{
 const model=window.IBSimpleFinanceModels.arvModel;
 const r=model([300000,330000,280000],30000,[10000,-20000,30000]);
 near(r.average,310000,'adjusted estimate');near(r.minimum,310000,'adjusted minimum');near(r.maximum,310000,'adjusted maximum');
 near(r.maxOffer,187000,'screening offer');
 assert.throws(()=>model([300000],0,[-300001]),/Invalid financial input/);
 assert.throws(()=>model([300000],0,[-300000]),/positive/);
 assert.throws(()=>model([300000],0,[NaN]),/Invalid/);
 assert.throws(()=>model([300000],0,[]),/adjustment/);
});
test('hard money principal, points and simple annual interest',()=>{
 const r=window.IBSimpleFinanceModels.hardMoneyModel(210000,11.5,2,9);
 near(r.interestCost,18112.5,'interest');
 near(r.totalCost,22312.5,'interest plus points');
 near(r.monthlyInterest,2012.5,'monthly interest');
});
test('funding dates, partial draws, lender fees and monthly capitalization use actual drawn balances',()=>{
 const model=window.IBSimpleFinanceModels.hardMoneyModel;
 const draws=[{month:0,amount:50000},{month:3,amount:25000}];
 const r=model(100000,12,2,6,{draws,fees:700});
 near(r.interestCost,3750,'draw interest');near(r.totalCost,6450,'interest plus commitment points and fees');
 near(r.drawnPrincipal,75000,'funded balance');near(r.monthlyInterest,625,'average monthly interest');
 near(model(100000,12,0,2,{interestMethod:'monthly-compound'}).interestCost,2010,'two compound periods');
 near(model(100000,12,0,1.5,{interestMethod:'monthly-compound'}).interestCost,1505,'partial final period');
 near(model(100000,12,2,0,{fees:700}).totalCost,2700,'zero term still incurs upfront costs');
 for(const bad of [[{month:7,amount:1}],[{month:-1,amount:1}],[{month:0,amount:100001}],[]])
   assert.throws(()=>model(100000,12,2,6,{draws:bad}),/Invalid|exceed|required/);
 assert.throws(()=>model(100000,12,2,6,{interestMethod:'daily'}),/Invalid interest/);
 const flip=calc({...basic,isPro:true,financingType:'hard-money',loanAmount:100000,interestRate:12,draws});
 near(flip.financedAmount,75000,'flip funded principal');
 near(flip.financingTotal,5750,'flip scheduled interest and commitment points');
 near(flip.cashCommitted,191750,'flip uses drawn proceeds rather than an unfunded credit limit');
});

test('zero cash deal has finite costs and no undefined equity ROI',()=>{
 const zero={...basic};for(const [key,value] of Object.entries(zero))if(typeof value==='number')zero[key]=0;
 const r=calc(zero);assert.equal(r.netProfit,0);assert.equal(r.totalCosts,0);assert.equal(r.roi,null);
});
test('malformed, negative and nonfinite inputs are rejected at model boundary',()=>{
 for(const bad of [NaN,Infinity,-1,undefined,'200000'])assert.throws(()=>calc({...basic,purchase:bad}),/Invalid financial/);
 assert.throws(()=>calc({...basic,taxRate:101}),/Invalid financial/);
 assert.throws(()=>calc({...basic,purchase:1e308,rehabTotal:1e308}),/numeric limits/);
});
test('losses are not charged hypothetical profit tax and scenario profit stays consistent',()=>{
 const r=calc({...basic,sale:200000,taxRate:30});assert.ok(r.netProfit<0);assert.equal(r.taxAmount,0);near(r.scenarioBase,r.netProfit,'loss scenario');
 const p=calc({...basic,taxRate:25});near(p.taxAmount,35600*.25,'hypothetical tax');near(p.netProfit,26700,'after hypothetical tax');
});
test('rental full vacancy still incurs explicit expenses; invalid vacancy is rejected',()=>{
 const m=window.IBSimpleFinanceModels.rentalModel;const r=m(2400,100,[200,100]);
 assert.equal(r.monthlyCashFlow,-300);assert.equal(r.annualCashFlow,-3600);
 for(const v of [-1,101,NaN])assert.throws(()=>m(2400,v,[]));
 assert.throws(()=>m(2400,5,[undefined]));
});
test('zero occupancy has no computable asking rent instead of suggesting free rent',()=>{
 const r=window.IBSimpleFinanceModels.rentModel(200000,1200,8,0);
 assert.equal(r.suggestedMonthlyRent,null);assert.equal(r.annualIncome,0);assert.equal(r.netAfterExpenses,-1200);
});
test('empty, zero and invalid comparables cannot yield a fabricated ARV',()=>{
 const m=window.IBSimpleFinanceModels.arvModel;
 for(const comps of [[],[0],[200000,NaN],[200000,undefined]])assert.throws(()=>m(comps,0));
 assert.ok(m([100000,100000,100000],80000).maxOffer<0);
});
test('hard money zero duration includes points but no accrued interest',()=>{
 const m=window.IBSimpleFinanceModels.hardMoneyModel;const r=m(100000,12,2,0);
 assert.equal(r.totalCost,2000);assert.equal(r.interestCost,0);assert.equal(r.monthlyInterest,0);
 assert.throws(()=>m(100000,12,2,-1));
});
test('USD parsing preserves cents and rejects garbage rather than silently returning zero',()=>{
 const parse=window.IBParseFinanceNumber;
 assert.equal(parse('$1,234.56'),1234.56);assert.equal(parse('0'),0);assert.equal(parse(''),0);assert.equal(parse('.50'),.5);
 for(const value of ['abc','1,2,3','$12oops','Infinity','1e999'])assert.ok(Number.isNaN(parse(value)),value);
});
test('Spanish thousands dots and decimal commas are read as typed, never as small numbers',()=>{
 const parse=window.IBParseFinanceNumber;
 for(const [text,value] of [['250.000',250000],['1.250.000',1250000],['250.000,50',250000.5],['$250.000',250000],['1.500',1500],['1500,5',1500.5],['1500,50',1500.5],['250,000',250000],['$1,234.56',1234.56],['1.5',1.5],['0.125',0.125],['-2.500',-2500]])
  assert.equal(parse(text),value,text);
 for(const text of ['1.2.3','250.00.000','1,5,0','12,345,6','0.000.1'])assert.ok(Number.isNaN(parse(text)),text);
});
test('rates, months and counts keep dot decimals and accept decimal commas',()=>{
 const parse=window.IBParseFieldNumber;
 for(const [name,text,value] of [['interestRate','7.125',7.125],['interestRate','7,125',7.125],['pointsPct','2.5',2.5],['vacancyRate','5 %',5],['holdingMonths','4,5',4.5],['months','12',12],['occupancy','95',95]])
  assert.equal(parse(name,text),value,name+' '+text);
 assert.equal(parse('purchasePrice','250.000'),250000);
 for(const text of ['1.000.5','7.1.2','abc'])assert.ok(Number.isNaN(parse('interestRate',text)),text);
});
