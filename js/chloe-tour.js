/**
 * ADHD Budget Planner (Edition 2) - Chloe's Conversational Guided Tour System
 * Complete hand-holding: step-by-step DOM spotlight, typing simulation, and safe demo mode.
 */
(function (global) {
  'use strict';

  const Chloe = {};
  let currentStepIndex = 0;
  let userSnapshot = null;
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
    });
    const b = document.getElementById('chloe-target-badge');
    if (b) b.remove();
  }

  async function typeIntoField(element, text, speed = 25) {
    if (!element) return;
    element.focus();
    element.value = '';
    element.classList.add('typing-active');

    return new Promise((resolve) => {
      let currentVal = '';
      let idx = 0;
      const interval = setInterval(() => {
        currentVal += text[idx];
        idx++;
        element.value = currentVal;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        if (idx >= text.length) {
          clearInterval(interval);
          element.classList.remove('typing-active');
          element.dispatchEvent(new Event('change', { bubbles: true }));
          setTimeout(resolve, 150);
        }
      }, speed);
    });
  }

  const TOUR_STEPS = [
    {
      title: 'Hi, I’m Chloe! Welcome 🌿',
      body: 'Traditional spreadsheets overwhelm ADHD brains with 50 categories. ADHD Budget Planner does the heavy math behind the scenes so you only need to focus on <strong>one number</strong>.',
      target: null,
      badge: '',
      actionText: 'Let’s Dive In ➔',
      action: async (controller) => {
        controller.next();
      }
    },
    {
      title: 'Safe to Spend Today',
      body: 'Look at your primary hero number. This is your safe daily allowance. It automatically accounts for your upcoming rent and fixed bills before giving you your allowance!',
      target: '.hero-split-card',
      badge: '💡 The Anchor Number',
      actionText: 'Got It! What Next? ➔',
      action: async (controller) => {
        controller.next();
      }
    },
    {
      title: '1-Tap Quick Spends',
      body: 'No tedious manual entry. Grabbed a dopamine snack or fuel? Just tap a quick spend card. Let’s do a quick demo tap on <strong>Dopamine Snack</strong>!',
      target: '.quick-spend-grid',
      badge: '⚡ Tap to Log',
      actionText: 'Demo Logging $4.50 ⚡',
      action: async (controller) => {
        const btn = document.querySelector('.spend-tile-btn');
        if (btn) btn.click();
        await wait(300);
        controller.next();
      }
    },
    {
      title: 'Fixed Obligations (Bills)',
      body: 'Head over to <strong>Obligations</strong>. This is where your rent, electricity, and Wi-Fi live. When you get paid, money is automatically set aside for them.',
      target: '.capsule-tab[data-nav="obligations"]',
      badge: '📅 Tap Obligations Tab',
      actionText: 'View Obligations ➔',
      action: async (controller) => {
        const tab = document.querySelector('.capsule-tab[data-nav="obligations"]');
        if (tab) tab.click();
        await wait(300);
        controller.next();
      }
    },
    {
      title: 'Wishlist Pause (48h Impulse Vault)',
      body: 'Suddenly want that fancy tech gadget or hobby gear online? Put it in <strong>Wishlist Pause</strong>. In 48 hours, the dopamine wave fades and 82% of impulses vanish guilt-free!',
      target: '.capsule-tab[data-nav="pause"]',
      badge: '⏳ Tap Wishlist Pause',
      actionText: 'Explore Pause Shelf ➔',
      action: async (controller) => {
        const tab = document.querySelector('.capsule-tab[data-nav="pause"]');
        if (tab) tab.click();
        await wait(300);
        controller.next();
      }
    },
    {
      title: 'Burnout Shield',
      body: 'Having an executive dysfunction day? Tap <strong>Burnout Shield</strong> in the top bar. All clutter disappears, leaving only your safe allowance.',
      target: '#btn-burnout-shield',
      badge: '🛡️ One-Tap Calm',
      actionText: 'Complete Walkthrough 🎉',
      action: async (controller) => {
        const tab = document.querySelector('.nav-tab[data-nav="dashboard"]');
        if (tab) tab.click();
        controller.finish();
      }
    }
  ];

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
        <span class="chloe-step-counter">Step ${currentStepIndex + 1} of ${TOUR_STEPS.length}</span>
      </div>
      <div class="chloe-guide-body">
        <strong>${step.title}</strong><br>
        ${step.body}
      </div>
      <div class="chloe-guide-actions">
        <button type="button" class="chloe-btn-secondary" id="btn-chloe-skip">End Tour</button>
        <button type="button" class="chloe-btn-primary pulse" id="btn-chloe-act">${step.actionText}</button>
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
    clearHighlight();
    const card = document.getElementById('chloe-guide-card');
    if (card) card.remove();
    const mask = document.getElementById('chloe-tour-mask');
    if (mask) mask.classList.remove('active');
  }

  Chloe.startTour = startTour;
  Chloe.endTour = endTour;

  global.ChloeTour = Chloe;
})(typeof window !== 'undefined' ? window : this);
