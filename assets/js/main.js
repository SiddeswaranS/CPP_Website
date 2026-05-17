/* CPP Marketing Site — main.js */

/* ════════════════════════════════════════
   1. DOM-ready init
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* AOS — scroll animations */
  AOS.init({ duration: 600, once: true, easing: 'ease-out-cubic', offset: 60 });

  /* Anchor scroll — fires AOS first, then scrolls with proper header offset.
     Replaces both browser-default and CSS scroll-padding (which races AOS layout). */
  const HEADER_OFFSET = 72; // 64px nav + 8px breathing room
  function scrollToAnchor(hash, updateUrl = true) {
    const el = document.querySelector(hash);
    if (!el) return;
    // Force AOS to refresh layout so element positions are accurate
    if (window.AOS) AOS.refreshHard();
    const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
    if (updateUrl) history.pushState(null, '', hash);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    if (!document.querySelector(href)) return;
    e.preventDefault();
    scrollToAnchor(href);
  });
  /* If page loads with a hash, scroll to it after AOS has measured */
  if (window.location.hash) {
    setTimeout(() => scrollToAnchor(window.location.hash, false), 300);
  }

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


/* ── Industry Configurator: Elevators ── */
function elevatorDemo() {
  return {
    selections: { capacity: null, drive: null, door: null, safety: null },
    catalog: {
      capacity: ['6-Person', '8-Person', '13-Person', '26-Person'],
      drive:    ['Gearless VVVF', 'Geared VVVF', 'Hydraulic'],
      door:     ['Single Speed', 'Two Speed', 'Centre Opening'],
      safety:   ['EN81-20', 'EN81-50', 'NBC 2016']
    },
    featureLabels: { capacity: 'Capacity', drive: 'Drive Type', door: 'Door Type', safety: 'Safety Code' },
    get eliminatedOptions() {
      const e = { capacity: [], drive: [], door: [], safety: [] };
      if (this.selections.capacity === '26-Person')   e.drive.push('Geared VVVF');
      if (this.selections.drive === 'Hydraulic')       { e.capacity.push('26-Person'); e.door.push('Centre Opening'); }
      if (this.selections.safety === 'EN81-50')        e.door.push('Single Speed');
      return e;
    },
    get constraintMessage() {
      if (this.selections.capacity === '26-Person')
        return { type: 'rule', text: '⚡ Rule fired: 26-Person capacity requires Gearless VVVF — Geared VVVF eliminated.' };
      if (this.selections.drive === 'Hydraulic')
        return { type: 'rule', text: '⚡ Rule fired: Hydraulic drives are low-rise only — 26-Person and Centre Opening options eliminated.' };
      if (this.selections.safety === 'EN81-50')
        return { type: 'rule', text: '⚡ Rule fired: EN81-50 requires Two Speed or Centre Opening door configuration.' };
      if (!Object.values(this.selections).some(v => v))
        return { type: 'idle', text: 'Select an elevator capacity to begin configuring.' };
      return { type: 'ok', text: '✓ No conflicts. All remaining options are valid for your selection.' };
    },
    get selectedCount() { return Object.values(this.selections).filter(v => v).length; },
    isEliminated(f, o) { return this.eliminatedOptions[f].includes(o); },
    select(f, o) {
      if (this.isEliminated(f, o)) return;
      this.selections[f] = this.selections[f] === o ? null : o;
      Object.entries(this.eliminatedOptions).forEach(([feat, opts]) => {
        if (opts.includes(this.selections[feat])) this.selections[feat] = null;
      });
    },
    reset() { this.selections = { capacity: null, drive: null, door: null, safety: null }; }
  };
}

