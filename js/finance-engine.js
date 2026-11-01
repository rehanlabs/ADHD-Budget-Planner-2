/**
 * ADHD Budget Planner - Core Financial Engine (Edition 2)
 * High-precision integer cent financial math, payday projection, and debt payoff simulations.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FinanceEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseToCents(amount) {
    if (amount == null) return 0;
    if (typeof amount === 'number') {
      if (!isFinite(amount)) return 0;
      return Math.round(amount * 100);
    }
    const clean = String(amount).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  function formatCents(cents, currency = 'USD') {
    const val = (Number(cents) || 0) / 100;
    const symbols = { USD: '$', CAD: '$', AUD: '$', GBP: '£', EUR: '€', JPY: '¥' };
    const sym = symbols[currency] || '$';
    if (currency === 'JPY') return sym + Math.round(val).toLocaleString();
    return sym + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function calculateSafeToSpend(state, todayISO) {
    const today = todayISO || new Date().toISOString().slice(0, 10);
    const checkingBalance = state.checkingCents || 0;
    const incomeAnchor = state.incomeAnchor || today;
    const incomeCycle = state.incomeCycle || 'biweekly';

    const todayDate = new Date(today + 'T12:00:00Z');
    let nextIncome = new Date(incomeAnchor + 'T12:00:00Z');

    const cycleDays = { weekly: 7, biweekly: 14, monthly: 30, semimonthly: 15 };
    const step = cycleDays[incomeCycle] || 14;

    while (nextIncome <= todayDate) {
      nextIncome.setUTCDate(nextIncome.getUTCDate() + step);
    }

    const diffMs = nextIncome.getTime() - todayDate.getTime();
    const daysRunway = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const nextPayISO = nextIncome.toISOString().slice(0, 10);

    // Sum unpaid bills due before next payday
    let pendingBillsCents = 0;
    (state.bills || []).forEach(bill => {
      if (!bill.paid && bill.dueDate >= today && bill.dueDate < nextPayISO) {
        pendingBillsCents += bill.amountCents;
      }
    });

    const spendablePool = Math.max(0, checkingBalance - pendingBillsCents);
    const dailySafeQuota = Math.max(0, Math.floor(spendablePool / daysRunway));

    // Deduct today's spent transactions
    let spentTodayCents = 0;
    (state.transactions || []).forEach(tx => {
      if (tx.date === today) {
        spentTodayCents += tx.amountCents;
      }
    });

    const safeToSpendToday = Math.max(0, dailySafeQuota - spentTodayCents);

    return {
      safeToSpendTodayCents: safeToSpendToday,
      dailyQuotaCents: dailySafeQuota,
      daysRunway: daysRunway,
      nextPaydayISO: nextPayISO,
      pendingBillsCents: pendingBillsCents,
      spendablePoolCents: spendablePool,
      spentTodayCents: spentTodayCents
    };
  }

  function calculateDebtPlan(debts, extraPaymentCents, strategy = 'snowball') {
    let list = (debts || []).map(d => ({
      name: d.name,
      balance: d.balanceCents || 0,
      minPayment: d.minPaymentCents || 0,
      apr: (d.interestRate || 0) / 100 / 12
    }));

    if (strategy === 'snowball') {
      list.sort((a, b) => a.balance - b.balance);
    } else {
      list.sort((a, b) => b.apr - a.apr);
    }

    let months = 0;
    let totalInterest = 0;
    let extra = extraPaymentCents || 0;

    while (list.some(d => d.balance > 0) && months < 360) {
      months++;
      let extraAvailable = extra;

      for (let i = 0; i < list.length; i++) {
        if (list[i].balance <= 0) continue;
        const interest = Math.round(list[i].balance * list[i].apr);
        totalInterest += interest;
        list[i].balance += interest;

        let pay = list[i].minPayment;
        if (i === 0) {
          pay += extraAvailable;
          extraAvailable = 0;
        }

        pay = Math.min(list[i].balance, pay);
        list[i].balance -= pay;

        if (list[i].balance <= 0) {
          extra += list[i].minPayment; // Snowball acceleration
        }
      }
    }

    return {
      monthsToDebtFree: months,
      totalInterestPaidCents: totalInterest,
      isDebtFree: list.every(d => d.balance <= 0)
    };
  }

  function getVaultCountdown(item, nowTimestamp) {
    const now = nowTimestamp || Date.now();
    const elapsedMs = now - item.parkedAt;
    const remainingMs = Math.max(0, (48 * 3600000) - elapsedMs);
    const remainingHours = Math.ceil(remainingMs / 3600000);
    return {
      remainingHours: remainingHours,
      isUnlocked: remainingHours === 0
    };
  }

  return {
    parseToCents,
    formatCents,
    calculateSafeToSpend,
    calculateDebtPlan,
    getVaultCountdown
  };
});
