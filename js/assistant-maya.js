/**
 * ADHD Budget Planner - Maya's Interactive Guide (Edition 2)
 * Friendly walkthrough helping ADHD users get set up without overwhelm.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AssistantMaya = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TOUR_SLIDES = [
    {
      title: 'Hi, I’m Maya! Welcome 🌿',
      text: 'Traditional budgeting is built for neurotypical brains who love spreadsheets. ADHD Budget Planner does the heavy math for you so you can feel calm and in control.'
    },
    {
      title: '1. Safe to Spend Today',
      text: 'This is your single hero number. It looks at your bank balance, reserves money for your upcoming bills, and gives you one daily allowance you can spend guilt-free.'
    },
    {
      title: '2. 1-Tap Quick Spends',
      text: 'No complicated category tracking. Tap a Quick Spend chip whenever you grab coffee or food. Done in one second.'
    },
    {
      title: '3. 48-Hour Impulse Vault',
      text: 'Get an overwhelming urge to buy something online? Park it in the Vault. In 48 hours, the dopamine urge fades and you can decide with a clear head.'
    },
    {
      title: '4. Zombie Mode',
      text: 'On days with intense executive dysfunction or burnout, tap Zombie Mode in the top bar. Everything disappears except one simple question: "Can I afford this right now?"'
    }
  ];

  function launchTour(onFinish) {
    let index = 0;

    const overlay = document.createElement('div');
    overlay.className = 'maya-tour-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;';

    const card = document.createElement('div');
    card.style.cssText = 'background:#111f1d;border:1px solid #10b981;border-radius:20px;max-width:440px;width:100%;padding:26px;color:#f0fdf4;box-shadow:0 10px 40px rgba(0,0,0,0.5);font-family:sans-serif;text-align:left;';

    function render() {
      const step = TOUR_SLIDES[index];
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:12px;background:#182c29;border:1px solid #10b981;display:flex;align-items:center;justify-content:center;font-size:20px;">👩‍💼</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.08em;">ADHD Budget Assistant</div>
            <div style="font-size:17px;font-weight:800;color:#fbbf24;">${step.title}</div>
          </div>
        </div>
        <p style="font-size:14px;line-height:1.6;color:#99f6e4;margin-bottom:24px;">${step.text}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#5eead4;">Step ${index + 1} of ${TOUR_SLIDES.length}</span>
          <div style="display:flex;gap:8px;">
            <button id="maya-tour-skip" style="background:none;border:none;color:#5eead4;font-size:12px;cursor:pointer;padding:6px 10px;">Skip</button>
            <button id="maya-tour-next" style="background:#10b981;color:#fff;border:none;font-weight:700;font-size:12px;padding:8px 16px;border-radius:8px;cursor:pointer;">${index === TOUR_SLIDES.length - 1 ? 'Start Budgeting 🌿' : 'Next ➔'}</button>
          </div>
        </div>
      `;

      card.querySelector('#maya-tour-skip').onclick = () => {
        document.body.removeChild(overlay);
        if (typeof onFinish === 'function') onFinish();
      };

      card.querySelector('#maya-tour-next').onclick = () => {
        index++;
        if (index < TOUR_SLIDES.length) {
          render();
        } else {
          document.body.removeChild(overlay);
          if (typeof onFinish === 'function') onFinish();
        }
      };
    }

    render();
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  return {
    launchTour
  };
});
