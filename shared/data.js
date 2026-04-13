// ═══════════════════════════════════════════════════════════════
// S4LABOUR PAYROLL — SHARED DATA LAYER
// Handles: seed data, localStorage persistence, cross-page sync
// ═══════════════════════════════════════════════════════════════

const DB_KEY = 's4payroll_v1';

// ── DEFAULT SEED DATA ──────────────────────────────────────────
const SEED = {
  organisations: [
    { id:'ORG001', name:'The Coffee Co.',     ref:'120/AB12345', status:'live',      employees:84, nextRun:'4 Apr', frequency:'Weekly + Monthly', contact:'Donna Wright',    bureau:'Midlands Bureau' },
    { id:'ORG002', name:'Harbour Hotels Ltd', ref:'340/CD67890', status:'attention', employees:212,nextRun:'1 Apr', frequency:'Four-weekly',       contact:'Peter Okafor',    bureau:'Midlands Bureau' },
    { id:'ORG003', name:'Bright Star Retail', ref:'560/EF11223', status:'pending',   employees:47, nextRun:'7 Apr', frequency:'Weekly',             contact:'Anita Kapoor',   bureau:'Midlands Bureau' },
    { id:'ORG004', name:'Nexus Digital Ltd',  ref:'780/GH44556', status:'live',      employees:31, nextRun:'4 Apr', frequency:'Monthly',            contact:'Marcus Trent',   bureau:'Midlands Bureau' },
    { id:'ORG005', name:'Greenfield Care',    ref:'910/IJ77889', status:'attention', employees:138,nextRun:'2 Apr', frequency:'Weekly',             contact:'Fatima Al-Rashid',bureau:'Midlands Bureau'},
  ],

  employees: [
    {id:'E001',orgId:'ORG001',name:'Emma Walsh',    ni:'AB123400A',dept:'Front of house',location:'Birmingham HQ', costCentre:'CC-BIRM',payType:'hourly', rate:13.85,freq:'weekly', taxCode:'1257L',niCat:'A',pensionEE:0.05,pensionER:0.03,salSac:true, status:'active',startDate:'6 Jan 2023',  studentLoan:'None'},
    {id:'E002',orgId:'ORG001',name:'Oliver Brown',  ni:'CD234500B',dept:'Kitchen',        location:'Birmingham HQ', costCentre:'CC-BIRM',payType:'hourly', rate:13.85,freq:'weekly', taxCode:'1257L',niCat:'A',pensionEE:0.05,pensionER:0.03,salSac:true, status:'active',startDate:'12 Mar 2022',studentLoan:'None'},
    {id:'E003',orgId:'ORG001',name:'Sarah Mitchell',ni:'EF345600C',dept:'Management',     location:'Birmingham HQ', costCentre:'CC-BIRM',payType:'salary', rate:32000,freq:'monthly',taxCode:'1257L',niCat:'A',pensionEE:0.05,pensionER:0.03,salSac:false,status:'smp',   startDate:'1 Sep 2020',  studentLoan:'None'},
    {id:'E004',orgId:'ORG001',name:'Priya Sharma',  ni:'GH456700D',dept:'Front of house',location:'Coventry Branch',costCentre:'CC-COV', payType:'hourly', rate:12.21,freq:'weekly', taxCode:'1100L',niCat:'A',pensionEE:0.05,pensionER:0.03,salSac:true, status:'active',startDate:'3 Jun 2023',  studentLoan:'Plan 2'},
    {id:'E005',orgId:'ORG001',name:'Daniel Park',   ni:'IJ567800E',dept:'Kitchen',        location:'Coventry Branch',costCentre:'CC-COV', payType:'hourly', rate:13.85,freq:'weekly', taxCode:'1257L',niCat:'A',pensionEE:0.05,pensionER:0.03,salSac:true, status:'spp',   startDate:'18 Jan 2024', studentLoan:'None'},
  ],

  runHours: { E001:40, E002:68, E003:null, E004:37.5, E005:null },

  history: [
    {label:'W12 Mar 2026',h:{E001:37.5,E002:37.5,E004:35.0,E005:37.5}},
    {label:'W11 Mar 2026',h:{E001:40,  E002:40,  E004:37.5,E005:37.5}},
    {label:'W10 Feb 2026',h:{E001:40,  E002:40,  E004:37.5,E005:37.5}},
    {label:'W9  Feb 2026',h:{E001:38,  E002:38,  E004:37.5,E005:0   }},
    {label:'W8  Feb 2026',h:{E001:40,  E002:40,  E004:37.5,E005:0   }},
    {label:'W7  Jan 2026',h:{E001:37.5,E002:37.5,E004:37.5,E005:37.5}},
  ],

  users: [
    {id:'U001',name:'James Ashworth',email:'james@s4labour.co.uk',role:'super',   orgId:null,     initials:'JA'},
    {id:'U002',name:'Sarah Patel',   email:'sarah@s4labour.co.uk', role:'bureau',  orgId:null,     initials:'SP'},
    {id:'U003',name:'Donna Wright',  email:'donna@coffeeco.co.uk',  role:'org',     orgId:'ORG001', initials:'DW'},
    {id:'U004',name:'Tom Baker',     email:'tom@coffeeco.co.uk',    role:'processor',orgId:'ORG001',initials:'TB'},
  ],

  globalPayElements: [
    {id:'GPE001',name:'Statutory Sick Pay (SSP)',  category:'Statutory',type:'Addition',calcBasis:'Fixed — £116.75/wk',paye:'✓',ni:'✓',pension:'—'},
    {id:'GPE002',name:'Statutory Maternity Pay',   category:'Statutory',type:'Addition',calcBasis:'90% AWE / flat rate',paye:'✓',ni:'✓',pension:'—'},
    {id:'GPE003',name:'Student Loan Plan 1',       category:'HMRC',     type:'Deduction',calcBasis:'Above £24,990 pa',   paye:'—',ni:'—',pension:'—'},
    {id:'GPE004',name:'Student Loan Plan 2',       category:'HMRC',     type:'Deduction',calcBasis:'Above £27,295 pa',   paye:'—',ni:'—',pension:'—'},
  ],

  // Metadata
  meta: {
    currentOrgId: 'ORG001',
    lastSaved: null,
    schemaVersion: 1,
  }
};

