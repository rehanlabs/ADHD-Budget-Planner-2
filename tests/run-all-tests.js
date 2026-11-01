const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFailed++;
  }
}

console.log('================================================================');
console.log(' ADHD BUDGET PLANNER (EDITION 2) — INTEGRATED QA TEST RUNNER');
console.log('================================================================\n');

// 1. FinanceEngine
const enginePath = path.join(__dirname, '../js/finance-engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');
const context = { console, Math, Date, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(engineCode + '; this.FinanceEngine = FinanceEngine || this.FinanceEngine;', context);
const Engine = context.FinanceEngine;

console.log('--- SUITE 1: Financial Math & Currency Edge Cases ---');
assert(Engine.parseToCents('750.00') === 75000, 'parseToCents decimal string');
assert(Engine.parseToCents('$1,550.00') === 155000, 'parseToCents formatted currency');
assert(Engine.parseToCents(null) === 0, 'parseToCents handles null');
assert(Engine.parseToCents(undefined) === 0, 'parseToCents handles undefined');
assert(Engine.parseToCents('') === 0, 'parseToCents handles empty string');
assert(Engine.parseToCents('-50.25') === -5025, 'parseToCents handles negative value');
assert(Engine.formatCents(155000, 'USD') === '$1,550.00', 'formatCents USD formatted');
assert(Engine.formatCents(7500, 'EUR') === '€75.00', 'formatCents EUR symbol');
assert(Engine.formatCents(9200, 'GBP') === '£92.00', 'formatCents GBP symbol');
assert(Engine.formatCents(-2500, 'USD') === '-$25.00', 'formatCents negative amount');

console.log('\n--- SUITE 2: Safe-to-Spend Runway & Obligations ---');
const testState = {
  checkingCents: 100000, // $1,000.00
  incomeCycle: 'biweekly',
  incomeAnchor: '2026-11-13', // Friday
  bills: [
    { id: 'b1', amountCents: 30000, dueDate: '2026-11-05', paid: false },
    { id: 'b2', amountCents: 15000, dueDate: '2026-11-20', paid: false }
  ],
  transactions: []
};

const safe = Engine.calculateSafeToSpend(testState, '2026-10-30');
assert(safe.daysRunway === 14, 'Runway correctly computed as 14 days');
assert(safe.pendingBillsCents === 30000, 'Only pending bills before payday ($300) are reserved');
assert(safe.spendablePoolCents === 70000, 'Spendable pool is $1,000 - $300 = $700');
assert(safe.dailyQuotaCents === Math.floor(70000 / 14), 'Daily safe quota calculated');

// Now add a transaction today
testState.transactions.push({ id: 't1', date: '2026-10-30', amountCents: 1350 });
const safeAfterSpend = Engine.calculateSafeToSpend(testState, '2026-10-30');
assert(safeAfterSpend.safeToSpendTodayCents === Math.floor(70000 / 14) - 1350, 'Safe to spend deducts today spend');

console.log('\n--- SUITE 3: Anti-Double-Counting on Same-Day Balance Update ---');
const T0 = 1700000000000;
const T1 = T0 + 1000 * 60 * 30; // 30 min later spend
const T2 = T0 + 1000 * 60 * 60; // 1 hour later balance update

const stateSync = {
  checkingCents: 100000,
  balanceUpdatedAt: T0,
  incomeCycle: 'biweekly',
  incomeAnchor: '2026-11-15',
  bills: [],
  transactions: []
};

// 1. Initial pool is $1,000
const s0 = Engine.calculateSafeToSpend(stateSync, '2026-11-01');
assert(s0.spendablePoolCents === 100000, 'Initial spendable pool is $1,000');

// 2. User spends $50 at T1
stateSync.transactions.push({ id: 'tx-1', timestamp: T1, date: '2026-11-01', amountCents: 5000 });
const s1 = Engine.calculateSafeToSpend(stateSync, '2026-11-01');
assert(s1.safeToSpendTodayCents === s0.dailyQuotaCents - 5000, 'Today safe drops by $50 after transaction');

// 3. User checks bank, sees $950, and updates checking balance at T2
stateSync.checkingCents = 95000;
stateSync.balanceUpdatedAt = T2;
const s2 = Engine.calculateSafeToSpend(stateSync, '2026-11-01');
assert(s2.spendablePoolCents === 95000, 'Spendable pool remains $950 (NO double deduction)');

console.log('\n--- SUITE 4: Payday Shift (Weekend Adjust & Leap Year) ---');
assert(Engine.adjustWeekendEarly('2026-11-14') === '2026-11-13', 'Saturday payday shifts to Friday');
assert(Engine.adjustWeekendEarly('2026-11-15') === '2026-11-13', 'Sunday payday shifts to Friday');
assert(Engine.adjustWeekendEarly('2026-11-16') === '2026-11-16', 'Monday payday remains Monday');
assert(Engine.addDays('2028-02-28', 1) === '2028-02-29', 'Leap year handles Feb 28 -> Feb 29');
assert(Engine.addDays('2028-02-29', 1) === '2028-03-01', 'Leap year handles Feb 29 -> Mar 01');

console.log('\n--- SUITE 5: Debt Payoff Snowball & Avalanche ---');
const debts = [
  { balanceCents: 150000, minPaymentCents: 5000, interestRate: 18 },
  { balanceCents: 50000, minPaymentCents: 3000, interestRate: 24 }
];
const snowball = Engine.calculateDebtPlan(debts, 5000, 'snowball');
const avalanche = Engine.calculateDebtPlan(debts, 5000, 'avalanche');
assert(snowball.isDebtFree === true, 'Snowball simulation completes to zero debt');
assert(avalanche.isDebtFree === true, 'Avalanche simulation completes to zero debt');
assert(avalanche.totalInterestPaidCents <= snowball.totalInterestPaidCents, 'Avalanche pays less or equal interest');

console.log('\n--- SUITE 6: Wishlist Pause 48-Hour Timer ---');
const now = Date.now();
const itemFresh = { parkedAt: now };
const itemCool = { parkedAt: now - 3600000 * 49 };
assert(Engine.getVaultCountdown(itemFresh, now).isUnlocked === false, 'Fresh wishlist item is paused');
assert(Engine.getVaultCountdown(itemFresh, now).remainingHours === 48, 'Fresh wishlist item has 48h left');
assert(Engine.getVaultCountdown(itemCool, now).isUnlocked === true, 'Old wishlist item is unlocked after 48h');

console.log('\n--- SUITE 7: DOM & Text Hygiene ---');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(html.includes('id="screen-dashboard"'), 'HTML contains #screen-dashboard');
assert(html.includes('id="screen-obligations"'), 'HTML contains #screen-obligations');
assert(html.includes('id="screen-pause"'), 'HTML contains #screen-pause');
assert(html.includes('id="screen-payoff"'), 'HTML contains #screen-payoff');
assert(html.includes('id="screen-scratchpad"'), 'HTML contains #screen-scratchpad');
assert(html.includes('id="screen-preferences"'), 'HTML contains #screen-preferences');
assert(html.includes('id="burnout-shield-overlay"'), 'HTML contains #burnout-shield-overlay');
assert(html.includes('id="modal-add-obligation"'), 'HTML contains modal #modal-add-obligation');
assert(html.includes('id="modal-add-pause"'), 'HTML contains modal #modal-add-pause');

// Hygiene check
assert(!html.includes('NaN'), 'HTML contains no literal NaN text');
assert(!html.includes('undefined'), 'HTML contains no literal undefined text');
assert(!html.includes('[object Object]'), 'HTML contains no literal [object Object] text');
assert(!html.includes('Lorem ipsum'), 'HTML contains no Lorem ipsum text');
assert(!html.includes('TODO'), 'HTML contains no TODO comments in client markup');

console.log('\n--- SUITE 8: Service Worker Cache Asset Integrity ---');
const swCode = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
const assetMatches = swCode.match(/'\.\/[^']+'/g);
if (assetMatches) {
  assetMatches.forEach(m => {
    const rel = m.replace(/^'\.\//, '').replace(/'$/, '');
    if (rel) {
      const assetPath = path.join(__dirname, '..', rel);
      assert(fs.existsSync(assetPath), `Cached asset exists on disk: ${rel}`);
    }
  });
}

console.log('\n================================================================');
console.log(` SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ADHD BUDGET PLANNER (EDITION 2) QA TESTS PASSED!');
  process.exit(0);
}
