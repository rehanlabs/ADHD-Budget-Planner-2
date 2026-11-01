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
console.log(' ADHD BUDGET PLANNER (EDITION 2) — INTEGRATED TEST RUNNER');
console.log('================================================================\n');

// 1. FinanceEngine
const enginePath = path.join(__dirname, '../js/finance-engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');
const context = { console, Math, Date, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(engineCode + '; this.FinanceEngine = FinanceEngine || this.FinanceEngine;', context);
const Engine = context.FinanceEngine;

console.log('--- SUITE 1: Financial Math & Currency ---');
assert(Engine.parseToCents('750.00') === 75000, 'parseToCents decimal string');
assert(Engine.parseToCents('$1,550.00') === 155000, 'parseToCents formatted currency');
assert(Engine.parseToCents(null) === 0, 'parseToCents handles null');
assert(Engine.formatCents(155000, 'USD') === '$1,550.00', 'formatCents USD formatted');
assert(Engine.formatCents(7500, 'EUR') === '€75.00', 'formatCents EUR symbol');

console.log('\n--- SUITE 2: Safe-to-Spend Runway & Obligations ---');
const testState = {
  checkingCents: 100000, // $1,000.00
  incomeCycle: 'biweekly',
  incomeAnchor: '2026-11-15',
  bills: [
    { id: 'b1', amountCents: 30000, dueDate: '2026-11-09', paid: false },
    { id: 'b2', amountCents: 15000, dueDate: '2026-11-20', paid: false }
  ],
  transactions: [
    { id: 't1', date: '2026-11-01', amountCents: 1350 }
  ]
};

const safe = Engine.calculateSafeToSpend(testState, '2026-11-01');
assert(safe.daysRunway === 14, 'Runway correctly computed as 14 days');
assert(safe.pendingBillsCents === 30000, 'Only pending bills before payday ($300) are reserved');
assert(safe.spendablePoolCents === 70000, 'Spendable pool is $1,000 - $300 = $700');
assert(safe.dailyQuotaCents === Math.floor(70000 / 14), 'Daily safe quota calculated');
assert(safe.safeToSpendTodayCents === Math.floor(70000 / 14) - 1350, 'Safe to spend deducts today spend');

console.log('\n--- SUITE 3: Debt Crusher Snowball & Avalanche ---');
const debts = [
  { balanceCents: 150000, minPaymentCents: 5000, interestRate: 18 },
  { balanceCents: 50000, minPaymentCents: 3000, interestRate: 24 }
];
const snowball = Engine.calculateDebtPlan(debts, 5000, 'snowball');
const avalanche = Engine.calculateDebtPlan(debts, 5000, 'avalanche');
assert(snowball.isDebtFree === true, 'Snowball simulation completes to zero debt');
assert(avalanche.isDebtFree === true, 'Avalanche simulation completes to zero debt');
assert(avalanche.totalInterestPaidCents <= snowball.totalInterestPaidCents, 'Avalanche pays less or equal interest');

console.log('\n--- SUITE 4: Wishlist Pause 48-Hour Timer ---');
const now = Date.now();
const itemFresh = { parkedAt: now };
const itemCool = { parkedAt: now - 3600000 * 49 };
assert(Engine.getVaultCountdown(itemFresh, now).isUnlocked === false, 'Fresh wishlist item is paused');
assert(Engine.getVaultCountdown(itemFresh, now).remainingHours === 48, 'Fresh wishlist item has 48h left');
assert(Engine.getVaultCountdown(itemCool, now).isUnlocked === true, 'Old wishlist item is unlocked after 48h');

console.log('\n--- SUITE 5: DOM & File Integrity ---');
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

// Verify service worker cached assets exist on disk
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
  console.log('🎉 ALL ADHD BUDGET PLANNER (EDITION 2) TESTS PASSED!');
  process.exit(0);
}
