/**
 * ADHD Budget Planner - Core Financial Engine (Edition 2)
 * High-precision integer cent financial math, payday projection, weekend adjustment,
 * anti-double-counting protection, and debt payoff amortization.
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
    const str = String(amount).trim();
    if (!str) return 0;
    const isNegative = str.startsWith('-') || str.includes('(');
    const clean = str.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    const cents = Math.round(parsed * 100);
    return isNegative ? -cents : cents;
  }

  function formatCents(cents, currency = 'USD') {
    const isNeg = Number(cents) < 0;
    const absVal = Math.abs(Number(cents) || 0) / 100;
    const symbols = { USD: '$', CAD: '$', AUD: '$', GBP: '£', EUR: '€', JPY: '¥' };
    const sym = symbols[currency] || '$';
    let formatted = '';
    if (currency === 'JPY') {
      formatted = sym + Math.round(absVal).toLocaleString('en-US');
    } else {
      formatted = sym + absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return isNeg ? `-${formatted}` : formatted;
  }

  function toISODate(d) {
    const date = d ? new Date(d) : new Date();
    return date.toISOString().slice(0, 10);
  }

  function addDays(isoDate, n) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }

  function diffDays(aISO, bISO) {
    const [yA, mA, dA] = aISO.split('-').map(Number);
    const [yB, mB, dB] = bISO.split('-').map(Number);
    const dtA = Date.UTC(yA, mA - 1, dA, 12);
    const dtB = Date.UTC(yB, mB - 1, dB, 12);
    return Math.round((dtB - dtA) / (1000 * 60 * 60 * 24));
  }

  function adjustWeekendEarly(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    const day = dt.getUTCDay();
    if (day === 6) return addDays(isoDate, -1); // Saturday -> Friday
    if (day === 0) return addDays(isoDate, -2); // Sunday -> Friday
    return isoDate;
  }

  function getNextPayday(anchorISO, cycle, todayISO, weekendEarly = true) {
    const today = todayISO || toISODate();
    const anchor = anchorISO || today;
    const adjustedAnchor = weekendEarly ? adjustWeekendEarly(anchor) : anchor;

    if (adjustedAnchor > today) {
      return { date: adjustedAnchor, rawDate: anchor };
    }

    if (cycle === 'weekly' || cycle === 'biweekly') {
      const step = cycle === 'weekly' ? 7 : 14;
      let curr = anchor;
      while (true) {
        const next = addDays(curr, step);
        const actual = weekendEarly ? adjustWeekendEarly(next) : next;
        if (actual > today) {
          return { date: actual, rawDate: next };
        }
        curr = next;
      }
    } else if (cycle === 'semimonthly') {
      const [curY, curM] = today.split('-').map(Number);
      const candidates = [];
      for (let y = curY; y <= curY + 1; y++) {
        for (let m = 1; m <= 12; m++) {
          const daysInM = new Date(Date.UTC(y, m, 0)).getUTCDate();
          [1, 15, Math.min(30, daysInM), daysInM].forEach(day => {
            const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const actual = weekendEarly ? adjustWeekendEarly(iso) : iso;
            if (actual > today) {
              candidates.push({ date: actual, rawDate: iso });
            }
          });
        }
      }
      candidates.sort((a, b) => a.date.localeCompare(b.date));
      return candidates[0] || { date: addDays(today, 15), rawDate: addDays(today, 15) };
    } else { // monthly
      const dueDay = parseInt(anchor.split('-')[2], 10) || 1;
      const [curY, curM] = today.split('-').map(Number);
      for (let y = curY; y <= curY + 1; y++) {
        const startM = y === curY ? curM : 1;
        for (let m = startM; m <= 12; m++) {
          const daysInM = new Date(Date.UTC(y, m, 0)).getUTCDate();
          const validDay = Math.min(dueDay, daysInM);
          const iso = `${y}-${String(m).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
          const actual = weekendEarly ? adjustWeekendEarly(iso) : iso;
          if (actual > today) {
            return { date: actual, rawDate: iso };
          }
        }
      }
      return { date: addDays(today, 30), rawDate: addDays(today, 30) };
    }
  }

  function calculateSafeToSpend(state, todayISO) {
    const today = todayISO || toISODate();
    const checkingBalance = state.checkingCents || 0;
    const incomeAnchor = state.incomeAnchor || today;
    const incomeCycle = state.incomeCycle || 'biweekly';

    const nextPay = getNextPayday(incomeAnchor, incomeCycle, today, true);
    const daysRunway = Math.max(1, diffDays(today, nextPay.date));
    const nextPayISO = nextPay.date;
    const dayBeforePay = addDays(nextPayISO, -1);

    // Anti-Double-Counting Spending Check
    const balanceUpdatedAt = state.balanceUpdatedAt || 0;
    let spentThisPeriod = 0;
    let spentTodayCents = 0;

    (state.transactions || []).forEach(tx => {
      const txTime = tx.timestamp || (typeof tx.id === 'string' && tx.id.startsWith('tx-') ? parseInt(tx.id.replace('tx-', ''), 10) : 0);
      let isAfterBalance = false;
      if (balanceUpdatedAt > 0 && txTime > 0) {
        isAfterBalance = txTime > balanceUpdatedAt;
      } else {
        isAfterBalance = true;
      }

      const amt = tx.amountCents || 0;
      if (isAfterBalance && tx.date <= today) {
        spentThisPeriod += amt;
      }
      if (tx.date === today) {
        spentTodayCents += amt;
      }
    });

    const effectiveChecking = Math.max(0, checkingBalance - spentThisPeriod);

    // Sum unpaid bills due before next payday
    let pendingBillsCents = 0;
    (state.bills || []).forEach(bill => {
      const isPaid = bill.paid === true || bill.isPaid === true;
      const due = bill.dueDate || bill.date;
      if (!isPaid && due >= today && due <= dayBeforePay) {
        pendingBillsCents += (bill.amountCents || 0);
      }
    });

    const rawSpendablePool = effectiveChecking - pendingBillsCents;
    const spendablePool = Math.max(0, rawSpendablePool);

    // Starting daily safe pool (adds back today's spend so daily allowance is stable)
    const startingPoolToday = Math.max(0, rawSpendablePool + spentTodayCents);
    const dailySafeQuota = Math.max(0, Math.floor(startingPoolToday / daysRunway));

    // Remaining allowance for today (never goes negative - non-punitive absorption)
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
          extra += list[i].minPayment;
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
    toISODate,
    addDays,
    diffDays,
    adjustWeekendEarly,
    getNextPayday,
    calculateSafeToSpend,
    calculateDebtPlan,
    getVaultCountdown
  };
});
