/**
 * ADHD Budget Planner (Edition 2) - Chloe's Conversational Guided Tour System
 * Strict capture-phase UX guardrails (blocks non-tour clicks & nudges user),
 * interactive modal hand-holding, auto-typing simulation, and safe state snapshot.
 */
(function (global) {
  'use strict';

  const Chloe = {};
  let currentStepIndex = 0;
  let isTourActive = false;
  let currentTargetEl = null;
  let currentStepActionHandler = null;
  let isActionRunning = false;
  let userStateSnapshot = null;

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // ========================================================
  // 1. SPOTLIGHT, TYPING SIMULATION & MODAL BANNER HELPERS
  // ========================================================
  function highlightTarget(target, badgeText = '👩‍💻 Tap here') {
    clearHighlight();
    if (!target) return null;
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return null;

    currentTargetEl = el;
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    el.classList.add('tutorial-target-active');

    if (badgeText) {
      const badge = document.createElement('span');
      badge.className = 'chloe-target-badge';
      badge.id = 'chloe-target-badge';
      badge.innerHTML = `<span>${badgeText}</span>`;

      const isVoid = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
      const host = isVoid ? el.parentElement : el;
      if (host) {
        const pos = window.getComputedStyle(host).position;
        if (pos === 'static') {
          host.dataset.origPos = 'static';
          host.style.position = 'relative';
        }
        host.appendChild(badge);
      }
    }
    return el;
  }

  function clearHighlight() {
    if (currentTargetEl) {
      currentTargetEl.classList.remove('tutorial-target-active');
      if (currentTargetEl.dataset.origPos === 'static') {
        currentTargetEl.style.position = '';
        delete currentTargetEl.dataset.origPos;
      }
      currentTargetEl = null;
    }
    document.querySelectorAll('.tutorial-target-active').forEach(el => {
      el.classList.remove('tutorial-target-active');
      if (el.dataset.origPos === 'static') {
        el.style.position = '';
        delete el.dataset.origPos;
      }
    });
    const b = document.getElementById('chloe-target-badge');
    if (b) b.remove();
  }

  async function typeIntoField(inputEl, text, speed = 22) {
    if (!inputEl) return;
    inputEl.focus();
    inputEl.value = '';
    inputEl.classList.add('typing-active');
    const str = String(text);
    for (let i = 0; i < str.length; i++) {
      inputEl.value += str[i];
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(speed);
    }
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(120);
    inputEl.classList.remove('typing-active');
  }

  function closeAllModalsAndOverlays() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.classList.remove('open');
      m.style.display = 'none';
    });
    const shield = document.getElementById('burnout-shield-overlay');
    if (shield) shield.classList.remove('active');
    removeModalBanner();
  }

  function removeModalBanner() {
    const banner = document.getElementById('chloe-modal-banner');
    if (banner) banner.remove();
    const card = document.getElementById('chloe-guide-card');
    if (card) card.style.display = '';
  }

  function showModalBanner(modalSelector, opts) {
    const modal = document.querySelector(modalSelector);
    if (!modal) return;
    const box = modal.querySelector('.modal-box') || modal;

    // Hide bottom card while inside modal so mobile portrait viewports are 100% clear
    const card = document.getElementById('chloe-guide-card');
    if (card) card.style.display = 'none';

    let banner = document.getElementById('chloe-modal-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'chloe-modal-banner';
      banner.className = 'chloe-modal-banner';
      box.prepend(banner);
    }

    currentStepActionHandler = opts.actionHandler || null;

    banner.innerHTML = `
      <div class="chloe-guide-header" style="padding-bottom:6px;">
        <div class="chloe-guide-identity">
          <span class="chloe-avatar">👩‍💻</span>
          <span class="chloe-name">Chloe’s Interactive Setup</span>
        </div>
        <span class="chloe-step-counter">Step ${currentStepIndex + 1} / ${TOUR_STEPS.length}</span>
      </div>
      <div class="chloe-guide-body" id="chloe-modal-msg">${opts.message}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button type="button" class="chloe-btn-primary pulse" id="btn-chloe-modal-act">${opts.actionText}</button>
      </div>
    `;

    const btn = document.getElementById('btn-chloe-modal-act');
    if (btn) {
      btn.onclick = () => triggerCurrentStepAction();
    }
  }

  async function triggerCurrentStepAction() {
    if (isActionRunning || typeof currentStepActionHandler !== 'function') return;
    isActionRunning = true;
    const fn = currentStepActionHandler;
    try {
      await fn();
    } finally {
      isActionRunning = false;
    }
  }

  // ========================================================
  // 2. STRICT CAPTURE-PHASE UX GUARDRAILS (LOCK NON-TOUR UI)
  // ========================================================
  function handleTourClickGuard(e) {
    if (!isTourActive) return;
    if (!e.isTrusted) return; // Always allow programmatic clicks from tour scripts

    const isGuideCard = e.target.closest('#chloe-guide-card');
    const isModalBanner = e.target.closest('#chloe-modal-banner');
    const isHudBar = e.target.closest('#tutorial-hud-bar');

    if (isGuideCard || isModalBanner || isHudBar) {
      return; // Allowed tour controls
    }

    const isTarget = currentTargetEl && (currentTargetEl === e.target || currentTargetEl.contains(e.target));
    if (isTarget && typeof currentStepActionHandler === 'function') {
      // User tapped the highlighted target directly! Run the controlled step action cleanly.
      e.preventDefault();
      e.stopPropagation();
      triggerCurrentStepAction();
      return;
    }

    // Block all other clicks across the app (tabs, buttons, inputs, backdrops, ? badges)
    e.preventDefault();
    e.stopPropagation();
    triggerEncouragementNudge();
  }

  function handleTourKeyGuard(e) {
    if (!isTourActive || !e.isTrusted) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      triggerEncouragementNudge();
    }
  }

  function triggerEncouragementNudge() {
    const banner = document.getElementById('chloe-modal-banner');
    const card = document.getElementById('chloe-guide-card');
    const activeContainer = banner || (card && card.style.display !== 'none' ? card : null);
    if (!activeContainer) return;

    activeContainer.classList.remove('nudge');
    void activeContainer.offsetWidth; // Reflow
    activeContainer.classList.add('nudge');

    let toast = activeContainer.querySelector('.chloe-nudge-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'chloe-nudge-toast';
      toast.textContent = "🔒 Tour Lock Active: Tap Chloe's highlighted step (or Exit Tour at top) to move forward!";
      const bodyEl = activeContainer.querySelector('.chloe-guide-body');
      if (bodyEl && bodyEl.parentNode) {
        bodyEl.parentNode.insertBefore(toast, bodyEl.nextSibling);
      } else {
        activeContainer.appendChild(toast);
      }
      setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
      }, 3000);
    }

    const primaryBtn = activeContainer.querySelector('.chloe-btn-primary');
    if (primaryBtn) primaryBtn.classList.add('pulse');
  }

  // ========================================================
  // 3. INTERACTIVE HAND-HOLDING TOUR STEPS
  // ========================================================
  const TOUR_STEPS = [
    // STEP 1: Payday & Income Runway Setup
    {
      title: 'Step 1: Set Your Payday & Inflow 💵',
      init: async () => {
        closeAllModalsAndOverlays();
        if (window.setPlannerScreen) window.setPlannerScreen('dashboard');
        await wait(100);

        highlightTarget('#btn-edit-payday', '👉 1. Tap Set Payday');

        showTourCard({
          title: 'Hi, I’m Chloe! Let’s Set Your Runway ❄️',
          body: 'Traditional budgets fail ADHD brains with 50 categories. Here, we start with your <strong>Next Payday & Checking Balance</strong>.<br><br>👉 Tap <strong>⚙️ Set Payday</strong> (or the button below) to open the scheduler:',
          actionText: '👉 Open Payday Scheduler ⚙️',
          actionHandler: async () => {
            const btn = document.getElementById('btn-edit-payday');
            if (btn) btn.click();
            await wait(220);

            // Sub-step 1B: Inside Payday Modal
            highlightTarget('#input-payday-amount', '👉 Paycheck ($)');
            showModalBanner('#modal-set-payday', {
              message: '<strong>Inside Payday Setup:</strong> Watch me enter a <strong>$2,400.00</strong> bi-weekly paycheck and <strong>$1,650.00</strong> checking balance:',
              actionText: '✨ Auto-Fill Payday & Balance',
              actionHandler: async () => {
                const amtInput = document.getElementById('input-payday-amount');
                const chkInput = document.getElementById('input-payday-checking');
                const cycSelect = document.getElementById('select-payday-cycle');
                if (amtInput) await typeIntoField(amtInput, '2400.00', 20);
                if (cycSelect) {
                  cycSelect.value = 'biweekly';
                  cycSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                highlightTarget('#input-payday-checking', '👉 Checking ($)');
                if (chkInput) await typeIntoField(chkInput, '1650.00', 20);

                const saveBtn = document.querySelector('#form-set-payday button[type="submit"]');
                highlightTarget(saveBtn, '👉 Tap Update');

                showModalBanner('#modal-set-payday', {
                  message: 'Numbers are locked in! Now tap <strong>Update Payday & Runway 🚀</strong> to calculate your daily horizon:',
                  actionText: '🚀 Save Payday & Runway',
                  actionHandler: async () => {
                    const form = document.getElementById('form-set-payday');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    removeModalBanner();
                    clearHighlight();
                    await wait(250);
                    nextStep();
                  }
                });
              }
            });
          }
        });
      }
    },

    // STEP 2: Safe Daily Horizon & Math Breakdown
    {
      title: 'Step 2: Safe to Spend Today ✨',
      init: async () => {
        closeAllModalsAndOverlays();
        if (window.setPlannerScreen) window.setPlannerScreen('dashboard');
        await wait(100);

        highlightTarget('.hero-split-card', '💡 Your Single Number');
        const safeText = (document.getElementById('hero-safe-amount') || {}).textContent || '$68.75';

        showTourCard({
          title: 'Your Safe Daily Horizon ✨',
          body: `Look at your hero card: <strong>${safeText} Safe to Spend Today</strong>.<br>` +
                `We automatically subtract upcoming bills from your checking balance and divide the rest across your runway days—so you never accidentally spend rent money!`,
          actionText: 'Next: Test 1-Tap Velocity Spend ➔',
          actionHandler: async () => {
            nextStep();
          }
        });
      }
    },

    // STEP 3: 1-Tap Rapid Velocity Spend
    {
      title: 'Step 3: 1-Tap Fast Spends ⚡',
      init: async () => {
        closeAllModalsAndOverlays();
        if (window.setPlannerScreen) window.setPlannerScreen('dashboard');
        await wait(100);

        const firstTile = document.querySelector('#quick-spend-grid .spend-tile-btn') || document.querySelector('#quick-spend-grid');
        highlightTarget(firstTile, '⚡ Tap to Log $4.50');

        showTourCard({
          title: '1-Tap Rapid Velocity Spends ⚡',
          body: 'No tedious receipt typing! Grabbed a dopamine snack or coffee? Tap the highlighted <strong>⚡ Dopamine Snack ($4.50)</strong> tile (or the button below) and watch your Safe to Spend number update live:',
          actionText: '⚡ Log $4.50 Dopamine Snack',
          actionHandler: async () => {
            const tile = document.querySelector('#quick-spend-grid .spend-tile-btn');
            if (tile) tile.click();
            await wait(220);

            highlightTarget('#hero-safe-amount', '✨ Recalibrated!');
            const updatedSafe = (document.getElementById('hero-safe-amount') || {}).textContent || '';

            showTourCard({
              title: 'Instant Recalibration! 🎯',
              body: `Boom! Your Safe to Spend Today automatically adjusted to <strong>${updatedSafe}</strong> in one tap. Ready to see where fixed bills are protected?`,
              actionText: 'Next: Fixed Obligations ➔',
              actionHandler: async () => {
                nextStep();
              }
            });
          }
        });
      }
    },

    // STEP 4: Fixed Obligations (Tab Switch + Interactive Modal)
    {
      title: 'Step 4: Fixed Obligations 📋',
      init: async () => {
        closeAllModalsAndOverlays();
        if (window.setPlannerScreen) window.setPlannerScreen('dashboard');
        await wait(100);

        const obTab = document.querySelector('.capsule-tab[data-nav="obligations"]');
        highlightTarget(obTab, '👉 1. Tap Obligations');

        showTourCard({
          title: 'Locking Away Fixed Bills 📋',
          body: 'Essential commitments (rent, Wi-Fi, utilities) live in <strong>📋 Obligations</strong>. Tap the highlighted <strong>Obligations</strong> tab in the top bar:',
          actionText: '👉 Open Obligations Tab 📋',
          actionHandler: async () => {
            if (window.setPlannerScreen) window.setPlannerScreen('obligations');
            await wait(200);

            highlightTarget('#btn-open-add-obligation', '👉 2. Tap + Add Obligation');
            showTourCard({
              title: 'Add a Protected Bill 🛡️',
              body: 'Every bill due before your next payday is automatically held back from your daily allowance. Tap <strong>+ Add Obligation</strong> to test adding a bill:',
              actionText: '👉 Open + Add Obligation',
              actionHandler: async () => {
                const addBtn = document.getElementById('btn-open-add-obligation');
                if (addBtn) addBtn.click();
                await wait(200);

                highlightTarget('#obligation-name-input', '👉 Bill Name');
                showModalBanner('#modal-add-obligation', {
                  message: 'Watch me enter <strong>Nordic Fiber Wi-Fi ($65.00)</strong> due in 5 days:',
                  actionText: '✨ Auto-Fill Bill Details',
                  actionHandler: async () => {
                    const nameIn = document.getElementById('obligation-name-input');
                    const amtIn = document.getElementById('obligation-amount-input');
                    const dateIn = document.getElementById('obligation-date-input');
                    if (nameIn) await typeIntoField(nameIn, 'Nordic Fiber Wi-Fi', 18);
                    highlightTarget('#obligation-amount-input', '👉 Amount ($)');
                    if (amtIn) await typeIntoField(amtIn, '65.00', 20);
                    if (dateIn) {
                      const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
                      dateIn.value = d;
                      dateIn.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    const saveBtn = document.querySelector('#form-add-obligation button[type="submit"]');
                    highlightTarget(saveBtn, '👉 Tap Save');

                    showModalBanner('#modal-add-obligation', {
                      message: 'Now tap <strong>Save Obligation 🌿</strong> to reserve this bill from your spendable pool:',
                      actionText: '🌿 Save Obligation Now',
                      actionHandler: async () => {
                        const form = document.getElementById('form-add-obligation');
                        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                        removeModalBanner();
                        clearHighlight();
                        await wait(250);
                        nextStep();
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    },

    // STEP 5: 48-Hour Wishlist Cooling Chamber
    {
      title: 'Step 5: 48h Wishlist Vault ⏳',
      init: async () => {
        closeAllModalsAndOverlays();
        const pauseTab = document.querySelector('.capsule-tab[data-nav="pause"]');
        highlightTarget(pauseTab, '👉 Tap Wishlist Tab');

        showTourCard({
          title: '48-Hour Impulse Cooling Chamber ⏳',
          body: 'Sudden urge to buy gadgets or clothes late at night? Tap the highlighted <strong>⏳ Wishlist</strong> tab to see your 48-hour dopamine shield:',
          actionText: '👉 Open Wishlist Vault ⏳',
          actionHandler: async () => {
            if (window.setPlannerScreen) window.setPlannerScreen('pause');
            await wait(200);

            highlightTarget('#btn-open-add-pause', '⏳ Park Impulse Urges');
            showTourCard({
              title: 'Defeat Impulse Buying Guilt-Free 🧠',
              body: 'When you park an item here for 48 hours, the initial dopamine wave fades—and <strong>82% of ADHD impulse urges vanish automatically</strong> without spending a dime!',
              actionText: 'Next: Burnout Shield & Help Badges ➔',
              actionHandler: async () => {
                nextStep();
              }
            });
          }
        });
      }
    },

    // STEP 6: Burnout Shield & Contextual ? Help Badges
    {
      title: 'Step 6: Burnout Shield & ? Guides 🛡️',
      init: async () => {
        closeAllModalsAndOverlays();
        if (window.setPlannerScreen) window.setPlannerScreen('dashboard');
        await wait(150);

        highlightTarget('#btn-burnout-shield', '🛡️ Try Burnout Shield');

        showTourCard({
          title: 'Executive Burnout Shield 🛡️',
          body: 'Having an overwhelmed, low-bandwidth day? Tap <strong>🛡️ Shield</strong> in the header to hide 90% of the app and show only your single safe number:',
          actionText: '🛡️ Turn Burnout Shield ON',
          actionHandler: async () => {
            const shieldBtn = document.getElementById('btn-burnout-shield');
            if (shieldBtn) shieldBtn.click();
            await wait(220);

            highlightTarget('#btn-exit-shield', '🌿 Exit Shield');
            showTourCard({
              title: 'Zero Sensory Overload 🌙',
              body: 'All charts and lists vanish—leaving only your safe daily allowance. Now tap <strong>Exit Burnout Shield 🌿</strong> to return:',
              actionText: '🌿 Turn Burnout Shield OFF',
              actionHandler: async () => {
                const exitBtn = document.getElementById('btn-exit-shield');
                if (exitBtn) exitBtn.click();
                await wait(200);

                const helpBadge = document.querySelector('.nordic-help-badge');
                highlightTarget(helpBadge, '❓ Tap Any ? Anytime');

                showTourCard({
                  title: 'You’re 100% Ready! 🎉',
                  body: 'Notice the glowing <strong>?</strong> badges on every tab and card—tap any <strong>?</strong> anytime for a 4-tier tactical guide.<br><br>Tap Finish below to restore your personal budget!',
                  actionText: 'Finish Walkthrough 🎉',
                  actionHandler: async () => {
                    endTour();
                  }
                });
              }
            });
          }
        });
      }
    }
  ];

  // ========================================================
  // 4. HUD & GUIDE CARD RENDERING
  // ========================================================
  function updateHudBar() {
    let hud = document.getElementById('tutorial-hud-bar');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'tutorial-hud-bar';
      hud.className = 'tutorial-hud-bar';
      document.body.prepend(hud);
    }
    hud.innerHTML = `
      <div class="tutorial-hud-title">
        <span>👩‍💻</span>
        <span>Chloe’s Tour</span>
        <span class="tutorial-hud-step-pill">Step ${currentStepIndex + 1} of ${TOUR_STEPS.length}</span>
        <span class="tutorial-hud-sub">(Personal budget safely paused)</span>
      </div>
      <button type="button" class="tutorial-hud-exit" id="btn-hud-exit">Exit Tour ✕</button>
    `;
    const exitBtn = document.getElementById('btn-hud-exit');
    if (exitBtn) {
      exitBtn.onclick = () => endTour();
    }
  }

  function showTourCard(opts) {
    removeModalBanner();
    let card = document.getElementById('chloe-guide-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'chloe-guide-card';
      card.className = 'chloe-guide-card';
      document.body.appendChild(card);
    }
    card.style.display = '';

    currentStepActionHandler = opts.actionHandler || null;

    card.innerHTML = `
      <div class="chloe-guide-header">
        <div class="chloe-guide-identity">
          <span class="chloe-avatar">👩‍💻</span>
          <span class="chloe-name">Chloe’s Hand-Holding Tour</span>
        </div>
        <span class="chloe-step-counter">Step ${currentStepIndex + 1} / ${TOUR_STEPS.length}</span>
      </div>
      <div class="chloe-guide-body">
        <strong>${opts.title}</strong><br>
        ${opts.body}
      </div>
      <div class="chloe-guide-actions">
        <div class="chloe-nav-group">
          <button type="button" class="chloe-btn-secondary" id="btn-chloe-prev" ${currentStepIndex === 0 ? 'disabled' : ''}>← Back</button>
          <button type="button" class="chloe-btn-secondary" id="btn-chloe-skip">Skip</button>
        </div>
        <button type="button" class="chloe-btn-primary pulse" id="btn-chloe-act">${opts.actionText}</button>
      </div>
    `;

    const prevBtn = document.getElementById('btn-chloe-prev');
    if (prevBtn) prevBtn.onclick = () => prevStep();

    const skipBtn = document.getElementById('btn-chloe-skip');
    if (skipBtn) skipBtn.onclick = () => endTour();

    const actBtn = document.getElementById('btn-chloe-act');
    if (actBtn) actBtn.onclick = () => triggerCurrentStepAction();
  }

  function renderStep() {
    if (currentStepIndex >= TOUR_STEPS.length) {
      endTour();
      return;
    }
    updateHudBar();
    const step = TOUR_STEPS[currentStepIndex];
    if (step && typeof step.init === 'function') {
      step.init();
    }
  }

  function nextStep() {
    currentStepIndex++;
    if (currentStepIndex >= TOUR_STEPS.length) {
      endTour();
    } else {
      renderStep();
    }
  }

  function prevStep() {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      renderStep();
    }
  }

  function startTour() {
    if (isTourActive) return;

    // Snapshot user's real state so tutorial actions never overwrite personal data
    if (window.getPlannerState) {
      try {
        userStateSnapshot = JSON.parse(JSON.stringify(window.getPlannerState()));
      } catch (_) {}
    }

    isTourActive = true;
    currentStepIndex = 0;
    document.body.classList.add('tutorial-active');

    // Register strict capture-phase click and key guardrails
    document.addEventListener('click', handleTourClickGuard, true);
    document.addEventListener('keydown', handleTourKeyGuard, true);

    let mask = document.getElementById('chloe-tour-mask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'chloe-tour-mask';
      mask.className = 'tutorial-mask-overlay';
      document.body.appendChild(mask);
    }
    mask.classList.add('active');

    renderStep();
  }

  function endTour() {
    if (!isTourActive) return;
    isTourActive = false;
    currentStepActionHandler = null;
    document.body.classList.remove('tutorial-active');

    document.removeEventListener('click', handleTourClickGuard, true);
    document.removeEventListener('keydown', handleTourKeyGuard, true);

    closeAllModalsAndOverlays();
    clearHighlight();

    const hud = document.getElementById('tutorial-hud-bar');
    if (hud) hud.remove();

    const card = document.getElementById('chloe-guide-card');
    if (card) card.remove();

    const mask = document.getElementById('chloe-tour-mask');
    if (mask) mask.classList.remove('active');

    // Restore user's real state snapshot cleanly
    if (userStateSnapshot && window.reloadPlannerState) {
      window.reloadPlannerState(userStateSnapshot);
      userStateSnapshot = null;
    }

    try {
      localStorage.setItem('adhd_chloe_tour_v3_done', 'true');
    } catch (_) {}

    if (window.setPlannerScreen) {
      window.setPlannerScreen('dashboard');
    }
  }

  Chloe.startTour = startTour;
  Chloe.endTour = endTour;
  Chloe.isActive = () => isTourActive;

  global.ChloeTour = Chloe;
})(typeof window !== 'undefined' ? window : this);
