// ═══════════════════════════════════════════════════════════════
// S4LABOUR PAYROLL — SHARED UI
// Fixed: toast system, safe renders, nav context, role switcher,
//        drawer auto-close, approveRun, saveGlobalPe selectors
// ═══════════════════════════════════════════════════════════════

// ── TOAST NOTIFICATION SYSTEM ──────────────────────────────────
function toast(message, type) {
  // type: 'success' | 'warning' | 'danger' | 'info'
  const colours = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger:  'var(--danger)',
    info:    'var(--teal)',
  };
  const bg = colours[type] || colours.success;
  const t = document.createElement('div');
  t.style.cssText = [
    'position:fixed','bottom:24px','right:24px',
    'background:' + bg,'color:#fff',
    'padding:12px 20px','border-radius:8px',
    'font-size:13px','font-weight:500',
    'z-index:9999','box-shadow:0 4px 16px rgba(0,0,0,0.18)',
    'display:flex','align-items:center','gap:8px',
    'animation:slideUp 0.2s ease',
    'max-width:360px','line-height:1.4'
  ].join(';');
  t.innerHTML = message;
  // Slide-up animation
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = '@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ── INIT ───────────────────────────────────────────────────────
function initAll() {
  // Guard each render — only run if the target elements exist on this page
  if (document.getElementById('run-card-metrics'))   renderRunCard();
  if (document.getElementById('run-detail-tbody'))   renderRunDetailTable();
  if (document.getElementById('hours-tbody'))        renderHoursTable();
  if (document.getElementById('employees-tbody'))    renderEmployeesTable();
  if (document.getElementById('bacs-tbody'))         renderBacsTable();
  if (document.getElementById('bd-org-tbody'))       updateBdCounts();
  // Employee profile renders only if we're on that screen
  if (document.getElementById('ytd-tbody'))          renderPayHistory(currentEmpId || 'E001');
  if (document.getElementById('pension-history-tbody')) renderPensionTab(currentEmpId || 'E001');
}

// ── NAVIGATION ─────────────────────────────────────────────────
let currentOrgName = 'The Coffee Co.';
let currentNavContext = 'bureau';
let currentEmpId = 'E001';

// Stubs — each page overrides these
if (typeof window.openOrg === 'undefined') window.openOrg = function() {};
if (typeof window.exitOrg === 'undefined') window.exitOrg = function() {};
if (typeof window.goToBureau === 'undefined') window.goToBureau = function() {};

function nav(screenId, navEl, context) {
  // Hide all screens, show target
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));
  const el = document.getElementById('screen-' + screenId);
  if (el) el.classList.add('visible');

  // Update active nav item in drawer
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }

  // Screen titles for breadcrumb
  const titles = {
    'bureau-dashboard':   'Bureau Dashboard',
    'all-runs':           'All pay runs',
    'organisations':      'Organisations',
    'user-management':    'User management',
    'pay-element-library':'Global pay elements',
    'org-onboarding':     'Onboard employer',
    'org-dashboard':      'Dashboard',
    'payroll-runs':       'Payroll runs',
    'hours':              'Hours & amendments',
    'employees':          'Employees',
    'employee-profile':   'Employee profile',
    'onboarding':         'Onboarding',
    'life-events':        'Life events',
    'payslips':           'Payslips & P60s',
    'pay-elements':       'Pay elements',
    'reports':            'Reports',
    'org-settings':       'Org settings',
  };

  // Breadcrumb
  const crumbEl = document.getElementById('crumb-current');
  if (crumbEl) {
    const ctx = context || currentNavContext;
    if (ctx === 'org') {
      const backFn = window._pageContext === 'bureau' ? 'exitOrg()' : 'goToBureau()';
      crumbEl.innerHTML =
        '<span class="crumb" onclick="' + backFn + '" style="cursor:pointer">' + currentOrgName + '</span>' +
        ' <span class="crumb-sep">\u203a</span> ' +
        '<span class="crumb active">' + (titles[screenId] || screenId) + '</span>';
    } else {
      crumbEl.innerHTML = '<span class="crumb active">' + (titles[screenId] || screenId) + '</span>';
    }
  }

  // Sync rail + drawer active states
  syncRailActive(screenId);

  // Trigger renders for screens that need live data
  if (screenId === 'payroll-runs')    renderRunCard();
  if (screenId === 'hours')           renderHoursTable();
  if (screenId === 'employees')       renderEmployeesTable();
  if (screenId === 'employee-profile') {
    renderPayHistory(currentEmpId);
    renderPensionTab(currentEmpId);
  }
}

