/**
 * ADHD Budget Planner (Edition 2) - Chloe's Conversational Guided Tour System
 * Complete hand-holding: step-by-step DOM spotlight, HUD banner, typing simulation,
 * and zero-blur crystal clarity.
 */
(function (global) {
  'use strict';

  const Chloe = {};
  let currentStepIndex = 0;
  let isTourActive = false;
  let currentTargetEl = null;

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

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
    return el;
  }

  function clearHighlight() {
    if (currentTargetEl) {
      currentTargetEl.classList.remove('tutorial-target-active');
      if (currentTargetEl.dataset.origPos === 'static') {
        currentTargetEl.style.position = '';
        delete currentTargetEl.dataset.origPos;
      }
      const b = document.getElementById('chloe-target-badge');
      if (b) b.remove();
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

  const TOUR_STEPS = [
    {
      title: 'Hi, I’m Chloe! Welcome ❄️',
      body: 'Traditional spreadsheets overwhelm ADHD brains with 50 envelopes. The Nordic Edition does the heavy math behind the scenes so you only need to look at <strong>one number</strong>.',
      target: null,
      badge: '',
      actionText: 'Let’s Start ➔',
      action: async (controller) => {
        controller.next();
      }
    },
    {
      title: 'Safe Daily Horizon',
      body: 'Look at your primary anchor number. This is what you can spend today without touching money promised to bills or rent. It automatically recalibrates every morning!',
      target: '.hero-split-card',
      badge: '💡 Safe Today',
      actionText: 'Next: Inflow Runway ➔',
      action: async (controller) => {
        controller.next();
      }
    },
    {
      title: 'Payday & Inflow Stream',
      body: 'Your cash runway calculates exactly how many days remain until your next paycheck. Tap <strong>Adjust Inflow</strong> anytime to update your payday date and balance.',
      target: '.payday-inflow-card',
      badge: '💰 Payday Runway',
      actionText: 'Next: Quick Spends ➔',
      action: async (controller) => {
        controller.next();
      }
    },
    {
      title: '1-Tap Rapid Velocity Logs',
      body: 'No tedious manual category selection. Grabbed a dopamine snack, coffee, or fuel? One tap records it and adjusts your remaining daily allowance instantly.',
      target: '.quick-spend-grid',
      badge: '⚡ Tap to Log',
      actionText: 'Next: Obligations ➔',
      action: async (controller) => {
        controller.next();
      }
    },
    {
      title: 'Fixed Commitments (Bills)',
      body: 'Head to <strong>Obligations</strong>. Your bills are sorted chronologically by due date. Only bills due before your next payday are reserved from today’s pool.',
      target: '.capsule-tab[data-nav="obligations"]',
      badge: '📅 View Obligations',
      actionText: 'Switch to Obligations ➔',
      action: async (controller) => {
        const tab = document.querySelector('.capsule-tab[data-nav="obligations"]');
        if (tab) tab.click();
        await wait(250);
        controller.next();
      }
    },
    {
      title: '48h Wishlist Cooling Chamber',
      body: 'Sudden impulse to buy tech, clothing, or gadgets? Put it in <strong>Wishlist Pause</strong>. In 48 hours, the dopamine wave fades and 82% of impulses vanish guilt-free!',
      target: '.capsule-tab[data-nav="pause"]',
      badge: '⏳ Cooling Chamber',
      actionText: 'Switch to Pause ➔',
      action: async (controller) => {
        const tab = document.querySelector('.capsule-tab[data-nav="pause"]');
        if (tab) tab.click();
        await wait(250);
        controller.next();
      }
    },
    {
      title: 'Burnout Shield',
      body: 'Having an executive dysfunction day? Tap <strong>Burnout Shield</strong> in the top bar. All complexity vanishes, leaving only your safe spending number.',
      target: '#btn-burnout-shield',
      badge: '🛡️ Low Bandwidth',
      actionText: 'Next: Tab Guides ➔',
      action: async (controller) => {
        const tab = document.querySelector('.capsule-tab[data-nav="dashboard"]');
        if (tab) tab.click();
        await wait(250);
        controller.next();
      }
    },
    {
      title: 'Instant Tab & Feature Guides ❓',
      body: 'Notice the small <strong>?</strong> badges across every screen and tab. Tap any <strong>?</strong> anytime to open a quick tactical guide with ADHD tips!',
      target: '.nordic-help-badge',
      badge: '❓ Tap for Tab Info',
      actionText: 'Finish Walkthrough 🎉',
      action: async (controller) => {
        controller.finish();
      }
    }
  ];

  function updateHudBar() {
    let hud = document.getElementById('tutorial-hud-bar');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'tutorial-hud-bar';
      hud.className = 'tutorial-hud-bar';
      document.body.appendChild(hud);
    }
    hud.innerHTML = `
      <div class="tutorial-hud-title">
        <span>👩‍💻</span>
        <span>Chloe Guide</span>
        <span class="tutorial-hud-step-pill">Step ${currentStepIndex + 1} of ${TOUR_STEPS.length}</span>
      </div>
      <button type="button" class="tutorial-hud-exit" id="btn-hud-exit">Exit Tour ✕</button>
    `;
    const exitBtn = document.getElementById('btn-hud-exit');
    if (exitBtn) {
      exitBtn.onclick = () => endTour();
    }
  }

  function showTourCard(step, controller) {
    let card = document.getElementById('chloe-guide-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'chloe-guide-card';
      card.className = 'chloe-guide-card';
      document.body.appendChild(card);
    }

    card.innerHTML = `
      <div class="chloe-guide-header">
        <div class="chloe-guide-identity">
          <span class="chloe-avatar">👩‍💻</span>
          <span class="chloe-name">Chloe’s Hand-Holding Tour</span>
        </div>
        <span class="chloe-step-counter">Step ${currentStepIndex + 1} / ${TOUR_STEPS.length}</span>
      </div>
      <div class="chloe-guide-body">
        <strong>${step.title}</strong><br>
        ${step.body}
      </div>
      <div class="chloe-guide-actions">
        <button type="button" class="chloe-btn-secondary" id="btn-chloe-skip">Exit Tour</button>
        <button type="button" class="chloe-btn-primary" id="btn-chloe-act">${step.actionText}</button>
      </div>
    `;

    document.getElementById('btn-chloe-skip').onclick = () => controller.finish();
    document.getElementById('btn-chloe-act').onclick = () => step.action(controller);
  }

  function renderStep() {
    if (currentStepIndex >= TOUR_STEPS.length) {
      endTour();
      return;
    }
    const step = TOUR_STEPS[currentStepIndex];
    updateHudBar();

    if (step.target) {
      highlightTarget(step.target, step.badge);
    } else {
      clearHighlight();
    }

    const controller = {
      next: () => {
        currentStepIndex++;
        renderStep();
      },
      finish: () => {
        endTour();
      }
    };

    showTourCard(step, controller);
  }

  function startTour() {
    if (isTourActive) return;
    isTourActive = true;
    currentStepIndex = 0;
    document.body.classList.add('tutorial-active');

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
    isTourActive = false;
    document.body.classList.remove('tutorial-active');
    clearHighlight();

    const hud = document.getElementById('tutorial-hud-bar');
    if (hud) hud.remove();

    const card = document.getElementById('chloe-guide-card');
    if (card) card.remove();

    const mask = document.getElementById('chloe-tour-mask');
    if (mask) mask.classList.remove('active');

    try {
      localStorage.setItem('adhd_chloe_tour_v2_done', 'true');
    } catch (e) {}

    // Return to dashboard screen smoothly
    const dashTab = document.querySelector('.capsule-tab[data-nav="dashboard"]');
    if (dashTab) dashTab.click();
  }

  Chloe.startTour = startTour;
  Chloe.endTour = endTour;

  global.ChloeTour = Chloe;
})(typeof window !== 'undefined' ? window : this);
