/**
 * ADHD Budget Planner - Application Controller (Edition 2)
 * Manages screen routing, live reactivity, modal dialogs, and offline caching.
 */
(function () {
  'use strict';

  let state = null;
  let currentScreen = 'dashboard';

  function playHapticClick() {
    if (!state || !state.profile || !state.profile.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch {
      // AudioContext unavailable
    }
  }

  function setScreen(screenId) {
    currentScreen = screenId;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) targetScreen.classList.add('active');

    const targetTab = document.querySelector(`.nav-tab[data-nav="${screenId}"]`);
    if (targetTab) targetTab.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'instant' });
    renderCurrentScreen();
  }

  function renderHeader() {
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.innerHTML = state.profile.soundEnabled ? '🔔' : '🔕';
    }
  }

  function renderDashboard() {
    // Map obligations to bills format for FinanceEngine
    const adapterState = {
      checkingCents: state.checkingCents,
      incomeAnchor: state.incomeAnchor,
      incomeCycle: state.incomeCycle,
      bills: state.obligations,
      transactions: state.transactions
    };
    const safe = FinanceEngine.calculateSafeToSpend(adapterState);
    const heroAmt = document.getElementById('hero-safe-amount');
    if (heroAmt) {
      heroAmt.textContent = FinanceEngine.formatCents(safe.safeToSpendTodayCents, state.profile.currency);
    }

    const subtext = document.getElementById('hero-runway-subtext');
    if (subtext) {
      subtext.textContent = `Safe allowance resets daily until your next payday (${safe.nextPaydayISO})`;
    }

    const strip = document.getElementById('runway-summary-strip');
    if (strip) {
      strip.innerHTML = `
        <span>Payday Runway: <strong>${safe.daysRunway} days</strong></span>
        <span>Spendable Pool: <strong>${FinanceEngine.formatCents(safe.spendablePoolCents, state.profile.currency)}</strong></span>
      `;
    }

    // Render Quick Spends Grid (4-slot 2x2 grid)
    const grid = document.getElementById('quick-spend-grid');
    if (grid) {
      grid.innerHTML = (state.quickSpends || []).map(qs => `
        <button type="button" class="spend-tile-btn" data-spend-id="${qs.id}">
          <span class="spend-tile-icon">${qs.icon}</span>
          <span class="spend-tile-title">${qs.title}</span>
          <span class="spend-tile-amt">${FinanceEngine.formatCents(qs.amountCents, state.profile.currency)}</span>
        </button>
      `).join('');

      grid.querySelectorAll('.spend-tile-btn').forEach(btn => {
        btn.onclick = () => {
          const qs = state.quickSpends.find(q => q.id === btn.dataset.spendId);
          if (qs) {
            state.transactions.unshift({
              id: 'tx-' + Date.now(),
              timestamp: Date.now(),
              date: new Date().toISOString().slice(0, 10),
              title: qs.title,
              amountCents: qs.amountCents
            });
            StorageController.saveState(state);
            playHapticClick();
            renderDashboard();
          }
        };
      });
    }

    // Update Burnout Shield Hero
    const shieldAmt = document.getElementById('shield-hero-amount');
    if (shieldAmt) {
      shieldAmt.textContent = FinanceEngine.formatCents(safe.safeToSpendTodayCents, state.profile.currency);
    }
  }

  function renderObligations() {
    const list = document.getElementById('obligation-list');
    if (!list) return;
    if (!state.obligations || state.obligations.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--text-sub);padding:24px;">No obligations added. Tap "+ Add Obligation" to protect upcoming rent or bills.</p>`;
      return;
    }

    list.innerHTML = state.obligations.map(ob => `
      <div class="item-card">
        <div class="item-header">
          <div class="item-title"><span>📅</span> <span>${ob.name}</span></div>
          <div class="item-amount">${FinanceEngine.formatCents(ob.amountCents, state.profile.currency)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-sub);">
          <span>Due: ${ob.dueDate}</span>
          <button type="button" class="btn-primary-action ${ob.paid ? 'paid' : ''}" data-obligation-id="${ob.id}">
            ${ob.paid ? '✓ Settled' : 'Mark Settled'}
          </button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-primary-action').forEach(btn => {
      btn.onclick = () => {
        const ob = state.obligations.find(b => b.id === btn.dataset.obligationId);
        if (ob) {
          ob.paid = !ob.paid;
          playHapticClick();
          StorageController.saveState(state);
          renderObligations();
          renderDashboard();
        }
      };
    });
  }

  function renderWishlistPause() {
    const list = document.getElementById('pause-list');
    if (!list) return;
    if (!state.wishlistPauseItems || state.wishlistPauseItems.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--text-sub);padding:24px;">Your Wishlist Pause is clear. When an impulse urge hits, park it here for 48 hours to cool down!</p>`;
      return;
    }

    const now = Date.now();
    list.innerHTML = state.wishlistPauseItems.map(item => {
      const cd = FinanceEngine.getVaultCountdown(item, now);
      return `
        <div class="item-card">
          <div class="item-header">
            <div class="item-title"><span>⏳</span> <span>${item.name}</span></div>
            <div class="item-amount">${FinanceEngine.formatCents(item.amountCents, state.profile.currency)}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-sub);">
            <span>${cd.isUnlocked ? '✨ 48 hours passed! Do you still genuinely want this?' : `Cooldown: ${cd.remainingHours}h remaining`}</span>
            <button type="button" class="btn-primary-action" data-pause-id="${item.id}">Release & Save</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.btn-primary-action').forEach(btn => {
      btn.onclick = () => {
        const idx = state.wishlistPauseItems.findIndex(i => i.id === btn.dataset.pauseId);
        if (idx !== -1) {
          state.wishlistPauseItems.splice(idx, 1);
          playHapticClick();
          StorageController.saveState(state);
          renderWishlistPause();
        }
      };
    });
  }

  function renderPayoff() {
    const list = document.getElementById('payoff-list');
    if (!list) return;
    const plan = FinanceEngine.calculateDebtPlan(state.debts, 5000);
    document.getElementById('debt-free-summary').textContent = plan.isDebtFree ? `Projected Debt Free in ~${plan.monthsToDebtFree} months` : 'Enter debts to calculate freedom plan';

    if (!state.debts || state.debts.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--text-sub);padding:20px;">No debts listed. You are debt free! 🎉</p>`;
      return;
    }

    list.innerHTML = state.debts.map(d => `
      <div class="item-card">
        <div class="item-header">
          <div class="item-title"><span>💳</span> <span>${d.name}</span></div>
          <div class="item-amount">${FinanceEngine.formatCents(d.balanceCents, state.profile.currency)}</div>
        </div>
        <div style="font-size:12px;color:var(--text-sub);">
          Min Payment: ${FinanceEngine.formatCents(d.minPaymentCents, state.profile.currency)}/mo (${d.interestRate}% APR)
        </div>
      </div>
    `).join('');
  }

  function renderScratchpad() {
    const textarea = document.getElementById('scratchpad-textarea');
    if (textarea && state.notes !== undefined) {
      textarea.value = state.notes;
    }
  }

  function renderCurrentScreen() {
    renderHeader();
    if (currentScreen === 'dashboard') renderDashboard();
    if (currentScreen === 'obligations') renderObligations();
    if (currentScreen === 'pause') renderWishlistPause();
    if (currentScreen === 'payoff') renderPayoff();
    if (currentScreen === 'scratchpad') renderScratchpad();
  }

  function bindUI() {
    // Nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.onclick = () => setScreen(tab.dataset.nav);
    });

    // Top Actions
    document.getElementById('btn-toggle-sound').onclick = () => {
      state.profile.soundEnabled = !state.profile.soundEnabled;
      StorageController.saveState(state);
      renderHeader();
    };

    document.getElementById('btn-launch-tour').onclick = () => {
      ChloeTour.startTour();
    };

    // Burnout Shield Overlay
    const shield = document.getElementById('burnout-shield-overlay');
    document.getElementById('btn-burnout-shield').onclick = () => {
      shield.classList.add('active');
    };
    document.getElementById('btn-exit-shield').onclick = () => {
      shield.classList.remove('active');
    };

    // Scratchpad auto-save
    const textarea = document.getElementById('scratchpad-textarea');
    if (textarea) {
      textarea.oninput = () => {
        state.notes = textarea.value;
        StorageController.saveState(state);
      };
    }

    // Add Obligation Modal
    document.getElementById('btn-open-add-obligation').onclick = () => {
      document.getElementById('modal-add-obligation').classList.add('open');
    };
    document.getElementById('btn-close-add-obligation').onclick = () => {
      document.getElementById('modal-add-obligation').classList.remove('open');
    };
    document.getElementById('form-add-obligation').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('obligation-name-input').value;
      const amt = FinanceEngine.parseToCents(document.getElementById('obligation-amount-input').value);
      const date = document.getElementById('obligation-date-input').value;
      if (name && amt > 0 && date) {
        state.obligations.push({
          id: 'ob-' + Date.now(),
          name: name,
          amountCents: amt,
          dueDate: date,
          paid: false
        });
        StorageController.saveState(state);
        document.getElementById('modal-add-obligation').classList.remove('open');
        playHapticClick();
        renderObligations();
        renderDashboard();
      }
    };

    // Add Wishlist Pause Modal
    document.getElementById('btn-open-add-pause').onclick = () => {
      document.getElementById('modal-add-pause').classList.add('open');
    };
    document.getElementById('btn-close-add-pause').onclick = () => {
      document.getElementById('modal-add-pause').classList.remove('open');
    };
    document.getElementById('form-add-pause').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('pause-name-input').value;
      const amt = FinanceEngine.parseToCents(document.getElementById('pause-amount-input').value);
      if (name && amt > 0) {
        state.wishlistPauseItems.push({
          id: 'wp-' + Date.now(),
          name: name,
          amountCents: amt,
          parkedAt: Date.now()
        });
        StorageController.saveState(state);
        document.getElementById('modal-add-pause').classList.remove('open');
        playHapticClick();
        renderWishlistPause();
      }
    };

    // Settings Form
    document.getElementById('settings-checking-balance').value = (state.checkingCents / 100).toFixed(2);
    document.getElementById('settings-income-cycle').value = state.incomeCycle || 'biweekly';
    document.getElementById('settings-theme-select').value = state.profile.theme || 'emerald-modern';

    document.getElementById('form-planner-settings').onsubmit = (e) => {
      e.preventDefault();
      state.checkingCents = FinanceEngine.parseToCents(document.getElementById('settings-checking-balance').value);
      state.balanceUpdatedAt = Date.now();
      state.incomeCycle = document.getElementById('settings-income-cycle').value;
      state.profile.theme = document.getElementById('settings-theme-select').value;
      document.body.dataset.theme = state.profile.theme;
      StorageController.saveState(state);
      playHapticClick();
      renderDashboard();
      alert('Preferences saved successfully.');
    };

    // Backup & Restore
    document.getElementById('btn-export-backup').onclick = () => {
      const jsonStr = StorageController.exportStateJSON(state);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADHD-Budget-Planner-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('input-restore-backup').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          state = StorageController.importStateJSON(evt.target.result);
          document.body.dataset.theme = state.profile.theme || 'emerald-modern';
          renderCurrentScreen();
          alert('Backup restored successfully!');
        } catch {
          alert('Failed to parse backup file.');
        }
      };
      reader.readAsText(file);
    };
  }

  function init() {
    state = StorageController.loadState();
    document.body.dataset.theme = state.profile.theme || 'emerald-modern';
    bindUI();
    setScreen('dashboard');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