function switchRole(role, btn) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const names = { super: 'James Ashworth', bureau: 'Sarah Patel', org: 'Donna Wright', processor: 'Tom Baker' };
  const roles = { super: 'Super Admin', bureau: 'Bureau Admin', org: 'Org Admin', processor: 'Processor' };
  const ini   = { super: 'JA', bureau: 'SP', org: 'DW', processor: 'TB' };

  const sbName = document.getElementById('user-name-sb'); if (sbName) sbName.textContent = names[role];
  const sbRole = document.getElementById('user-role-sb'); if (sbRole) sbRole.textContent = roles[role];
  const sbAv   = document.getElementById('user-avatar-sb'); if (sbAv) sbAv.textContent = ini[role];
  const ra     = document.getElementById('rail-avatar'); if (ra) ra.textContent = ini[role];

  // Page-context aware navigation
  const ctx = window._pageContext;
  if (ctx === 'bureau') {
    if (role === 'org' || role === 'processor') window.openOrg('The Coffee Co.', 'screen-org-dashboard');
    // super/bureau stays on bureau page, no action needed
  } else if (ctx === 'org') {
    if (role === 'super' || role === 'bureau') window.goToBureau();
    // org/processor stays on org page
  }
}

// ── MODALS ─────────────────────────────────────────────────────
function showModal(id) {
  const e = document.getElementById(id);
  if (e) e.style.display = 'flex';
}

function closeModal(id, event) {
  if (!event || event.target === document.getElementById(id)) {
    const e = document.getElementById(id);
    if (e) e.style.display = 'none';
  }
}

// Close all modals on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    closeDrawer();
  }
});

