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
test('hard money principal, points and simple annual interest',()=>{
 const r=window.IBSimpleFinanceModels.hardMoneyModel(210000,11.5,2,9);
 near(r.interestCost,18112.5,'interest');
 near(r.totalCost,22312.5,'interest plus points');
 near(r.monthlyInterest,2012.5,'monthly interest');
});