/* ── Industry Configurator: Switchgear ── */
function switchgearDemo() {
  return {
    selections: { voltage: null, current: null, breaking: null, enclosure: null },
    catalog: {
      voltage:   ['LV ≤1kV', 'MV 11kV', 'MV 33kV', 'HV 66kV'],
      current:   ['400A', '630A', '1250A', '2500A'],
      breaking:  ['25 kA', '50 kA', '85 kA'],
      enclosure: ['IP41', 'IP54', 'IP65']
    },
    featureLabels: { voltage: 'Voltage Class', current: 'Current Rating', breaking: 'Breaking Capacity', enclosure: 'Enclosure Class' },
    get eliminatedOptions() {
      const e = { voltage: [], current: [], breaking: [], enclosure: [] };
      if (this.selections.voltage === 'HV 66kV')  { e.enclosure.push('IP41'); e.current.push('400A'); }
      if (this.selections.voltage === 'MV 33kV')  { e.enclosure.push('IP41'); e.current.push('400A'); }
      if (this.selections.current === '2500A')    e.breaking.push('25 kA');
      return e;
    },
    get constraintMessage() {
      if (this.selections.voltage === 'HV 66kV')
        return { type: 'rule', text: '⚡ Rule fired: HV 66kV panels require minimum IP54 per IEC 60947 — IP41 and 400A options eliminated.' };
      if (this.selections.voltage === 'MV 33kV')
        return { type: 'rule', text: '⚡ Rule fired: MV 33kV requires minimum IP54 enclosure and 630A+ current rating.' };
      if (this.selections.current === '2500A')
        return { type: 'rule', text: '⚡ Rule fired: 2500A rating requires minimum 50 kA breaking capacity — 25 kA eliminated.' };
      if (!Object.values(this.selections).some(v => v))
        return { type: 'idle', text: 'Select a voltage class to begin configuring your panel.' };
      return { type: 'ok', text: '✓ No conflicts. All remaining options are valid for your selection.' };
    },
    get selectedCount() { return Object.values(this.selections).filter(v => v).length; },
    isEliminated(f, o) { return this.eliminatedOptions[f].includes(o); },
    select(f, o) {
      if (this.isEliminated(f, o)) return;
      this.selections[f] = this.selections[f] === o ? null : o;
      Object.entries(this.eliminatedOptions).forEach(([feat, opts]) => {
        if (opts.includes(this.selections[feat])) this.selections[feat] = null;
      });
    },
    reset() { this.selections = { voltage: null, current: null, breaking: null, enclosure: null }; }
  };
}

/* ── Industry Configurator: HVAC ── */
function hvacDemo() {
  return {
    selections: { system: null, capacity: null, refrigerant: null, rating: null },
    catalog: {
      system:     ['Split AC', 'VRF', 'Chiller', 'AHU'],
      capacity:   ['2 TR', '5 TR', '10 TR', '20 TR', '50 TR'],
      refrigerant:['R32', 'R410A', 'R134a'],
      rating:     ['3 Star', '5 Star', 'ISEER+']
    },
    featureLabels: { system: 'System Type', capacity: 'Capacity', refrigerant: 'Refrigerant', rating: 'Energy Rating' },
    get eliminatedOptions() {
      const e = { system: [], capacity: [], refrigerant: [], rating: [] };
      if (this.selections.system === 'Chiller')  { e.capacity.push('2 TR'); e.refrigerant.push('R32'); }
      if (this.selections.capacity === '50 TR')  { e.system.push('Split AC'); e.rating.push('3 Star'); e.refrigerant.push('R32'); }
      if (this.selections.refrigerant === 'R32') e.rating.push('3 Star');
      return e;
    },
    get constraintMessage() {
      if (this.selections.system === 'Chiller')
        return { type: 'rule', text: '⚡ Rule fired: Chillers require industrial refrigerants — R32 and 2 TR capacity eliminated.' };
      if (this.selections.capacity === '50 TR')
        return { type: 'rule', text: '⚡ Rule fired: 50 TR systems require 5 Star+ rating and industrial refrigerant — Split AC and R32 eliminated.' };
      if (this.selections.refrigerant === 'R32')
        return { type: 'rule', text: '⚡ Rule fired: R32 refrigerant mandates minimum 5 Star energy rating — 3 Star eliminated.' };
      if (!Object.values(this.selections).some(v => v))
        return { type: 'idle', text: 'Select a system type to begin configuring your HVAC system.' };
      return { type: 'ok', text: '✓ No conflicts. All remaining options are valid for your selection.' };
    },
    get selectedCount() { return Object.values(this.selections).filter(v => v).length; },
    isEliminated(f, o) { return this.eliminatedOptions[f].includes(o); },
    select(f, o) {
      if (this.isEliminated(f, o)) return;
      this.selections[f] = this.selections[f] === o ? null : o;
      Object.entries(this.eliminatedOptions).forEach(([feat, opts]) => {
        if (opts.includes(this.selections[feat])) this.selections[feat] = null;
      });
    },
    reset() { this.selections = { system: null, capacity: null, refrigerant: null, rating: null }; }
  };
}