// ── TAB SWITCHERS ───────────────────────────────────────────────
function empTab(tab, el) {
  document.querySelectorAll('.emp-tab-panel').forEach(p => p.classList.remove('visible'));
  const t = document.getElementById('emp-' + tab); if (t) t.classList.add('visible');
  document.querySelectorAll('#emp-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'ytd')     renderPayHistory(currentEmpId);
  if (tab === 'pension') renderPensionTab(currentEmpId);
}

function umTab(tab, el) {
  ['hierarchy', 'users', 'create'].forEach(t => {
    const p = document.getElementById('um-' + t); if (p) p.style.display = 'none';
  });
  const t = document.getElementById('um-' + tab); if (t) t.style.display = 'block';
  document.querySelectorAll('#um-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

function pelTab(tab, el) {
  const ee = document.getElementById('pel-elements'); if (ee) ee.style.display = tab === 'elements' ? 'block' : 'none';
  const er = document.getElementById('pel-rates');    if (er) er.style.display = tab === 'rates' ? 'block' : 'none';
  document.querySelectorAll('#pel-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

function osTab(tab, el) {
  ['company', 'paye', 'locations', 'hmrc', 'schedules', 'users'].forEach(t => {
    const p = document.getElementById('os-' + t); if (p) p.style.display = 'none';
  });
  const t = document.getElementById('os-' + tab); if (t) t.style.display = 'block';
  document.querySelectorAll('#os-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

function hoursTab(tab, el) {
  ['current', 'backdated', 'future'].forEach(t => {
    const p = document.getElementById('hours-tab-' + t); if (p) p.style.display = 'none';
  });
  const t = document.getElementById('hours-tab-' + tab); if (t) t.style.display = 'block';
  document.querySelectorAll('#hours-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

// ── WIZARD ─────────────────────────────────────────────────────
function wizN(step) {
  const cur = document.getElementById('wiz-p' + step);         if (cur) cur.style.display = 'none';
  const nxt = document.getElementById('wiz-p' + (step + 1));   if (nxt) nxt.style.display = 'block';
  const cs  = document.getElementById('wiz-s' + step);
  if (cs) { cs.className = 'step done'; const sn = cs.querySelector('.step-num'); if (sn) sn.textContent = '✓'; }
  const l = document.getElementById('wiz-l' + step);           if (l) l.classList.add('done');
  const ns = document.getElementById('wiz-s' + (step + 1));    if (ns) ns.className = 'step active';
}

function wizB(step) {
  const cur = document.getElementById('wiz-p' + step);         if (cur) cur.style.display = 'none';
  const prv = document.getElementById('wiz-p' + (step - 1));   if (prv) prv.style.display = 'block';
  const cs  = document.getElementById('wiz-s' + step);
  if (cs) { cs.className = 'step pending'; const sn = cs.querySelector('.step-num'); if (sn) sn.textContent = step; }
  const l = document.getElementById('wiz-l' + (step - 1));     if (l) l.classList.remove('done');
  const ps = document.getElementById('wiz-s' + (step - 1));
  if (ps) { ps.className = 'step active'; const sn = ps.querySelector('.step-num'); if (sn) sn.textContent = step - 1; }
}

function activateWiz() {
  const p5 = document.getElementById('wiz-p5');        if (p5) p5.style.display = 'none';
  const wc = document.getElementById('wiz-complete');  if (wc) wc.style.display = 'block';
  const s5 = document.getElementById('wiz-s5');
  if (s5) { s5.className = 'step done'; const sn = s5.querySelector('.step-num'); if (sn) sn.textContent = '✓'; }
  const l4 = document.getElementById('wiz-l4');        if (l4) l4.classList.add('done');
}

// ── RTI TEST ───────────────────────────────────────────────────
function testRTI() {
  const r = document.getElementById('rti-result');
  if (!r) return;
  r.style.display = 'none';
  r.className = 'badge badge-warning';
  r.textContent = '↻ Testing connection...';
  setTimeout(() => {
    r.style.display = 'inline-flex';
    r.className = 'badge badge-success';
    r.textContent = '✓ Connected';
  }, 1200);
}

function testRTI2() {
  const r = document.getElementById('rti2-result');
  if (!r) return;
  r.textContent = '↻ Testing...';
  r.className = 'badge badge-warning';
  setTimeout(() => {
    r.textContent = '✓ Connected · verified just now';
    r.className = 'badge badge-success';
  }, 1200);
}

// ── PAYROLL ACTIONS ────────────────────────────────────────────
function approveRun() {
  closeModal('modal-run-approve');
  // Find the pending badge specifically inside the run card
  const runCard = document.querySelector('.run-card');
  if (runCard) {
    const badge = runCard.querySelector('.badge-warning');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.textContent = 'Approved — awaiting HMRC submission';
    }
    // Update run card border
    runCard.style.borderLeftColor = 'var(--success)';
  }
  // Disable approve button
  const approveBtn = document.querySelector('.run-card .btn-primary');
  if (approveBtn && approveBtn.textContent.includes('Approve')) {
    approveBtn.disabled = true;
    approveBtn.textContent = '✓ Approved';
    approveBtn.className = 'btn btn-xs btn-success';
  }
  toast('✓ Payroll run approved — ready for HMRC submission', 'success');
}

function submitFPS() {
  const r = document.getElementById('fps-submit-result');
  if (r) r.style.display = 'flex';
  const b = document.getElementById('fps-submit-btn');
  if (b) {
    b.textContent = 'FPS submitted ✓';
    b.disabled = true;
    b.className = 'btn btn-success';
  }
}

// ── BUREAU DASHBOARD ───────────────────────────────────────────
function bdFilter(filter, el) {
  document.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('#bd-org-tbody tr.bd-row').forEach(row => {
    if (filter === 'all')    row.style.display = '';
    else if (filter === 'action') row.style.display = row.classList.contains('bd-row-action') ? '' : 'none';
    else row.style.display = row.classList.contains('bd-row-clear') ? '' : 'none';
  });
}

function bdSearch(val) {
  const q = val.toLowerCase();
  document.querySelectorAll('#bd-org-tbody tr.bd-row').forEach(row => {
    row.style.display = (!q || row.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

function updateBdCounts() {
  const actionCount = document.querySelectorAll('#bd-org-tbody tr.bd-row-action').length;
  const clearCount  = document.querySelectorAll('#bd-org-tbody tr.bd-row-clear').length;
  const total = actionCount + clearCount;
  const pills = document.querySelectorAll('#screen-bureau-dashboard .pill-tab');
  if (pills[0]) pills[0].textContent = 'All (' + total + ')';
  if (pills[1]) pills[1].textContent = 'Needs action (' + actionCount + ')';
  if (pills[2]) pills[2].textContent = 'Clear (' + clearCount + ')';
}

// ── USER MANAGEMENT ────────────────────────────────────────────
const roleHints = {
  bureau:    'Bureau Admins manage multiple organisations and can create Org Admins & Processors.',
  org:       'Org Admins can approve payroll and manage a single organisation.',
  processor: 'Processors can initiate runs and enter hours but cannot approve payroll.',
};
const rolePerms = {
  bureau:    ['✓ Create Org Admins & Processors', '✓ Run & approve payroll', '✓ View all pay elements', '✗ Cannot create Global Pay Elements'],
  org:       ['✓ Approve payroll runs', '✓ Amend pay run', '✓ View org data', '✗ Cannot create pay elements'],
  processor: ['✓ Initiate payroll runs', '✓ Enter hours & amendments', '✗ Cannot approve payroll', '✗ No financial data access'],
};

function toggleOrgAccess() {
  const role = document.getElementById('create-user-role').value;
  const of = document.getElementById('org-access-field');    if (of) of.style.display = (role === 'org' || role === 'processor') ? 'flex' : 'none';
  const bf = document.getElementById('bureau-org-access');   if (bf) bf.style.display = role === 'bureau' ? 'block' : 'none';
  const hint = document.getElementById('role-hint-text');
  const pb   = document.getElementById('permission-preview');
  const pc   = document.getElementById('perm-preview-content');
  if (role && roleHints[role]) {
    if (hint) { hint.textContent = roleHints[role]; hint.style.display = 'block'; }
    if (pb) pb.style.display = 'block';
    if (pc) pc.innerHTML = rolePerms[role].map(p =>
      '<span class="perm-tag ' + (p.startsWith('✓') ? 'can' : 'cannot') + '">' + p + '</span>'
    ).join('');
  } else {
    if (hint) hint.style.display = 'none';
    if (pb) pb.style.display = 'none';
  }
}

function toggleOrgAccess2() {
  const r = document.getElementById('modal-role-sel');
  if (r) {
    const mof = document.getElementById('modal-org-field');
    if (mof) mof.style.display = (r.value === 'org' || r.value === 'processor') ? 'flex' : 'none';
  }
}

function submitCreateUser() {
  const role = document.getElementById('create-user-role');
  if (!role || !role.value) { alert('Please select a role'); return; }
  const card = document.querySelector('#um-create .card');
  if (card) {
    card.innerHTML = [
      '<div style="text-align:center;padding:40px 32px">',
      '<div style="width:56px;height:56px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success);',
      'display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px">✓</div>',
      '<div class="page-title" style="font-size:17px;margin-bottom:8px">Invite sent!</div>',
      '<div style="color:var(--text2);font-size:13px;margin-bottom:20px">The user will receive an email to set their password on first login.</div>',
      '<button class="btn btn-primary" onclick="location.reload()">Create another user</button>',
      '</div>'
    ].join('');
  }
  toast('✓ Invite email sent', 'success');
}

// ── REPORTS ────────────────────────────────────────────────────
function updateReportStatus() {
  const val = document.getElementById('report-run-sel');
  if (!val) return;
  const a  = document.getElementById('report-alert-approved');
  const ip = document.getElementById('report-alert-inprogress');
  const b  = document.getElementById('bacs-download-btn');
  if (val.value === 'inprogress') {
    if (a)  a.style.display = 'none';
    if (ip) ip.style.display = 'flex';
    if (b)  b.disabled = true;
  } else {
    if (a)  a.style.display = 'flex';
    if (ip) ip.style.display = 'none';
    if (b)  b.disabled = false;
  }
}

// ── WIZARD LOCATIONS ───────────────────────────────────────────
function addWizLocation() {
  const container = document.getElementById('wiz-locations-list');
  if (!container) return;
  const n = container.querySelectorAll('.wiz-loc-row').length + 1;
  const row = document.createElement('div');
  row.className = 'wiz-loc-row';
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1.5fr 120px 140px 44px;gap:10px;align-items:end;padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:10px';
  row.innerHTML = [
    '<div class="form-group"><label>Location name</label><input placeholder="e.g. Location ' + n + '"></div>',
    '<div class="form-group"><label>Address</label><input placeholder="Street, postcode"></div>',
    '<div class="form-group"><label>Location code</label><input class="mono" placeholder="LOC-00' + n + '" style="text-transform:uppercase"></div>',
    '<div class="form-group"><label>Cost centre</label><input class="mono" placeholder="CC-CODE"></div>',
    '<div class="form-group"><label style="visibility:hidden">Del</label><button class="btn btn-xs btn-danger w-full" onclick="removeWizLocation(this)">✕</button></div>',
  ].join('');
  container.appendChild(row);
}

function removeWizLocation(btn) {
  const rows = document.querySelectorAll('.wiz-loc-row');
  if (rows.length > 1) btn.closest('.wiz-loc-row').remove();
  else alert('At least one location is required.');
}

// ── GLOBAL PAY ELEMENTS ────────────────────────────────────────
function toggleGlobalPeCalc() {
  const calcEl = document.getElementById('global-pe-calc');
  if (!calcEl) return;
  const val = calcEl.value;
  const amtField  = document.getElementById('global-pe-amount-field');
  const fmlaField = document.getElementById('global-pe-formula-field');
  if (val === 'formula') {
    if (amtField)  amtField.style.display  = 'none';
    if (fmlaField) fmlaField.style.display = 'block';
  } else {
    if (amtField)  amtField.style.display  = 'flex';
    if (fmlaField) fmlaField.style.display = 'none';
    const inp = amtField ? amtField.querySelector('input') : null;
    if (inp) {
      const placeholders = { fixed: 'e.g. £184.03', 'pct-gross': 'e.g. 90%', 'pct-awe': 'e.g. 90%', threshold: 'e.g. 9% above £24,990' };
      inp.placeholder = placeholders[val] || '£ or %';
    }
  }
}

function saveGlobalPe() {
  // Use ID-based selectors — robust against DOM changes
  const modal = document.getElementById('modal-add-global-pe');
  if (!modal) return;

  const nameEl = modal.querySelector('input[type="text"], input:not([type])');
  const name   = nameEl ? nameEl.value.trim() : '';
  if (!name) { alert('Please enter an element name.'); return; }

  const selects    = modal.querySelectorAll('select');
  const cat        = selects[0] ? selects[0].value : '—';
  const type       = selects[1] ? selects[1].value : 'Addition';
  const calcEl     = document.getElementById('global-pe-calc');
  const calcBasis  = calcEl ? calcEl.options[calcEl.selectedIndex].text : '—';
  const paye       = selects[3] ? (selects[3].value === 'Yes' ? '✓' : '—') : '—';
  const ni         = selects[4] ? (selects[4].value === 'Yes' ? '✓' : '—') : '—';
  const pen        = selects[5] ? (selects[5].value === 'Yes' ? '✓' : '—') : '—';

  const tbody = document.getElementById('global-pe-tbody');
  if (tbody) {
    const catBadge = cat === 'Statutory' ? 'badge-purple' : cat === 'HMRC' ? 'badge-neutral' : 'badge-info';
    const typeTag  = type === 'Addition'  ? 'pe-tag pe-add' : 'pe-tag pe-ded';
    const tr = document.createElement('tr');
    tr.innerHTML = [
      '<td class="font-600">' + name + '</td>',
      '<td><span class="badge ' + catBadge + '">' + cat + '</span></td>',
      '<td><span class="' + typeTag + '">' + type + '</span></td>',
      '<td>' + calcBasis + '</td>',
      '<td>' + paye + '</td><td>' + ni + '</td><td>' + pen + '</td>',
      '<td class="td-action">',
      '<button class="btn btn-xs">Edit</button>',
      '<button class="btn btn-xs btn-danger" onclick="this.closest(\'tr\').remove()">Remove</button>',
      '</td>',
    ].join('');
    tbody.appendChild(tr);
  }

  // Persist to Store
  Store.update(function(db) {
    db.globalPayElements = db.globalPayElements || [];
    db.globalPayElements.push({ id: 'GPE' + Date.now(), name, category: cat, type, calcBasis, paye, ni, pension: pen });
  });

  closeModal('modal-add-global-pe');
  toast('✓ Global element "' + name + '" created', 'success');

  // Reset form
  if (nameEl) nameEl.value = '';
}

// ── ICON RAIL + DRAWER ─────────────────────────────────────────
function toggleDrawer() {
  const drawer = document.getElementById('sidebar');
  if (!drawer) return;
  if (drawer.classList.contains('open')) closeDrawer();
  else openDrawer();
}

function openDrawer() {
  const d = document.getElementById('sidebar');
  const o = document.getElementById('sidebar-overlay');
  if (d) d.classList.add('open');
  if (o) o.classList.add('open');
}

function closeDrawer() {
  const d = document.getElementById('sidebar');
  const o = document.getElementById('sidebar-overlay');
  if (d) d.classList.remove('open');
  if (o) o.classList.remove('open');
}

// Rail nav: click icon → navigate + open drawer
// Second click on same active icon → close drawer
function railNav(screenId, context) {
  const drawer = document.getElementById('sidebar');
  if (!drawer) return;
  const alreadyOpen   = drawer.classList.contains('open');
  const target        = document.getElementById('ri-' + screenId);
  const alreadyActive = target && target.classList.contains('active');

  if (alreadyOpen && alreadyActive) {
    closeDrawer();
    return;
  }

  document.querySelectorAll('.rail-item').forEach(ri => ri.classList.remove('active'));
  if (target) target.classList.add('active');
  nav(screenId, null, context);
  openDrawer();
}

function syncRailActive(screenId) {
  document.querySelectorAll('.rail-item').forEach(ri => ri.classList.remove('active'));
  const target = document.getElementById('ri-' + screenId)
              || document.getElementById('ri-org-' + screenId);
  if (target) target.classList.add('active');

  // Sync drawer nav items
  document.querySelectorAll('.nav-item').forEach(ni => {
    ni.classList.remove('active');
    const onclick = ni.getAttribute('onclick') || '';
    if (onclick.includes("'" + screenId + "'")) ni.classList.add('active');
  });
}

// Tooltip: position vertically centred on the hovered rail item
document.addEventListener('mouseover', function(e) {
  const item = e.target.closest('.rail-item');
  if (!item) return;
  const tip = item.querySelector('.rail-tooltip');
  if (!tip) return;
  const rect = item.getBoundingClientRect();
  tip.style.top = (rect.top + rect.height / 2 - 12) + 'px';
});

// ── BOOT ───────────────────────────────────────────────────────
// Each page handles its own DOMContentLoaded so it can set
// context (org name, employee data, etc.) before calling initAll().
