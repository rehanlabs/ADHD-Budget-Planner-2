/**
 * ADHD Budget Planner - Application Controller (Edition 2: Nordic Glass)
 * Split-hero layout, top capsule navigation, interactive payday setup, and automatic onboarding.
 */
(function () {
  'use strict';

  let state = null;
  let currentScreen = 'dashboard';

  function playHapticClick() {
    if (!state || !state.profile || !state.profile.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (_) {}
  }

  function setScreen(screenId) {
    currentScreen = screenId;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.capsule-tab, .nav-tab').forEach(t => t.classList.remove('active'));

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) targetScreen.classList.add('active');

    const targetTab = document.querySelector(`.capsule-tab[data-nav="${screenId}"], .nav-tab[data-nav="${screenId}"]`);
    if (targetTab) targetTab.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'instant' });
    renderCurrentScreen();
  }

  window.setPlannerScreen = setScreen;
  window.reloadPlannerState = function (newState) {
    if (newState) {
      state = newState;
      StorageController.saveState(state);
    } else {
      state = StorageController.loadState();
    }
    document.body.dataset.theme = (state.profile && state.profile.theme) || 'emerald-modern';
    renderCurrentScreen();
  };
  window.getPlannerState = function () {
    return state;
  };

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
      balanceUpdatedAt: state.balanceUpdatedAt,
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

    // Next Payday & Income Inflow Widget
    const inflowDetails = document.getElementById('inflow-details-display');
    const inflowCountdown = document.getElementById('inflow-runway-countdown');
    if (inflowDetails) {
      const payAmtFormatted = FinanceEngine.formatCents(state.paycheckCents || 240000, state.profile.currency);
      const cycleName = (state.incomeCycle || 'biweekly').replace(/^\w/, c => c.toUpperCase());
      inflowDetails.textContent = `${safe.nextPaydayISO} • Paycheck: ${payAmtFormatted} (${cycleName})`;
    }
    if (inflowCountdown) {
      const pendingFormatted = FinanceEngine.formatCents(safe.pendingBillsCents, state.profile.currency);
      inflowCountdown.textContent = `🎯 ${safe.daysRunway} days runway • Fixed obligations reserved: ${pendingFormatted}`;
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

    // Render Today's Logged Spends (with Undo / Remove button)
    const todayBox = document.getElementById('today-spends-container');
    if (todayBox) {
      const todayISO = new Date().toISOString().slice(0, 10);
      const todayTxs = (state.transactions || []).filter(tx => tx.date === todayISO);
      if (todayTxs.length === 0) {
        todayBox.innerHTML = '';
      } else {
        todayBox.innerHTML = `
          <div style="font-size:11px;font-weight:800;color:var(--text-sub);text-transform:uppercase;letter-spacing:0.06em;margin:4px 0 8px;">
            🧾 Logged Today (${todayTxs.length})
          </div>
          ${todayTxs.map(tx => `
            <div class="list-item-card" style="padding:10px 14px;margin-bottom:8px;">
              <div class="item-info">
                <div class="item-title" style="font-size:13.5px;">${tx.title}</div>
              </div>
              <div class="card-actions-row">
                <div class="item-amount" style="font-size:13.5px;">-${FinanceEngine.formatCents(tx.amountCents, state.profile.currency)}</div>
                <button type="button" class="btn-card-delete" data-del-tx="${tx.id}" title="Undo / Remove Spend">&times;</button>
              </div>
            </div>
          `).join('')}
        `;
        todayBox.querySelectorAll('[data-del-tx]').forEach(btn => {
          btn.onclick = () => {
            state.transactions = state.transactions.filter(t => t.id !== btn.dataset.delTx);
            StorageController.saveState(state);
            playHapticClick();
            renderDashboard();
          };
        });
      }
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
      list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-sub);">No obligations logged yet. Tap + Add Obligation above.</div>`;
      return;
    }

    list.innerHTML = state.obligations.map(ob => `
      <div class="list-item-card">
        <div class="item-info">
          <div class="item-title">${ob.name}</div>
          <div class="item-sub">Due: ${ob.dueDate} ${ob.paid ? '• <span style="color:var(--color-primary);font-weight:700;">✓ PAID</span>' : '• <span style="color:var(--color-gold);">Reserved</span>'}</div>
        </div>
        <div class="card-actions-row">
          <div class="item-amount">${FinanceEngine.formatCents(ob.amountCents, state.profile.currency)}</div>
          <button type="button" class="btn-check-toggle ${ob.paid ? 'active' : ''}" data-ob-id="${ob.id}" title="Mark Paid or Unpaid">
            ${ob.paid ? '✓ Paid' : 'Mark Paid'}
          </button>
          <button type="button" class="btn-card-edit" data-edit-ob="${ob.id}" title="Edit Obligation">✏️ Edit</button>
          <button type="button" class="btn-card-delete" data-del-ob="${ob.id}" title="Remove Obligation">&times;</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-check-toggle').forEach(btn => {
      btn.onclick = () => {
        const ob = state.obligations.find(o => o.id === btn.dataset.obId);
        if (ob) {
          ob.paid = !ob.paid;
          StorageController.saveState(state);
          playHapticClick();
          renderObligations();
          renderDashboard();
        }
      };
    });

    list.querySelectorAll('[data-edit-ob]').forEach(btn => {
      btn.onclick = () => {
        const ob = state.obligations.find(o => o.id === btn.dataset.editOb);
        if (ob) {
          const heading = document.getElementById('modal-obligation-heading');
          if (heading) heading.textContent = '✏️ Edit Obligation';
          document.getElementById('obligation-edit-id').value = ob.id;
          document.getElementById('obligation-name-input').value = ob.name;
          document.getElementById('obligation-amount-input').value = (ob.amountCents / 100).toFixed(2);
          document.getElementById('obligation-date-input').value = ob.dueDate;
          document.getElementById('modal-add-obligation').style.display = 'flex';
        }
      };
    });

    list.querySelectorAll('[data-del-ob]').forEach(btn => {
      btn.onclick = () => {
        state.obligations = state.obligations.filter(o => o.id !== btn.dataset.delOb);
        StorageController.saveState(state);
        playHapticClick();
        renderObligations();
        renderDashboard();
      };
    });
  }

  function renderWishlistPause() {
    const list = document.getElementById('pause-list');
    if (!list) return;
    if (!state.wishlistPauseItems || state.wishlistPauseItems.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-sub);">Your 48-Hour Wishlist Pause is empty. Park impulse buys here!</div>`;
      return;
    }

    const now = Date.now();
    list.innerHTML = state.wishlistPauseItems.map(item => {
      const cd = FinanceEngine.getVaultCountdown(item, now);
      return `
        <div class="list-item-card">
          <div class="item-info">
            <div class="item-title">${item.name}</div>
            <div class="item-sub">
              ${cd.isUnlocked ? '<span style="color:var(--color-primary);font-weight:700;">🔓 48h Passed — Clear mind achieved!</span>' : `⏳ Cooling down: ${cd.remainingHours}h remaining`}
            </div>
          </div>
          <div class="card-actions-row">
            <div class="item-amount">${FinanceEngine.formatCents(item.amountCents, state.profile.currency)}</div>
            <button type="button" class="btn-check-toggle active" data-delete-pause="${item.id}" title="Let It Go (Save Money!)">🎉 Let It Go</button>
            <button type="button" class="btn-card-edit" data-buy-pause="${item.id}" title="Buy & Log Spend">🛒 Buy</button>
            <button type="button" class="btn-card-edit" data-edit-pause="${item.id}" title="Edit Item">✏️</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-delete-pause]').forEach(btn => {
      btn.onclick = () => {
        state.wishlistPauseItems = state.wishlistPauseItems.filter(i => i.id !== btn.dataset.deletePause);
        StorageController.saveState(state);
        playHapticClick();
        renderWishlistPause();
      };
    });

    list.querySelectorAll('[data-buy-pause]').forEach(btn => {
      btn.onclick = () => {
        const item = state.wishlistPauseItems.find(i => i.id === btn.dataset.buyPause);
        if (item) {
          state.transactions.unshift({
            id: 'tx-' + Date.now(),
            timestamp: Date.now(),
            date: new Date().toISOString().slice(0, 10),
            title: item.name,
            amountCents: item.amountCents
          });
          state.wishlistPauseItems = state.wishlistPauseItems.filter(i => i.id !== item.id);
          StorageController.saveState(state);
          playHapticClick();
          renderWishlistPause();
          renderDashboard();
        }
      };
    });

    list.querySelectorAll('[data-edit-pause]').forEach(btn => {
      btn.onclick = () => {
        const item = state.wishlistPauseItems.find(i => i.id === btn.dataset.editPause);
        if (item) {
          const heading = document.getElementById('modal-pause-heading');
          if (heading) heading.textContent = '✏️ Edit Paused Item';
          document.getElementById('pause-edit-id').value = item.id;
          document.getElementById('pause-name-input').value = item.name;
          document.getElementById('pause-amount-input').value = (item.amountCents / 100).toFixed(2);
          document.getElementById('modal-add-pause').style.display = 'flex';
        }
      };
    });
  }

  function renderPayoff() {
    const summary = document.getElementById('debt-free-summary');
    const list = document.getElementById('payoff-list');
    if (!state.debts || state.debts.length === 0) {
      if (summary) summary.textContent = '🎉 Debt Free! Zero liabilities recorded.';
      if (list) list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-sub);">No debts in your portfolio. Tap + Add Debt above to track cards or loans.</div>`;
      return;
    }

    const plan = FinanceEngine.calculateDebtPlan(state.debts, 5000);
    if (summary) {
      summary.innerHTML = `Debt Free in <strong>${plan.monthsToDebtFree} months</strong> (Saving $${(plan.totalInterestPaidCents/100).toFixed(0)} in interest)`;
    }

    if (list) {
      list.innerHTML = state.debts.map(d => `
        <div class="list-item-card">
          <div class="item-info">
            <div class="item-title">${d.name}</div>
            <div class="item-sub">Min: ${FinanceEngine.formatCents(d.minPaymentCents, state.profile.currency)}/mo • ${d.interestRate}% APR</div>
          </div>
          <div class="card-actions-row">
            <div class="item-amount">${FinanceEngine.formatCents(d.balanceCents, state.profile.currency)}</div>
            <button type="button" class="btn-card-edit" data-edit-debt="${d.id}" title="Edit Debt">✏️ Edit</button>
            <button type="button" class="btn-card-delete" data-del-debt="${d.id}" title="Remove Debt">&times;</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('[data-edit-debt]').forEach(btn => {
        btn.onclick = () => {
          const d = state.debts.find(item => item.id === btn.dataset.editDebt);
          if (d) {
            const heading = document.getElementById('modal-debt-heading');
            if (heading) heading.textContent = '✏️ Edit Debt Account';
            document.getElementById('debt-edit-id').value = d.id;
            document.getElementById('debt-name-input').value = d.name;
            document.getElementById('debt-balance-input').value = (d.balanceCents / 100).toFixed(2);
            document.getElementById('debt-min-input').value = (d.minPaymentCents / 100).toFixed(2);
            document.getElementById('debt-apr-input').value = d.interestRate;
            document.getElementById('modal-add-debt').style.display = 'flex';
          }
        };
      });

      list.querySelectorAll('[data-del-debt]').forEach(btn => {
        btn.onclick = () => {
          state.debts = state.debts.filter(item => item.id !== btn.dataset.delDebt);
          StorageController.saveState(state);
          playHapticClick();
          renderPayoff();
        };
      });
    }
  }

  function renderScratchpad() {
    const textarea = document.getElementById('scratchpad-textarea');
    if (textarea && state) {
      textarea.value = state.notes || '';
    }
  }

  function renderPreferences() {
    const chkInput = document.getElementById('settings-checking-balance');
    if (chkInput && state) {
      chkInput.value = (state.checkingCents / 100).toFixed(2);
    }
    const cycSelect = document.getElementById('settings-income-cycle');
    if (cycSelect && state) {
      cycSelect.value = state.incomeCycle || 'biweekly';
    }
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect && state && state.profile) {
      themeSelect.value = state.profile.theme || 'emerald-modern';
    }
  }

  function renderCurrentScreen() {
    renderHeader();
    if (currentScreen === 'dashboard') renderDashboard();
    if (currentScreen === 'obligations') renderObligations();
    if (currentScreen === 'pause') renderWishlistPause();
    if (currentScreen === 'payoff') renderPayoff();
    if (currentScreen === 'scratchpad') renderScratchpad();
    if (currentScreen === 'preferences') renderPreferences();
  }

  function bindUI() {
    // Nav tabs (Top capsule and legacy buttons)
    document.querySelectorAll('.capsule-tab, .nav-tab').forEach(tab => {
      tab.onclick = () => setScreen(tab.dataset.nav);
    });

    // Top Header Actions
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
    document.getElementById('hud-btn-shield').onclick = () => {
      shield.classList.add('active');
    };
    document.getElementById('btn-exit-shield').onclick = () => {
      shield.classList.remove('active');
    };

    // Payday & Income Modal
    const modalPayday = document.getElementById('modal-set-payday');
    document.getElementById('btn-edit-payday').onclick = () => {
      document.getElementById('input-payday-date').value = state.incomeAnchor || new Date().toISOString().slice(0, 10);
      document.getElementById('input-payday-amount').value = ((state.paycheckCents || 240000) / 100).toFixed(2);
      document.getElementById('select-payday-cycle').value = state.incomeCycle || 'biweekly';
      document.getElementById('input-payday-checking').value = (state.checkingCents / 100).toFixed(2);
      modalPayday.style.display = 'flex';
    };
    document.getElementById('btn-close-set-payday').onclick = () => {
      modalPayday.style.display = 'none';
    };
    document.getElementById('form-set-payday').onsubmit = (e) => {
      e.preventDefault();
      state.incomeAnchor = document.getElementById('input-payday-date').value;
      state.paycheckCents = FinanceEngine.parseToCents(document.getElementById('input-payday-amount').value);
      state.incomeCycle = document.getElementById('select-payday-cycle').value;
      state.checkingCents = FinanceEngine.parseToCents(document.getElementById('input-payday-checking').value);
      state.balanceUpdatedAt = Date.now();
      StorageController.saveState(state);
      modalPayday.style.display = 'none';
      playHapticClick();
      renderDashboard();
      renderPreferences();
    };

    // Custom Spend Modal
    const modalSpend = document.getElementById('modal-custom-spend');
    document.getElementById('hud-btn-add-spend').onclick = () => {
      document.getElementById('input-custom-spend-title').value = '';
      document.getElementById('input-custom-spend-amt').value = '';
      modalSpend.style.display = 'flex';
    };
    document.getElementById('btn-close-custom-spend').onclick = () => {
      modalSpend.style.display = 'none';
    };
    document.getElementById('form-custom-spend').onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById('input-custom-spend-title').value.trim() || 'Custom Spend';
      const amt = FinanceEngine.parseToCents(document.getElementById('input-custom-spend-amt').value);
      if (amt > 0) {
        state.transactions.unshift({
          id: 'tx-' + Date.now(),
          timestamp: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          title: title,
          amountCents: amt
        });
        StorageController.saveState(state);
        modalSpend.style.display = 'none';
        playHapticClick();
        renderDashboard();
      }
    };

    // Scratchpad auto-save
    const textarea = document.getElementById('scratchpad-textarea');
    if (textarea) {
      textarea.oninput = () => {
        state.notes = textarea.value;
        StorageController.saveState(state);
      };
    }

    // Add / Edit Obligation Modal
    document.getElementById('btn-open-add-obligation').onclick = () => {
      const heading = document.getElementById('modal-obligation-heading');
      if (heading) heading.textContent = '📅 Add Obligation';
      document.getElementById('obligation-edit-id').value = '';
      document.getElementById('obligation-name-input').value = '';
      document.getElementById('obligation-amount-input').value = '';
      document.getElementById('obligation-date-input').value = new Date().toISOString().slice(0, 10);
      document.getElementById('modal-add-obligation').style.display = 'flex';
    };
    document.getElementById('btn-close-add-obligation').onclick = () => {
      document.getElementById('modal-add-obligation').style.display = 'none';
    };
    document.getElementById('form-add-obligation').onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('obligation-edit-id').value;
      const name = document.getElementById('obligation-name-input').value.trim();
      const amt = FinanceEngine.parseToCents(document.getElementById('obligation-amount-input').value);
      const date = document.getElementById('obligation-date-input').value;
      if (name && amt > 0 && date) {
        if (editId) {
          const ob = state.obligations.find(o => o.id === editId);
          if (ob) {
            ob.name = name;
            ob.amountCents = amt;
            ob.dueDate = date;
          }
        } else {
          state.obligations.push({
            id: 'ob-' + Date.now(),
            name: name,
            amountCents: amt,
            dueDate: date,
            paid: false
          });
        }
        StorageController.saveState(state);
        document.getElementById('modal-add-obligation').style.display = 'none';
        playHapticClick();
        renderObligations();
        renderDashboard();
      }
    };

    // Add / Edit Wishlist Pause Modal
    document.getElementById('btn-open-add-pause').onclick = () => {
      const heading = document.getElementById('modal-pause-heading');
      if (heading) heading.textContent = '⏳ Wishlist Pause (48h Vault)';
      document.getElementById('pause-edit-id').value = '';
      document.getElementById('pause-name-input').value = '';
      document.getElementById('pause-amount-input').value = '';
      document.getElementById('modal-add-pause').style.display = 'flex';
    };
    document.getElementById('btn-close-add-pause').onclick = () => {
      document.getElementById('modal-add-pause').style.display = 'none';
    };
    document.getElementById('form-add-pause').onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('pause-edit-id').value;
      const name = document.getElementById('pause-name-input').value.trim();
      const amt = FinanceEngine.parseToCents(document.getElementById('pause-amount-input').value);
      if (name && amt > 0) {
        if (editId) {
          const item = state.wishlistPauseItems.find(i => i.id === editId);
          if (item) {
            item.name = name;
            item.amountCents = amt;
          }
        } else {
          state.wishlistPauseItems.push({
            id: 'wp-' + Date.now(),
            name: name,
            amountCents: amt,
            parkedAt: Date.now()
          });
        }
        StorageController.saveState(state);
        document.getElementById('modal-add-pause').style.display = 'none';
        playHapticClick();
        renderWishlistPause();
      }
    };

    // Add / Edit Debt Modal
    const modalDebt = document.getElementById('modal-add-debt');
    const btnOpenAddDebt = document.getElementById('btn-open-add-debt');
    if (btnOpenAddDebt && modalDebt) {
      btnOpenAddDebt.onclick = () => {
        const heading = document.getElementById('modal-debt-heading');
        if (heading) heading.textContent = '📉 Add Debt Account';
        document.getElementById('debt-edit-id').value = '';
        document.getElementById('debt-name-input').value = '';
        document.getElementById('debt-balance-input').value = '';
        document.getElementById('debt-min-input').value = '';
        document.getElementById('debt-apr-input').value = '';
        modalDebt.style.display = 'flex';
      };
    }
    const btnCloseAddDebt = document.getElementById('btn-close-add-debt');
    if (btnCloseAddDebt && modalDebt) {
      btnCloseAddDebt.onclick = () => {
        modalDebt.style.display = 'none';
      };
    }
    const formAddDebt = document.getElementById('form-add-debt');
    if (formAddDebt && modalDebt) {
      formAddDebt.onsubmit = (e) => {
        e.preventDefault();
        const editId = document.getElementById('debt-edit-id').value;
        const name = document.getElementById('debt-name-input').value.trim();
        const bal = FinanceEngine.parseToCents(document.getElementById('debt-balance-input').value);
        const min = FinanceEngine.parseToCents(document.getElementById('debt-min-input').value);
        const apr = parseFloat(document.getElementById('debt-apr-input').value) || 0;
        if (name && bal > 0) {
          if (!state.debts) state.debts = [];
          if (editId) {
            const d = state.debts.find(item => item.id === editId);
            if (d) {
              d.name = name;
              d.balanceCents = bal;
              d.minPaymentCents = min;
              d.interestRate = apr;
            }
          } else {
            state.debts.push({
              id: 'debt-' + Date.now(),
              name: name,
              balanceCents: bal,
              minPaymentCents: min,
              interestRate: apr
            });
          }
          StorageController.saveState(state);
          modalDebt.style.display = 'none';
          playHapticClick();
          renderPayoff();
        }
      };
    }

    // Chloe Contextual Help Badges Modal
    const modalChloeHelp = document.getElementById('modal-chloe-help');
    document.addEventListener('click', (e) => {
      const badge = e.target.closest('[data-chloe-help]');
      if (badge && modalChloeHelp && window.ChloeHelp) {
        const key = badge.dataset.chloeHelp;
        const item = window.ChloeHelp[key];
        if (item) {
          document.getElementById('chloe-help-title').textContent = '👩‍💻 ' + item.title;
          document.getElementById('chloe-help-core').textContent = item.core;
          document.getElementById('chloe-help-action').textContent = item.action;
          document.getElementById('chloe-help-brain').textContent = item.brain;
          document.getElementById('chloe-help-rule').textContent = item.rule;
          modalChloeHelp.classList.add('open');
          modalChloeHelp.style.display = 'flex';
          playHapticClick();
        }
      }
    });

    const btnCloseHelp = document.getElementById('btn-close-chloe-help');
    if (btnCloseHelp && modalChloeHelp) {
      btnCloseHelp.onclick = () => {
        modalChloeHelp.classList.remove('open');
        modalChloeHelp.style.display = 'none';
      };
    }

    // Close modals on backdrop click or Escape
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
          overlay.style.display = 'none';
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => {
          m.classList.remove('open');
          m.style.display = 'none';
        });
      }
    });

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

    // Automatic First-Time Onboarding Walkthrough (Only marked done when user exits/completes tour)
    const hasAutoGuided = localStorage.getItem('adhd_chloe_tour_v3_done') === 'true';
    if (!hasAutoGuided) {
      setTimeout(() => {
        if (window.ChloeTour && typeof window.ChloeTour.startTour === 'function') {
          window.ChloeTour.startTour();
        }
      }, 450);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        if (reg && typeof reg.update === 'function') reg.update();
      }).catch(() => {});
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
