/* CPP Marketing Site — main.js */

/* ════════════════════════════════════════
   1. DOM-ready init
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* AOS — scroll animations */
  AOS.init({ duration: 600, once: true, easing: 'ease-out-cubic', offset: 60 });

  /* Hero CountUp — fires 800ms after load */
  setTimeout(() => {
    safeCountUp('stat-boms',    2400000, { separator: ',', duration: 2.5 });
    safeCountUp('stat-errors',  47000,   { separator: ',', duration: 2.0 });
    safeCountUp('stat-latency', 50,      { suffix: ' ms', duration: 1.5 });
  }, 800);

  /* Trust strip CountUp — fires when strip scrolls into view */
  const trustStrip = document.getElementById('trust-strip');
  if (trustStrip) {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        safeCountUp('trust-parts',  100000, { suffix: '+', separator: ',', duration: 2.0 });
        safeCountUp('trust-latency-val', 50, { suffix: ' ms', duration: 1.5 });
        safeCountUp('trust-det',    100,    { suffix: '%',  duration: 1.8 });
        safeCountUp('trust-rekey',  0,      { duration: 0.5 });
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(trustStrip);
  }

  /* How It Works connector line — draw on scroll */
  const howItWorks = document.getElementById('how-it-works');
  if (howItWorks) {
    const connObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        document.querySelectorAll('.step-connector').forEach(el => el.classList.add('visible'));
        connObs.disconnect();
      }
    }, { threshold: 0.4 });
    connObs.observe(howItWorks);
  }

});

function safeCountUp(id, end, opts) {
  const el = document.getElementById(id);
  if (!el) return;
  const cu = new countUp.CountUp(id, end, opts);
  if (!cu.error) cu.start();
}


/* ════════════════════════════════════════
   2. Alpine.js Components
════════════════════════════════════════ */

