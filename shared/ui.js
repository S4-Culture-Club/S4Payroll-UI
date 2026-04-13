function initAll(){
  renderRunCard();
  renderRunDetailTable();
  renderHoursTable();
  renderEmployeesTable();
  renderBacsTable();
  renderPayHistory('E001');
  renderPensionTab('E001');
  updateBdCounts();
}

// ═══════════════════════════════════════════════════════════════
// UI / NAVIGATION
// ═══════════════════════════════════════════════════════════════
let currentOrgName='The Coffee Co.', currentNavContext='bureau';

// openOrg and exitOrg are stubs here — each page overrides them
// bureau/index.html overrides openOrg to navigate to org/index.html
// org/index.html overrides exitOrg to navigate back to bureau/index.html
// These stubs prevent errors if called before page-level override loads
if (typeof openOrg === 'undefined') {
  window.openOrg = function(orgName, screen) {
    console.warn('openOrg called but not overridden by page');
  };
}
if (typeof exitOrg === 'undefined') {
  window.exitOrg = function() {
    console.warn('exitOrg called but not overridden by page');
  };
}

function nav(screenId,navEl,context){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));
  const el=document.getElementById('screen-'+screenId); if(el)el.classList.add('visible');
  if(navEl){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));navEl.classList.add('active');}
  const titles={'bureau-dashboard':'Bureau Dashboard','all-runs':'All pay runs','organisations':'Organisations','user-management':'User management','pay-element-library':'Global pay elements','global-settings':'Global pay elements','org-onboarding':'Onboard employer','org-dashboard':'Dashboard','payroll-runs':'Payroll runs','hours':'Hours & amendments','employees':'Employees','employee-profile':'Employee profile','onboarding':'Onboarding','life-events':'Life events','payslips':'Payslips & P60s','pay-elements':'Pay elements','reports':'Reports','org-settings':'Org settings'};
  const crumbEl = document.getElementById('crumb-current');
  if(crumbEl) {
    // On org page: show "OrgName > Section" — clicking org name navigates back via goToBureau if on org-only page
    const ctx = context || currentNavContext;
    if(ctx==='org') {
      const backFn = window._pageContext === 'bureau' ? "exitOrg()" : "goToBureau()";
      crumbEl.innerHTML = '<span class="crumb" onclick="' + backFn + '" style="cursor:pointer">' + currentOrgName + '</span> <span class="crumb-sep">\u203a</span> <span class="crumb active">' + (titles[screenId]||screenId) + '</span>';
    } else {
      crumbEl.innerHTML = '<span class="crumb active">' + (titles[screenId]||screenId) + '</span>';
    }
  }
  syncRailActive(screenId);
  if(screenId==='payroll-runs')renderRunCard();
  if(screenId==='hours')renderHoursTable();
  if(screenId==='employees')renderEmployeesTable();
  if(screenId==='employee-profile'){renderPayHistory(currentEmpId);renderPensionTab(currentEmpId);}
}

function switchRole(role,btn){
  document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const names={super:'James Ashworth',bureau:'Sarah Patel',org:'Donna Wright',processor:'Tom Baker'};
  const roles={super:'Super Admin',bureau:'Bureau Admin',org:'Org Admin',processor:'Processor'};
  const ini={super:'JA',bureau:'SP',org:'DW',processor:'TB'};
  const sb_name=document.getElementById('user-name-sb'); if(sb_name)sb_name.textContent=names[role];
  const sb_role=document.getElementById('user-role-sb'); if(sb_role)sb_role.textContent=roles[role];
  const sb_av=document.getElementById('user-avatar-sb'); if(sb_av)sb_av.textContent=ini[role];
  const ra=document.getElementById('rail-avatar'); if(ra)ra.textContent=ini[role];
  // On bureau page: role=org/processor opens org view; role=super/bureau stays bureau
  // On org page: role=super/bureau goes back to bureau page
  if(typeof window._pageContext !== 'undefined') {
    if(window._pageContext === 'bureau') {
      if(role==='org'||role==='processor') openOrg('The Coffee Co.','screen-org-dashboard');
    } else if(window._pageContext === 'org') {
      if(role==='super'||role==='bureau') goToBureau();
    }
  }
}
function showModal(id){const e=document.getElementById(id);if(e)e.style.display='flex';}
function closeModal(id,event){if(!event||event.target===document.getElementById(id)){const e=document.getElementById(id);if(e)e.style.display='none';}}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none');});

