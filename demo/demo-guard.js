/**
 * ADHD Budget Planner (Edition 2) - Nordic Glass Demo Guard
 * Isolates demo to temporary sessionStorage, seeds realistic ADHD demo data,
 * and handles Etsy purchase conversion modals.
 */
(function () {
  'use strict';

  // 1. Disable ServiceWorker registration in demo mode
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register = function () {
      return Promise.resolve();
    };
  }

  // 2. Redirect localStorage calls to sessionStorage for store key
  const DEMO_STORE_KEY = 'adhd_budget_store_v2';
  
  // Seed realistic, relatable ADHD budget data if not already set in this session
  if (!sessionStorage.getItem(DEMO_STORE_KEY)) {
    const now = Date.now();
    const inFourDays = new Date(now + 4 * 86400000).toISOString().slice(0, 10);
    const inThreeDays = new Date(now + 3 * 86400000).toISOString().slice(0, 10);
    const todayStr = new Date(now).toISOString().slice(0, 10);

    const seedDemoState = {
      version: 2,
      profile: {
        currency: 'USD',
        theme: 'emerald-modern',
        soundEnabled: true
      },
      checkingCents: 142000, // $1,420.00
      incomeCycle: 'biweekly',
      incomeAnchor: inFourDays, // Payday in 4 days!
      quickSpends: [
        { id: 'qs-1', title: 'Dopamine Snack', icon: '⚡', amountCents: 450 },
        { id: 'qs-2', title: 'Meal / Takeout', icon: '🍔', amountCents: 1600 },
        { id: 'qs-3', title: 'Meds & Health', icon: '💊', amountCents: 2200 },
        { id: 'qs-4', title: 'Transit / Rides', icon: '🚗', amountCents: 3500 }
      ],
      obligations: [
        { id: 'ob-1', name: 'Apartment Rent', amountCents: 75000, dueDate: inThreeDays, paid: false },
        { id: 'ob-2', name: 'Wi-Fi & Phone', amountCents: 7500, dueDate: inThreeDays, paid: false }
      ],
      wishlistPauseItems: [
        { id: 'wp-1', name: 'Noise-Cancelling Headphones', amountCents: 14900, parkedAt: now - 3600000 * 28 } // 20h remaining!
      ],
      debts: [
        { id: 'd-1', name: 'Credit Card Payoff', balanceCents: 160000, minPaymentCents: 6000, interestRate: 19.99 }
      ],
      transactions: [
        { id: 'tx-1', timestamp: now - 3600000 * 2, date: todayStr, title: 'Iced Matcha Latte', amountCents: 650 },
        { id: 'tx-2', timestamp: now - 3600000 * 5, date: todayStr, title: 'Pharmacy Rx Co-pay', amountCents: 1500 }
      ],
      notes: 'Remember to check grocery list before leaving work!'
    };

    sessionStorage.setItem(DEMO_STORE_KEY, JSON.stringify(seedDemoState));
  }

  // Intercept localStorage methods for DEMO_STORE_KEY
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.getItem = function (key) {
    if (key === DEMO_STORE_KEY) {
      return sessionStorage.getItem(DEMO_STORE_KEY);
    }
    return originalGetItem(key);
  };

  localStorage.setItem = function (key, value) {
    if (key === DEMO_STORE_KEY) {
      sessionStorage.setItem(DEMO_STORE_KEY, value);
      return;
    }
    originalSetItem(key, value);
  };

  localStorage.removeItem = function (key) {
    if (key === DEMO_STORE_KEY) {
      sessionStorage.removeItem(DEMO_STORE_KEY);
      return;
    }
    originalRemoveItem(key);
  };

  // 3. Conversion Modal Logic for gated features (Backup export/import)
  window.openDemoGate = function (featureName) {
    const modal = document.getElementById('etsy-demo-gate-modal');
    if (modal) {
      const title = document.getElementById('etsy-gate-modal-title');
      if (title && featureName) title.textContent = featureName;
      modal.classList.add('active');
    }
  };

  window.closeDemoGate = function () {
    const modal = document.getElementById('etsy-demo-gate-modal');
    if (modal) modal.classList.remove('active');
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Intercept backup export & restore
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.openDemoGate('Data Export & Personal Backups');
      };
    }

    const restoreInput = document.getElementById('input-restore-backup');
    if (restoreInput) {
      restoreInput.parentElement.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.openDemoGate('Cloud/Local Backup Restoration');
      };
    }
  });
})();
