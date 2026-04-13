// ═══════════════════════════════════════════════════════════════
// S4LABOUR PAYROLL — UK CALCULATION ENGINE
// Tax year: 2025/26
// Pure functions — no DOM, no side effects
// ═══════════════════════════════════════════════════════════════

const TAX = {
  // PAYE
  pa: 12570,        // Personal allowance
  brl: 50270,       // Basic rate limit (20%)
  hrl: 125140,      // Higher rate limit (40%)
  br: 0.20,
  hr: 0.40,
  ar: 0.45,

  // National Insurance
  niPT: 12570,      // Primary threshold (EE)
  niUEL: 50270,     // Upper earnings limit
  niST: 9100,       // Secondary threshold (ER)
  niEEMain: 0.08,   // Employee NI main rate
  niEEAdd: 0.02,    // Employee NI additional rate (above UEL)
  niER: 0.138,      // Employer NI rate

  // Statutory payments (weekly)
  smpFlat: 184.03,
  sppFlat: 184.03,
  sspWeekly: 116.75,

  // Pension qualifying earnings band (annual)
  pensionQELow: 6240,
  pensionQEHigh: 50270,

  // National Living Wage
  nlw: 12.21,
};

// ── PERIOD DIVISORS ───────────────────────────────────────────
function periodDiv(freq) {
  if (freq === 'weekly')    return 52;
  if (freq === 'monthly')   return 12;
  if (freq === 'fourweekly') return 13;
  return 52;
}

// ── PAYE (cumulative basis) ───────────────────────────────────
function calcPAYE(gross, freq, taxCode) {
  const d  = periodDiv(freq);
  // Parse tax code — e.g. "1257L" → allowance = 1257 * 10 = 12570
  const pa = (taxCode && /^\d+[LM]$/i.test(taxCode.trim()))
    ? parseInt(taxCode) * 10
    : TAX.pa;

  const annualGross = gross * d;
  const taxableIncome = Math.max(0, annualGross - pa);

  const band1 = Math.max(0, TAX.brl - pa);
  const band2 = Math.max(0, TAX.hrl - TAX.brl);

  let annualTax = 0;
  if (taxableIncome <= band1) {
    annualTax = taxableIncome * TAX.br;
  } else if (taxableIncome <= band1 + band2) {
    annualTax = band1 * TAX.br + (taxableIncome - band1) * TAX.hr;
  } else {
    annualTax = band1 * TAX.br + band2 * TAX.hr + (taxableIncome - band1 - band2) * TAX.ar;
  }

  return Math.max(0, annualTax / d);
}

// ── EMPLOYEE NI ───────────────────────────────────────────────
function calcNI_EE(gross, freq) {
  const d   = periodDiv(freq);
  const pt  = TAX.niPT  / d;
  const uel = TAX.niUEL / d;
  if (gross <= pt)  return 0;
  if (gross <= uel) return (gross - pt) * TAX.niEEMain;
  return (uel - pt) * TAX.niEEMain + (gross - uel) * TAX.niEEAdd;
}

// ── EMPLOYER NI ───────────────────────────────────────────────
function calcNI_ER(gross, freq) {
  const st = TAX.niST / periodDiv(freq);
  return gross <= st ? 0 : (gross - st) * TAX.niER;
}

// ── PENSION (qualifying earnings basis) ──────────────────────
function calcPension(gross, freq, eeRate, erRate) {
  const d  = periodDiv(freq);
  const lo = TAX.pensionQELow  / d;
  const hi = TAX.pensionQEHigh / d;
  const qe = Math.max(0, Math.min(gross, hi) - lo);
  return { ee: qe * eeRate, er: qe * erRate, qe };
}

// ── FULL PERIOD CALCULATION ───────────────────────────────────
// Returns a breakdown object for one employee for one period
function calcPeriod(gross, freq, opts) {
  opts = opts || {};
  const eeR  = opts.pensionEE !== undefined ? opts.pensionEE : 0.05;
  const erR  = opts.pensionER !== undefined ? opts.pensionER : 0.03;
  const salSac = opts.salSac !== false;

  const pen    = calcPension(gross, freq, eeR, erR);
  // Salary sacrifice: EE pension deducted before PAYE & NI
  const taxableGross = salSac ? gross - pen.ee : gross;

  const paye  = calcPAYE(taxableGross, freq, opts.taxCode || '1257L');
  const niEE  = calcNI_EE(taxableGross, freq);
  const niER  = calcNI_ER(taxableGross, freq);
  const net   = taxableGross - paye - niEE;

  return {
    gross,
    taxableGross,
    paye,
    niEE,
    niER,
    pensionEE:  pen.ee,
    pensionER:  pen.er,
    pensionQE:  pen.qe,
    net,
    totalCost:  gross + niER + pen.er,
  };
}

// ── EMPLOYEE HELPERS ─────────────────────────────────────────
function grossForEmp(emp, hrs) {
  if (emp.status === 'smp')    return TAX.smpFlat;
  if (emp.status === 'spp')    return TAX.sppFlat;
  if (emp.status === 'unpaid') return 0;
  if (emp.payType === 'salary') return emp.rate / periodDiv(emp.freq);
  return (hrs || 0) * emp.rate;
}

function periodCalcForEmp(emp, hrs) {
  return calcPeriod(grossForEmp(emp, hrs), emp.freq, {
    pensionEE: emp.pensionEE,
    pensionER: emp.pensionER,
    salSac:    emp.salSac,
    taxCode:   emp.taxCode,
  });
}

function empYTD(emp, runHours, history) {
  const all = [{ label: 'Current', h: { [emp.id]: runHours[emp.id] } }, ...history];
  const y = { gross:0, paye:0, niEE:0, niER:0, pensionEE:0, pensionER:0, net:0 };
  all.forEach(period => {
    if (emp.freq === 'monthly' && period.label !== 'Current') return;
    const hrs = period.h[emp.id];
    if (hrs === undefined) return;
    const r = periodCalcForEmp(emp, hrs);
    y.gross     += r.gross;
    y.paye      += r.paye;
    y.niEE      += r.niEE;
    y.niER      += r.niER;
    y.pensionEE += r.pensionEE;
    y.pensionER += r.pensionER;
    y.net       += r.net;
  });
  return y;
}

function runTotals(employees, runHours) {
  const t = { gross:0, paye:0, niEE:0, niER:0, pensionEE:0, pensionER:0, net:0, count:0 };
  employees.forEach(emp => {
    if (emp.status === 'inactive') return;
    const r = periodCalcForEmp(emp, runHours[emp.id]);
    t.gross     += r.gross;
    t.paye      += r.paye;
    t.niEE      += r.niEE;
    t.niER      += r.niER;
    t.pensionEE += r.pensionEE;
    t.pensionER += r.pensionER;
    t.net       += r.net;
    t.count++;
  });
  return t;
}

// ── FORMATTERS ───────────────────────────────────────────────
function fmt(n) {
  return '£' + Math.abs(+n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtN(n, dp) {
  return (+n || 0).toFixed(dp === undefined ? 2 : dp);
}

// Expose globally
window.TAX = TAX;
window.calcPAYE = calcPAYE;
window.calcNI_EE = calcNI_EE;
window.calcNI_ER = calcNI_ER;
window.calcPension = calcPension;
window.calcPeriod = calcPeriod;
window.periodDiv = periodDiv;
window.grossForEmp = grossForEmp;
window.periodCalcForEmp = periodCalcForEmp;
window.empYTD = empYTD;
window.runTotals = runTotals;
window.fmt = fmt;
window.fmtN = fmtN;
