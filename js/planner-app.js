/**
 * ADHD Budget Planner - Application Controller (Edition 2)
 * Manages screen routing, live reactivity, modal dialogs, and offline caching.
 */
(function () {
  'use strict';

  let state = null;
  let currentScreen = 'today';

  // --- Haptic Sound Feedback ---
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

  function renderToday() {
    const safe = FinanceEngine.calculateSafeToSpend(state);
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

    // Render Quick Spends Grid
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
              date: new Date().toISOString().slice(0, 10),
              title: qs.title,
              amountCents: qs.amountCents
            });
            StorageController.saveState(state);
            playHapticClick();
            renderToday();
          }
        };
      });
    }

    // Update Zombie Mode Hero
    const zombieAmt = document.getElementById('zombie-hero-amount');
    if (zombieAmt) {
      zombieAmt.textContent = FinanceEngine.formatCents(safe.safeToSpendTodayCents, state.profile.currency);
    }
  }

  function renderBills() {
    const list = document.getElementById('bill-list');
    if (!list) return;
    if (!state.bills || state.bills.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--text-sub);padding:24px;">No recurring bills added. Tap "+ Add Bill" to protect upcoming rent or utilities.</p>`;
      return;
    }

    list.innerHTML = state.bills.map(b => `
      <div class="item-card">
        <div class="item-header">
          <div class="item-title"><span>📅</span> <span>${b.name}</span></div>
          <div class="item-amount">${FinanceEngine.formatCents(b.amountCents, state.profile.currency)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-sub);">
          <span>Due: ${b.dueDate}</span>
          <button type="button" class="btn-primary-action ${b.paid ? 'paid' : ''}" data-bill-id="${b.id}">
            ${b.paid ? '✓ Paid' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-primary-action').forEach(btn => {
      btn.onclick = () => {
        const bill = state.bills.find(b => b.id === btn.dataset.billId);
        if (bill) {
          bill.paid = !bill.paid;
          playHapticClick();
          StorageController.saveState(state);
          renderBills();
          renderToday();
        }
      };
    });
  }

  function renderVault() {
    const list = document.getElementById('vault-list');
    if (!list) return;
    if (!state.vaultItems || state.vaultItems.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--text-sub);padding:24px;">Your Impulse Vault is clear. When an impulse urge hits, park it here for 48 hours to cool down!</p>`;
      return;
    }

    const now = Date.now();
    list.innerHTML = state.vaultItems.map(item => {
      const cd = FinanceEngine.getVaultCountdown(item, now);
      return `
        <div class="item-card">
          <div class="item-header">
            <div class="item-title"><span>⏳</span> <span>${item.name}</span></div>
            <div class="item-amount">${FinanceEngine.formatCents(item.amountCents, state.profile.currency)}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-sub);">
            <span>${cd.isUnlocked ? '✨ Unlocked! Do you still genuinely want this?' : `Cooldown: ${cd.remainingHours}h remaining`}</span>
            <button type="button" class="btn-primary-action" data-vault-id="${item.id}">Release & Save</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.btn-primary-action').forEach(btn => {
      btn.onclick = () => {
        const idx = state.vaultItems.findIndex(i => i.id === btn.dataset.vaultId);
        if (idx !== -1) {
          state.vaultItems.splice(idx, 1);
          playHapticClick();
          StorageController.saveState(state);
          renderVault();
        }
      };
    });
  }

  function renderDebt() {
    const list = document.getElementById('debt-list');
    if (!list) return;
    const plan = FinanceEngine.calculateDebtPlan(state.debts, 5000); // Snowball calculation
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

  function renderNotes() {
    const textarea = document.getElementById('brain-dump-textarea');
    if (textarea && state.notes !== undefined) {
      textarea.value = state.notes;
    }
  }

  function renderCurrentScreen() {
    renderHeader();
    if (currentScreen === 'today') renderToday();
    if (currentScreen === 'bills') renderBills();
    if (currentScreen === 'vault') renderVault();
    if (currentScreen === 'debt') renderDebt();
    if (currentScreen === 'notes') renderNotes();
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
      AssistantMaya.launchTour();
    };

    // Zombie Mode Overlay
    const zombie = document.getElementById('zombie-overlay');
    document.getElementById('btn-zombie-mode').onclick = () => {
      zombie.classList.add('active');
    };
    document.getElementById('btn-exit-zombie').onclick = () => {
      zombie.classList.remove('active');
    };

    // Notes auto-save
    const textarea = document.getElementById('brain-dump-textarea');
    if (textarea) {
      textarea.oninput = () => {
        state.notes = textarea.value;
        StorageController.saveState(state);
      };
    }

    // Add Bill Modal
    document.getElementById('btn-open-add-bill').onclick = () => {
      document.getElementById('modal-add-bill').classList.add('open');
    };
    document.getElementById('btn-close-add-bill').onclick = () => {
      document.getElementById('modal-add-bill').classList.remove('open');
    };
    document.getElementById('form-add-bill').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('bill-name-input').value;
      const amt = FinanceEngine.parseToCents(document.getElementById('bill-amount-input').value);
      const date = document.getElementById('bill-date-input').value;
      if (name && amt > 0 && date) {
        state.bills.push({
          id: 'bill-' + Date.now(),
          name: name,
          amountCents: amt,
          dueDate: date,
          paid: false
        });
        StorageController.saveState(state);
        document.getElementById('modal-add-bill').classList.remove('open');
        playHapticClick();
        renderBills();
        renderToday();
      }
    };

    // Add Vault Modal
    document.getElementById('btn-open-add-vault').onclick = () => {
      document.getElementById('modal-add-vault').classList.add('open');
    };
    document.getElementById('btn-close-add-vault').onclick = () => {
      document.getElementById('modal-add-vault').classList.remove('open');
    };
    document.getElementById('form-add-vault').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('vault-name-input').value;
      const amt = FinanceEngine.parseToCents(document.getElementById('vault-amount-input').value);
      if (name && amt > 0) {
        state.vaultItems.push({
          id: 'v-' + Date.now(),
          name: name,
          amountCents: amt,
          parkedAt: Date.now()
        });
        StorageController.saveState(state);
        document.getElementById('modal-add-vault').classList.remove('open');
        playHapticClick();
        renderVault();
      }
    };

    // Settings Form
    document.getElementById('settings-checking-balance').value = (state.checkingCents / 100).toFixed(2);
    document.getElementById('settings-income-cycle').value = state.incomeCycle || 'biweekly';
    document.getElementById('settings-theme-select').value = state.profile.theme || 'emerald-modern';

    document.getElementById('form-planner-settings').onsubmit = (e) => {
      e.preventDefault();
      state.checkingCents = FinanceEngine.parseToCents(document.getElementById('settings-checking-balance').value);
      state.incomeCycle = document.getElementById('settings-income-cycle').value;
      state.profile.theme = document.getElementById('settings-theme-select').value;
      document.body.dataset.theme = state.profile.theme;
      StorageController.saveState(state);
      playHapticClick();
      renderToday();
      alert('Settings saved successfully.');
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
    setScreen('today');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
