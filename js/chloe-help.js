/**
 * ADHD Budget Planner (Edition 2) - Chloe's Contextual Help & Executive Function System
 * 4-tier low-cognitive-load tactical guides for each tab, card, and ADHD feature.
 */

(function (global) {
  'use strict';

  const ChloeHelp = {
    'horizon.velocity': {
      title: 'Safe Daily Horizon',
      core: 'The single anchor number. It represents what you can safely spend today without touching money promised to your rent, bills, or debt commitments.',
      action: 'Check this number before making discretionary purchases. When you buy something, tap a quick spend tile or log it.',
      brain: 'ADHD brains get overwhelmed by 20 complex budget categories. You only need to remember one number to stay 100% safe.',
      rule: 'If you spend more today, do not panic: tomorrow automatically recalibrates across your remaining days. No day is ever ruined.'
    },
    'horizon.inflow': {
      title: 'Next Inflow Stream & Runway',
      core: 'The countdown runway showing how many days remain until your next paycheck arrives, and how much money is coming in.',
      action: 'Tap [Adjust Inflow] to set your paycheck date, pay cycle cadence, and current cash reserve.',
      brain: 'Time blindness makes 2 weeks feel either like tomorrow or forever. The visual runway transforms invisible calendar days into a concrete, readable horizon.',
      rule: 'If your payday lands on a weekend, turn on [Weekend Early] so your money is safely anchored to Friday.'
    },
    'horizon.objectives': {
      title: 'Three Tactical Focus Objectives',
      core: 'A bite-sized daily checklist featuring a maximum of 3 key financial actions for today.',
      action: 'Pick one small objective and finish it. Check the box to mark it complete.',
      brain: 'A to-do list with 10+ items causes executive dysfunction and analysis paralysis. Three small items is a list you can actually conquer.',
      rule: 'On quiet days with no pending bills, your objectives celebrate zero-spend days or remind you to hydrate.'
    },
    'horizon.quickspend': {
      title: 'Rapid Velocity Logs',
      core: 'One-tap preset spend buttons designed for high-frequency everyday purchases.',
      action: 'Tap a tile (Snack, Coffee, Fuel, Dining) immediately after spending to record it in one second.',
      brain: 'Friction kills tracking habits. Eliminating manual forms and category drop-downs lets you log in a single second before distraction strikes.',
      rule: 'Need to log a specific custom amount? Tap the [Quick Spend +] floating button anytime.'
    },
    'shield.burnout': {
      title: 'Burnout Shield (Low-Bandwidth View)',
      core: 'An ultra-simplified, zero-distraction view for high-stress, sensory overload, or burnout days.',
      action: 'Toggle the Burnout Shield whenever looking at full numbers feels exhausting. Use it simply to ask: "Can I buy this right now?"',
      brain: 'Executive dysfunction makes dense interfaces overwhelming. Burnout Shield cuts out 90% of visual noise so you remain safe with zero fatigue.',
      rule: 'All your bills, runway math, and calculations keep running smoothly in the background while the shield is on.'
    },
    'obligations.fixed': {
      title: 'Fixed Commitments (Chronological Holds)',
      core: 'Your recurring bills and subscriptions sorted strictly in chronological order by their upcoming due date.',
      action: 'When a bill clears your bank account, tap [Mark Paid]. It will automatically schedule its next cycle.',
      brain: 'Alphabetical lists hide urgency. Chronological sorting aligns directly with how cash actually flows out of your account.',
      rule: 'Bills due after your next payday are hidden from today’s hold pool—they will be funded by that future paycheck.'
    },
    'obligations.smoothing': {
      title: 'Seasonal Bill Smoothing',
      core: 'A calculator that averages fluctuating bills (like seasonal electricity or heating) over a 12-month period.',
      action: 'Enter what you paid over peak and low months. Tap [Use Average] to establish a predictable monthly reserve.',
      brain: 'Unexpected utility spikes trigger financial panic. Budgeting the smooth average creates consistent predictability all year.',
      rule: 'If a utility swings drastically, rounding up by $10–$20 creates a painless extra buffer.'
    },
    'pause.chamber': {
      title: '48-Hour Wishlist Cooling Chamber',
      core: 'A tactical holding tank for items you suddenly want to purchase online or in stores.',
      action: 'Instead of checking out right away, tap [+ Park Item]. Enter the name and price, and let the 48-hour countdown run.',
      brain: 'Saying "I can never have this" causes mental rebellion. Saying "I can have it in 48 hours if I still want it" calms dopamine hunting.',
      rule: 'Over 82% of impulsive urges naturally disappear once 48 hours elapse. If you still want it afterwards, buy it guilt-free!'
    },
    'payoff.radar': {
      title: 'Debt Payoff Radar (Snowball vs. Avalanche)',
      core: 'A mathematical payoff simulator that calculates your exact debt-free date and compares payoff methods.',
      action: 'Toggle between Snowball (smallest balance first) and Avalanche (highest APR first) to see which strategy suits your mindset.',
      brain: 'Snowball delivers rapid psychological wins by knocking out smaller balances quickly, providing the dopamine required to stay motivated.',
      rule: 'For ADHD brains, Snowball is almost always superior because momentum and visible wins prevent abandonment.'
    },
    'scratchpad.brain': {
      title: 'Tactical Working Memory Scratchpad',
      core: 'An instant distraction-free notepad to externalize fleeting financial ideas, reminders, or purchase comparisons.',
      action: 'Type any financial thought the moment it enters your mind so your working memory stays clear.',
      brain: 'ADHD working memory drops ideas quickly. Externalizing them immediately into a dedicated notepad stops cognitive leakage.',
      rule: 'Notes auto-save locally to your device instantly on every keystroke.'
    },
    'settings.oops': {
      title: 'Oops Cushion Buffer',
      core: 'A dedicated $25–$100 safety pocket shielded from your daily spending allowance.',
      action: 'Set your cushion buffer in System Preferences. Minor miscalculations or forgotten parking fees are absorbed by this fund.',
      brain: 'Rigid financial plans fail the moment a small mistake occurs. The Oops Cushion gives your budget elasticity so it bends without breaking.',
      rule: 'Start with a $50 buffer. You can adjust it anytime as your savings grow.'
    },
    'settings.sovereign': {
      title: '100% Offline Vault & Safari Shield',
      core: 'Your financial data is stored 100% locally on your device with zero cloud servers, zero tracking, and complete privacy.',
      action: 'Tap [Add to Home Screen] on your phone and download a monthly backup using [Export Data Backup].',
      brain: 'No bank credentials, no cloud subscription fees, and no algorithms tracking your habits.',
      rule: 'Adding this app to your mobile Home Screen permanently immunizes its local storage from Safari’s 7-day cache cleanup policy.'
    }
  };

  global.ChloeHelp = ChloeHelp;
})(typeof window !== 'undefined' ? window : this);