/* ── Interactive Motor Configurator Demo ── */
function motorDemo() {
  return {
    selections: { power: null, cooling: null, voltage: null, drive: null, mounting: null },

    catalog: {
      power:    ['2 kW', '5 kW', '10 kW', '22 kW', '37 kW'],
      cooling:  ['Air Cooled', 'Liquid Cooled'],
      voltage:  ['220V', '415V', '690V'],
      drive:    ['Direct On Line', 'VFD (Variable Frequency)', 'Soft Starter'],
      mounting: ['Foot Mount (B3)', 'Flange Mount (B5)', 'Face Mount (B14)']
    },

    featureLabels: {
      power:    'Motor Power',
      cooling:  'Cooling Method',
      voltage:  'Supply Voltage',
      drive:    'Drive Type',
      mounting: 'Mounting Style'
    },

    showBom: false,

    get eliminatedOptions() {
      const e = { power: [], cooling: [], voltage: [], drive: [], mounting: [] };

      /* Rule 1: Power ≥ 10kW → Liquid cooling required */
      if (['10 kW', '22 kW', '37 kW'].includes(this.selections.power)) {
        e.cooling.push('Air Cooled');
      }
      /* Rule 2: 690V → Direct On Line excluded */
      if (this.selections.voltage === '690V') {
        e.drive.push('Direct On Line');
      }
      /* Rule 3: Liquid cooling → Face Mount excluded */
      if (this.selections.cooling === 'Liquid Cooled') {
        e.mounting.push('Face Mount (B14)');
      }
      /* Rule 4: VFD requires ≥ 5kW */
      if (this.selections.drive === 'VFD (Variable Frequency)') {
        e.power.push('2 kW');
      }
      /* Rule 5: 690V requires ≥ 10kW */
      if (this.selections.voltage === '690V') {
        e.power.push('2 kW');
        e.power.push('5 kW');
      }
      return e;
    },

    get constraintMessage() {
      const p = this.selections.power;
      const c = this.selections.cooling;
      const v = this.selections.voltage;
      const d = this.selections.drive;

      if (!p && !c && !v && !d && !this.selections.mounting)
        return { type: 'idle', text: 'Select a motor power rating to begin configuring.' };

      if (['10 kW', '22 kW', '37 kW'].includes(p) && c !== 'Liquid Cooled')
        return { type: 'rule', text: '⚡ Rule fired: Motors ≥ 10 kW require Liquid Cooling — Air Cooled eliminated.' };

      if (v === '690V' && d !== null && d !== 'VFD (Variable Frequency)' && d !== 'Soft Starter')
        return { type: 'rule', text: '⚡ Rule fired: 690V supply is incompatible with Direct On Line starters.' };

      if (v === '690V')
        return { type: 'rule', text: '⚡ Rule fired: 690V requires ≥ 10 kW motor — 2 kW and 5 kW options eliminated.' };

      if (c === 'Liquid Cooled')
        return { type: 'rule', text: '⚡ Rule fired: Liquid Cooled motors cannot use Face Mount (B14) configurations.' };

      if (d === 'VFD (Variable Frequency)')
        return { type: 'rule', text: '⚡ Rule fired: VFD drive requires minimum 5 kW — 2 kW option eliminated.' };

      return { type: 'ok', text: '✓ No conflicts. All remaining options are valid for your current selection.' };
    },

    get configComplete() {
      return Object.values(this.selections).every(v => v !== null);
    },

    get selectedCount() {
      return Object.values(this.selections).filter(v => v !== null).length;
    },

    isEliminated(feature, option) {
      return this.eliminatedOptions[feature].includes(option);
    },

    select(feature, option) {
      if (this.isEliminated(feature, option)) return;
      this.selections[feature] = this.selections[feature] === option ? null : option;
      this.showBom = false;
      /* Clear any selection that became eliminated */
      Object.entries(this.eliminatedOptions).forEach(([feat, opts]) => {
        if (opts.includes(this.selections[feat])) {
          this.selections[feat] = null;
        }
      });
    },

    generateBom() {
      this.showBom = true;
      /* Scroll to BOM smoothly */
      this.$nextTick(() => {
        const bom = document.getElementById('bom-preview');
        if (bom) bom.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },

    reset() {
      this.selections = { power: null, cooling: null, voltage: null, drive: null, mounting: null };
      this.showBom = false;
    },

    get bomRows() {
      const p = this.selections.power;
      const c = this.selections.cooling;
      const d = this.selections.drive;
      const m = this.selections.mounting;
      const v = this.selections.voltage;

      const powerCode = { '2 kW':'MTRFR-002', '5 kW':'MTRFR-005', '10 kW':'MTRFR-010', '22 kW':'MTRFR-022', '37 kW':'MTRFR-037' };
      const coolCode  = { 'Air Cooled':'CLG-AIR-01', 'Liquid Cooled':'CLG-LIQ-02' };
      const driveCode = { 'Direct On Line':'DRV-DOL-01', 'VFD (Variable Frequency)':'DRV-VFD-03', 'Soft Starter':'DRV-SS-02' };
      const mountCode = { 'Foot Mount (B3)':'MNT-B3-01', 'Flange Mount (B5)':'MNT-B5-02', 'Face Mount (B14)':'MNT-B14-03' };
      const cableCode = { '220V':'CBL-2C-220', '415V':'CBL-3C-415', '690V':'CBL-3C-690' };

      return [
        { partNo: powerCode[p]  || '—', desc: `Motor Frame Assembly — ${p}`,        qty: 1, uom: 'EA' },
        { partNo: coolCode[c]   || '—', desc: `Cooling Unit — ${c}`,                 qty: 1, uom: 'EA' },
        { partNo: driveCode[d]  || '—', desc: `Drive Module — ${d}`,                 qty: 1, uom: 'EA' },
        { partNo: mountCode[m]  || '—', desc: `Mounting Kit — ${m}`,                 qty: 1, uom: 'SET' },
        { partNo: cableCode[v]  || '—', desc: `Power Cable Harness — ${v}`,          qty: 1, uom: 'SET' },
        { partNo: 'LUBE-GRS-01',         desc: 'Bearing Lubrication Pack',           qty: 2, uom: 'PC' },
      ];
    }
  };
}


/* ── ROI Calculator ── */
function roiCalc() {
  return {
    configsPerMonth:    80,
    engineersPerConfig: 2,
    hoursPerConfig:     8,
    errorRatePercent:   12,
    reworkCostLakh:     3,

    get hoursSavedPerMonth() {
      const current = this.configsPerMonth * this.engineersPerConfig * this.hoursPerConfig;
      const withCpp = this.configsPerMonth * this.engineersPerConfig * 0.25;
      return Math.round(current - withCpp);
    },

    get errorsPreventedPerMonth() {
      return Math.round(this.configsPerMonth * (this.errorRatePercent / 100));
    },

    get reworkSavedLakhMonth() {
      return (this.errorsPreventedPerMonth * this.reworkCostLakh).toFixed(1);
    },

    get engineerSavedLakhMonth() {
      /* Senior engineer all-in ≈ ₹80/hr (₹15L CTC ÷ 1800 working hrs) */
      return ((this.hoursSavedPerMonth * 80) / 100000).toFixed(2);
    },

    get totalSavedLakhMonth() {
      return (parseFloat(this.reworkSavedLakhMonth) + parseFloat(this.engineerSavedLakhMonth)).toFixed(1);
    },

    get totalSavedLakhYear() {
      return (parseFloat(this.totalSavedLakhMonth) * 12).toFixed(0);
    }
  };
}


/* ── Demo Lead Capture Form ── */
function demoForm() {
  return {
    form: { name: '', company: '', industry: '', skus: '', email: '', phone: '' },
    errors: {},
    submitted: false,
    submitting: false,

    validate() {
      this.errors = {};
      if (!this.form.name.trim())       this.errors.name     = 'Your name is required';
      if (!this.form.company.trim())    this.errors.company  = 'Company name is required';
      if (!this.form.industry)          this.errors.industry = 'Please select your industry';
      if (!this.form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
                                        this.errors.email    = 'A valid email address is required';
      return Object.keys(this.errors).length === 0;
    },

    async submit() {
      if (!this.validate()) return;
      this.submitting = true;
      try {
        /* Replace FORM_ID with your Formspree endpoint */
        const res = await fetch('https://formspree.io/f/FORM_ID', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(this.form)
        });
        if (res.ok) {
          this.submitted = true;
        } else {
          alert('Submission failed. Please try again or email us directly.');
        }
      } catch {
        alert('Network error. Please check your connection and try again.');
      } finally {
        this.submitting = false;
      }
    }
  };
}