// ── PERSISTENCE API ────────────────────────────────────────────
const Store = {
  // Load data from localStorage, falling back to seed
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return this._initFromSeed();
      const parsed = JSON.parse(raw);
      // Merge in any new seed keys not yet in stored data (schema evolution)
      if (!parsed.meta || parsed.meta.schemaVersion < SEED.meta.schemaVersion) {
        return this._initFromSeed();
      }
      return parsed;
    } catch(e) {
      console.warn('Store.load failed, resetting to seed:', e);
      return this._initFromSeed();
    }
  },

  // Save current state to localStorage
  save(data) {
    try {
      data.meta.lastSaved = new Date().toISOString();
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      return true;
    } catch(e) {
      console.error('Store.save failed (quota exceeded?):', e);
      return false;
    }
  },

  // Reset everything back to seed data
  reset() {
    localStorage.removeItem(DB_KEY);
    return this._initFromSeed();
  },

  // Deep clone seed so mutations don't corrupt the original
  _initFromSeed() {
    const data = JSON.parse(JSON.stringify(SEED));
    data.meta.lastSaved = new Date().toISOString();
    this.save(data);
    return data;
  },

  // Convenience: load, mutate, save in one call
  // Usage: Store.update(db => { db.employees.push(newEmp); })
  update(mutatorFn) {
    const data = this.load();
    mutatorFn(data);
    this.save(data);
    return data;
  }
};

// Expose globally
window.Store = Store;
window.SEED = SEED;