/* ── Industry Configurator: Industrial Machinery ── */
function machineryDemo() {
  return {
    selections: { machine: null, spindle: null, power: null, coolant: null },
    catalog: {
      machine: ['CNC Lathe', 'Machining Centre', 'Grinding', 'Hobbing'],
      spindle: ['3000 RPM', '6000 RPM', '12000 RPM'],
      power:   ['7.5 kW', '15 kW', '22 kW', '37 kW'],
      coolant: ['Dry Machining', 'Flood', 'MQL', 'Through-Spindle']
    },
    featureLabels: { machine: 'Machine Type', spindle: 'Spindle Speed', power: 'Power Rating', coolant: 'Coolant Type' },
    get eliminatedOptions() {
      const e = { machine: [], spindle: [], power: [], coolant: [] };
      if (this.selections.machine === 'Hobbing')          { e.spindle.push('12000 RPM'); e.coolant.push('Through-Spindle'); }
      if (this.selections.machine === 'Grinding')         e.coolant.push('Through-Spindle');
      if (this.selections.spindle === '12000 RPM')        e.power.push('7.5 kW');
      return e;
    },
    get constraintMessage() {
      if (this.selections.machine === 'Hobbing')
        return { type: 'rule', text: '⚡ Rule fired: Hobbing requires low spindle speeds — 12000 RPM and Through-Spindle coolant eliminated.' };
      if (this.selections.machine === 'Grinding')
        return { type: 'rule', text: '⚡ Rule fired: Grinding machines cannot use through-spindle coolant delivery systems.' };
      if (this.selections.spindle === '12000 RPM')
        return { type: 'rule', text: '⚡ Rule fired: 12000 RPM spindle requires minimum 15 kW drive power — 7.5 kW eliminated.' };
      if (!Object.values(this.selections).some(v => v))
        return { type: 'idle', text: 'Select a machine type to begin configuring.' };
      return { type: 'ok', text: '✓ No conflicts. All remaining options are valid for your selection.' };
    },
    get selectedCount() { return Object.values(this.selections).filter(v => v).length; },
    isEliminated(f, o) { return this.eliminatedOptions[f].includes(o); },
    select(f, o) {
      if (this.isEliminated(f, o)) return;
      this.selections[f] = this.selections[f] === o ? null : o;
      Object.entries(this.eliminatedOptions).forEach(([feat, opts]) => {
        if (opts.includes(this.selections[feat])) this.selections[feat] = null;
      });
    },
    reset() { this.selections = { machine: null, spindle: null, power: null, coolant: null }; }
  };
}

/* ── Industry Configurator: Power Transformers ── */
function transformerDemo() {
  return {
    selections: { rating: null, voltage: null, cooling: null, tap: null },
    catalog: {
      rating:  ['100 kVA', '500 kVA', '1 MVA', '5 MVA', '10 MVA'],
      voltage: ['11 kV', '33 kV', '66 kV', '132 kV'],
      cooling: ['ONAN', 'ONAF', 'OFAF'],
      tap:     ['NLTC', 'OLTC']
    },
    featureLabels: { rating: 'MVA Rating', voltage: 'Primary Voltage', cooling: 'Cooling Method', tap: 'Tap Changer' },
    get eliminatedOptions() {
      const e = { rating: [], voltage: [], cooling: [], tap: [] };
      if (this.selections.rating === '10 MVA')   { e.cooling.push('ONAN'); e.cooling.push('ONAF'); }
      if (this.selections.voltage === '132 kV')  e.tap.push('NLTC');
      if (this.selections.rating === '100 kVA')  { e.voltage.push('132 kV'); e.cooling.push('OFAF'); }
      return e;
    },
    get constraintMessage() {
      if (this.selections.rating === '10 MVA')
        return { type: 'rule', text: '⚡ Rule fired: 10 MVA requires forced cooling (OFAF) per IEC 60076 — ONAN and ONAF eliminated.' };
      if (this.selections.voltage === '132 kV')
        return { type: 'rule', text: '⚡ Rule fired: 132 kV primary requires On-Load Tap Changer (OLTC) for voltage regulation.' };
      if (this.selections.rating === '100 kVA')
        return { type: 'rule', text: '⚡ Rule fired: 100 kVA rating — 132 kV primary and OFAF cooling not applicable at this rating.' };
      if (!Object.values(this.selections).some(v => v))
        return { type: 'idle', text: 'Select a transformer rating to begin configuring.' };
      return { type: 'ok', text: '✓ No conflicts. All remaining options are valid for your selection.' };
    },
    get selectedCount() { return Object.values(this.selections).filter(v => v).length; },
    isEliminated(f, o) { return this.eliminatedOptions[f].includes(o); },
    select(f, o) {
      if (this.isEliminated(f, o)) return;
      this.selections[f] = this.selections[f] === o ? null : o;
      Object.entries(this.eliminatedOptions).forEach(([feat, opts]) => {
        if (opts.includes(this.selections[feat])) this.selections[feat] = null;
      });
    },
    reset() { this.selections = { rating: null, voltage: null, cooling: null, tap: null }; }
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
    },

    fmtINR(lakhVal) {
      const rupees = lakhVal * 100000;
      if (rupees < 100000) {
        return '₹' + Math.round(rupees / 1000) + 'K';
      } else if (rupees < 10000000) {
        const l = rupees / 100000;
        return '₹' + (l % 1 === 0 ? l : parseFloat(l.toFixed(1))) + 'L';
      } else {
        const cr = rupees / 10000000;
        return '₹' + (cr % 1 === 0 ? cr : parseFloat(cr.toFixed(2))) + 'Cr';
      }
    },

    get reworkSavedFmt() {
      return this.fmtINR(parseFloat(this.reworkSavedLakhMonth));
    },

    get totalSavedYearFmt() {
      return this.fmtINR(parseFloat(this.totalSavedLakhYear));
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