function empTab(tab,el){
  document.querySelectorAll('.emp-tab-panel').forEach(p=>p.classList.remove('visible'));
  const t=document.getElementById('emp-'+tab);if(t)t.classList.add('visible');
  document.querySelectorAll('#emp-tabs .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
  if(tab==='ytd')renderPayHistory(currentEmpId);
  if(tab==='pension')renderPensionTab(currentEmpId);
}
function umTab(tab,el){
  ['hierarchy','users','create'].forEach(t=>{const p=document.getElementById('um-'+t);if(p)p.style.display='none';});
  const t=document.getElementById('um-'+tab);if(t)t.style.display='block';
  document.querySelectorAll('#um-tabs .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
}
function peLibTab(tab,el){
  const eg=document.getElementById('pe-global');if(eg)eg.style.display=tab==='global'?'block':'none';
  const eo=document.getElementById('pe-org');if(eo)eo.style.display=tab==='org'?'block':'none';
  document.querySelectorAll('#pe-tabs .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
}
function pelTab(tab,el){
  const ee=document.getElementById('pel-elements');if(ee)ee.style.display=tab==='elements'?'block':'none';
  const er=document.getElementById('pel-rates');if(er)er.style.display=tab==='rates'?'block':'none';
  document.querySelectorAll('#pel-tabs .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
}
function osTab(tab,el){
  ['company','paye','locations','hmrc','schedules','users'].forEach(t=>{const p=document.getElementById('os-'+t);if(p)p.style.display='none';});
  const t=document.getElementById('os-'+tab);if(t)t.style.display='block';
  document.querySelectorAll('#os-tabs .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
}
function hoursTab(tab,el){
  ['current','backdated','future'].forEach(t=>{const p=document.getElementById('hours-tab-'+t);if(p)p.style.display='none';});
  const t=document.getElementById('hours-tab-'+tab);if(t)t.style.display='block';
  document.querySelectorAll('#hours-tabs .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
}
function wizN(step){
  document.getElementById('wiz-p'+step).style.display='none';
  document.getElementById('wiz-p'+(step+1)).style.display='block';
  const c=document.getElementById('wiz-s'+step);c.className='step done';c.querySelector('.step-num').textContent='✓';
  const l=document.getElementById('wiz-l'+step);if(l)l.classList.add('done');
  const n=document.getElementById('wiz-s'+(step+1));if(n)n.className='step active';
}
function wizB(step){
  document.getElementById('wiz-p'+step).style.display='none';
  document.getElementById('wiz-p'+(step-1)).style.display='block';
  const c=document.getElementById('wiz-s'+step);c.className='step pending';c.querySelector('.step-num').textContent=step;
  const l=document.getElementById('wiz-l'+(step-1));if(l)l.classList.remove('done');
  const p=document.getElementById('wiz-s'+(step-1));if(p){p.className='step active';p.querySelector('.step-num').textContent=step-1;}
}
function activateWiz(){
  document.getElementById('wiz-p5').style.display='none';
  document.getElementById('wiz-complete').style.display='block';
  const l=document.getElementById('wiz-s5');l.className='step done';l.querySelector('.step-num').textContent='✓';
  document.getElementById('wiz-l4').classList.add('done');
}
function testRTI(){const r=document.getElementById('rti-result');r.style.display='none';setTimeout(()=>{r.style.display='inline-flex';},900);}
function testRTI2(){const r=document.getElementById('rti2-result');r.textContent='↻ Testing...';r.className='badge badge-warning';setTimeout(()=>{r.textContent='✓ Connected · verified just now';r.className='badge badge-success';},900);}
function approveRun(){
  closeModal('modal-run-approve');
  const b=document.querySelector('.run-card .badge-warning');if(b){b.className='badge badge-success';b.textContent='Approved — awaiting HMRC submission';}
}
function submitFPS(){
  const r=document.getElementById('fps-submit-result');if(r)r.style.display='flex';
  const b=document.getElementById('fps-submit-btn');
  if(b){b.textContent='FPS submitted ✓';b.disabled=true;b.className='btn btn-success';}
}
function bdFilter(filter,el){
  document.querySelectorAll('.pill-tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');
  document.querySelectorAll('#bd-org-tbody tr.bd-row').forEach(row=>{
    row.style.display=filter==='all'?'':filter==='action'?(row.classList.contains('bd-row-action')?'':'none'):(row.classList.contains('bd-row-clear')?'':'none');
  });
}
function bdSearch(val){
  const q=val.toLowerCase();
  document.querySelectorAll('#bd-org-tbody tr.bd-row').forEach(row=>{row.style.display=(!q||row.textContent.toLowerCase().includes(q))?'':'none';});
}
function updateBdCounts(){
  const actionCount=document.querySelectorAll('#bd-org-tbody tr.bd-row-action').length;
  const clearCount=document.querySelectorAll('#bd-org-tbody tr.bd-row-clear').length;
  const total=actionCount+clearCount;
  const pills=document.querySelectorAll('#screen-bureau-dashboard .pill-tab');
  if(pills[0])pills[0].textContent='All ('+total+')';
  if(pills[1])pills[1].textContent='Needs action ('+actionCount+')';
  if(pills[2])pills[2].textContent='Clear ('+clearCount+')';
}
const roleHints={bureau:'Bureau Admins manage multiple organisations and can create Org Admins & Processors.',org:'Org Admins can approve payroll and manage a single organisation.',processor:'Processors can initiate runs and enter hours but cannot approve payroll.'};
const rolePerms={bureau:['✓ Create Org Admins & Processors','✓ Run & approve payroll','✓ View all pay elements','✗ Cannot create Global Pay Elements'],org:['✓ Approve payroll runs','✓ Amend pay run','✓ View org data','✗ Cannot create pay elements'],processor:['✓ Initiate payroll runs','✓ Enter hours & amendments','✗ Cannot approve payroll','✗ No financial data access']};
function toggleOrgAccess(){
  const role=document.getElementById('create-user-role').value;
  const of=document.getElementById('org-access-field');if(of)of.style.display=(role==='org'||role==='processor')?'flex':'none';
  const bf=document.getElementById('bureau-org-access');if(bf)bf.style.display=role==='bureau'?'block':'none';
  const hint=document.getElementById('role-hint-text');
  const pb=document.getElementById('permission-preview');
  const pc=document.getElementById('perm-preview-content');
  if(role&&roleHints[role]){if(hint){hint.textContent=roleHints[role];hint.style.display='block';}if(pb)pb.style.display='block';if(pc)pc.innerHTML=rolePerms[role].map(p=>`<span class="perm-tag ${p.startsWith('✓')?'can':'cannot'}">${p}</span>`).join('');}
  else{if(hint)hint.style.display='none';if(pb)pb.style.display='none';}
}
function toggleOrgAccess2(){const r=document.getElementById('modal-role-sel');if(r){const mof=document.getElementById('modal-org-field');if(mof)mof.style.display=(r.value==='org'||r.value==='processor')?'flex':'none';}}
function submitCreateUser(){
  const role=document.getElementById('create-user-role').value;if(!role){alert('Please select a role');return;}
  const card=document.querySelector('#um-create .card');
  if(card)card.innerHTML='<div style="text-align:center;padding:32px"><div style="width:48px;height:48px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 12px">✓</div><div class="page-title" style="font-size:16px;margin-bottom:8px">Invite sent!</div><div class="text-muted" style="margin-bottom:20px">The user will receive an email to set their password.</div><button class="btn btn-primary" onclick="location.reload()">Create another user</button></div>';
}
function updateReportStatus(){
  const val=document.getElementById('report-run-sel').value;
  const a=document.getElementById('report-alert-approved');const ip=document.getElementById('report-alert-inprogress');const b=document.getElementById('bacs-download-btn');
  if(val==='inprogress'){if(a)a.style.display='none';if(ip)ip.style.display='flex';if(b)b.disabled=true;}
  else{if(a)a.style.display='flex';if(ip)ip.style.display='none';if(b)b.disabled=false;}
}
function addWizLocation(){
  const container=document.getElementById('wiz-locations-list');
  const n=container.querySelectorAll('.wiz-loc-row').length+1;
  const row=document.createElement('div');
  row.className='wiz-loc-row';
  row.style.cssText='display:grid;grid-template-columns:1fr 1.5fr 120px 140px 44px;gap:10px;align-items:end;padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:10px';
  row.innerHTML=`<div class="form-group"><label>Location name</label><input placeholder="e.g. Location ${n}"></div><div class="form-group"><label>Address</label><input placeholder="Street, postcode"></div><div class="form-group"><label>Location code</label><input class="mono" placeholder="LOC-00${n}" style="text-transform:uppercase"></div><div class="form-group"><label>Cost centre</label><input class="mono" placeholder="CC-CODE"></div><div class="form-group"><label style="visibility:hidden">Del</label><button class="btn btn-xs btn-danger w-full" onclick="removeWizLocation(this)" title="Remove">✕</button></div>`;
  container.appendChild(row);
}
function removeWizLocation(btn){
  const rows=document.querySelectorAll('.wiz-loc-row');
  if(rows.length>1)btn.closest('.wiz-loc-row').remove();
  else alert('At least one location is required.');
}

// ── GLOBAL PAY ELEMENT MODAL ──
function toggleGlobalPeCalc() {
  const val = document.getElementById('global-pe-calc').value;
  const amtField = document.getElementById('global-pe-amount-field');
  const fmlaField = document.getElementById('global-pe-formula-field');
  if (val === 'formula') {
    amtField.style.display = 'none';
    fmlaField.style.display = 'block';
  } else {
    amtField.style.display = 'flex';
    fmlaField.style.display = 'none';
    // Update placeholder based on type
    const inp = amtField.querySelector('input');
    if (inp) {
      if (val === 'fixed') inp.placeholder = 'e.g. £184.03';
      else if (val === 'pct-gross' || val === 'pct-awe') inp.placeholder = 'e.g. 90%';
      else if (val === 'threshold') inp.placeholder = 'e.g. 9% above £24,990';
    }
  }
}

function saveGlobalPe() {
  // Read values
  const name = document.querySelector('#modal-add-global-pe input[placeholder*="Element name"], #modal-add-global-pe input[placeholder*="Adoption"]').value;
  if (!name.trim()) { alert('Please enter an element name.'); return; }

  const catEl   = document.querySelector('#modal-add-global-pe select:nth-of-type(1)');
  const typeEl  = document.querySelector('#modal-add-global-pe select:nth-of-type(2)');
  const calcEl  = document.getElementById('global-pe-calc');
  const payeEl  = document.querySelector('#modal-add-global-pe .form-section:nth-of-type(2) select:nth-of-type(1)');
  const niEl    = document.querySelector('#modal-add-global-pe .form-section:nth-of-type(2) select:nth-of-type(2)');
  const penEl   = document.querySelector('#modal-add-global-pe .form-section:nth-of-type(2) select:nth-of-type(3)');

  const cat    = catEl   ? catEl.value   : '—';
  const type   = typeEl  ? typeEl.value  : 'Addition';
  const calcBasis = calcEl ? calcEl.options[calcEl.selectedIndex].text : '—';
  const paye   = payeEl  ? (payeEl.value  === 'Yes' ? '✓' : '—') : '—';
  const ni     = niEl    ? (niEl.value    === 'Yes' ? '✓' : '—') : '—';
  const pen    = penEl   ? (penEl.value   === 'Yes' ? '✓' : '—') : '—';

  // Append row to the global pe table
  const tbody = document.getElementById('global-pe-tbody');
  if (tbody) {
    const catBadge = cat === 'Statutory' ? 'badge-purple' : cat === 'HMRC' ? 'badge-neutral' : 'badge-info';
    const typeTag  = type === 'Addition' ? 'pe-tag pe-add' : 'pe-tag pe-ded';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-600">${name}</td>
      <td><span class="badge ${catBadge}">${cat}</span></td>
      <td><span class="${typeTag}">${type}</span></td>
      <td>${calcBasis}</td>
      <td>${paye}</td><td>${ni}</td><td>${pen}</td>
      <td class="td-action">
        <button class="btn btn-xs">Edit</button>
        <button class="btn btn-xs btn-danger" onclick="this.closest('tr').remove()">Remove</button>
      </td>`;
    tbody.appendChild(tr);
  }

  closeModal('modal-add-global-pe');

  // Show confirmation toast
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--success);color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.15)';
  toast.textContent = '✓ Global element "' + name + '" created';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ════════════════════════════════════════════════
// ICON RAIL + DRAWER
// ════════════════════════════════════════════════

function toggleDrawer() {
  const drawer = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) closeDrawer();
  else openDrawer();
}

function openDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// Rail navigation — opens drawer showing full nav, highlights active section
function railNav(screenId, context) {
  // If drawer is already open AND this section is already active → close drawer (toggle)
  const drawer = document.getElementById('sidebar');
  const alreadyOpen = drawer.classList.contains('open');
  const alreadyActive = document.getElementById('ri-' + screenId)?.classList.contains('active');
  if (alreadyOpen && alreadyActive) {
    closeDrawer();
    return;
  }
  // Clear all rail actives, set this one
  document.querySelectorAll('.rail-item').forEach(ri => ri.classList.remove('active'));
  const target = document.getElementById('ri-' + screenId);
  if (target) target.classList.add('active');
  // Navigate to the screen
  nav(screenId, null, context);
  // Open drawer to show full context
  openDrawer();
}

// Keep rail in sync when nav() is called via any path
function syncRailActive(screenId) {
  document.querySelectorAll('.rail-item').forEach(ri => ri.classList.remove('active'));
  // Try exact id match first, then fallback to org- prefix
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

// Tooltip positioning — keep tooltip vertically centered on rail item
document.addEventListener('mouseover', function(e) {
  const item = e.target.closest('.rail-item');
  if (!item) return;
  const tip = item.querySelector('.rail-tooltip');
  if (!tip) return;
  const rect = item.getBoundingClientRect();
  tip.style.top = (rect.top + rect.height / 2 - 12) + 'px';
});

// Close drawer on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeDrawer();
});

// ── BOOT ──
// Each page (bureau/index.html, org/index.html) handles its own
// DOMContentLoaded boot so it can set context before calling initAll().