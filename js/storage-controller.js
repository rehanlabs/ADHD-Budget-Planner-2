/**
 * ADHD Budget Planner - Storage Controller (Edition 2)
 * Manages persistent local state, schema integrity, and JSON backups.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StorageController = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'adhd_budget_store_v2';

  function createInitialState() {
    const inNineDays = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
    const inFourteenDays = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    return {
      version: 2,
      profile: {
        currency: 'USD',
        theme: 'emerald-modern',
        soundEnabled: true
      },
      checkingCents: 155000, // $1,550.00
      incomeCycle: 'biweekly',
      incomeAnchor: inFourteenDays,
      quickSpends: [
        { id: 'qs-1', title: 'Coffee / Tea', icon: '☕', amountCents: 550 },
        { id: 'qs-2', title: 'Fast Food / Lunch', icon: '🥪', amountCents: 1350 },
        { id: 'qs-3', title: 'Groceries / Snack', icon: '🛒', amountCents: 3800 }
      ],
      bills: [
        { id: 'bill-1', name: 'Apartment Rent', amountCents: 75000, dueDate: inNineDays, paid: false },
        { id: 'bill-2', name: 'Wi-Fi & Mobile', amountCents: 7500, dueDate: inNineDays, paid: false }
      ],
      vaultItems: [
        { id: 'v-1', name: 'Noise-Cancelling Earbuds', amountCents: 9900, parkedAt: Date.now() - 3600000 * 22 }
      ],
      debts: [
        { id: 'd-1', name: 'Mastercard Balance', balanceCents: 180000, minPaymentCents: 6500, interestRate: 19.99 }
      ],
      transactions: [],
      notes: ''
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = createInitialState();
        saveState(fresh);
        return fresh;
      }
      const data = JSON.parse(raw);
      if (!data.profile) data.profile = { currency: 'USD', theme: 'emerald-modern', soundEnabled: true };
      if (!Array.isArray(data.bills)) data.bills = [];
      if (!Array.isArray(data.vaultItems)) data.vaultItems = [];
      if (!Array.isArray(data.debts)) data.debts = [];
      if (!Array.isArray(data.quickSpends)) data.quickSpends = [];
      if (!Array.isArray(data.transactions)) data.transactions = [];
      return data;
    } catch {
      return createInitialState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function exportStateJSON(state) {
    return JSON.stringify(state, null, 2);
  }

  function importStateJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid backup file.');
    saveState(parsed);
    return parsed;
  }

  return {
    STORAGE_KEY,
    createInitialState,
    loadState,
    saveState,
    exportStateJSON,
    importStateJSON
  };
});
