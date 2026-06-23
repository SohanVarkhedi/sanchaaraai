/**
 * Sanchaara AI — Simulator Module
 */

const OFFICER_THROUGHPUT = 4; // violations per officer per hour

let simInited = false;
let simMapLayer = null;
window.simMap = null;

window.simInit = function () {
  if (simInited) return;
  simInited = true;

  /* Initialize simulator Coverage Map */
  if (!window.simMap && document.getElementById('sim-map')) {
    const BLR_BOUNDS = [[12.70, 77.28], [13.25, 77.95]];
    window.simMap = L.map('sim-map', {
      zoomControl: true,
      attributionControl: false,
      minZoom: 11,
      maxZoom: 16,
      maxBounds: BLR_BOUNDS
    }).setView([12.9716, 77.5946], 11.2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(window.simMap);

    simMapLayer = L.layerGroup().addTo(window.simMap);
  }

  const officerSlider  = document.getElementById('sim-officers');
  const truckSlider    = document.getElementById('sim-trucks');
  const officerVal     = document.getElementById('sim-officers-val');
  const truckVal       = document.getElementById('sim-trucks-val');
  const shiftSel       = document.getElementById('sim-shift');
  const runBtn         = document.getElementById('sim-run');

  if (officerSlider) {
    officerSlider.addEventListener('input', () => {
      if (officerVal) officerVal.textContent = officerSlider.value;
    });
  }
  if (truckSlider) {
    truckSlider.addEventListener('input', () => {
      if (truckVal) truckVal.textContent = truckSlider.value;
    });
  }
  if (runBtn)    runBtn.addEventListener('click',    runSimulation);

  runSimulation();
};

function runSimulation() {
  const officers = parseInt(document.getElementById('sim-officers')?.value ?? 30);
  const trucks   = parseInt(document.getElementById('sim-trucks')?.value   ?? 5);
  const shift    = document.getElementById('sim-shift')?.value ?? 'morning';

  const hs       = APP?.filtered ?? [];
  if (!hs.length) return;

  /* greedy allocation top → down */
  let remOfficers = officers;
  let remTrucks   = trucks;
  const results   = [];

  for (let i = 0; i < hs.length; i++) {
    const h       = hs[i];
    const sb      = h.shift_breakdown?.[shift];
    const needed  = sb?.recommended_officers ?? h.recommended_officers ?? 1;

    let assigned, status;
    if (remOfficers >= needed) {
      assigned = needed; remOfficers -= needed; status = 'Covered';
    } else if (remOfficers > 0) {
      assigned = remOfficers; remOfficers = 0; status = 'Partial';
    } else {
      assigned = 0; status = 'Uncovered';
    }

    const needsTow = Boolean(h.needs_tow);
    let truck = needsTow && remTrucks > 0 && status !== 'Uncovered';
    if (truck) remTrucks--;

    results.push({
      rank:        i + 1,
      hotspot_id:  h.hotspot_id,
      impact:      h.impact_score,
      violations:  h.violation_count,
      junction:    h.junction_name || 'Unnamed',
      needed,
      assigned,
      truck,
      status,
    });
  }

  /* update coverage summary */
  const covered   = results.filter(r=>r.status==='Covered');
  const partial   = results.filter(r=>r.status==='Partial');
  const uncovered = results.filter(r=>r.status==='Uncovered');
  const deployed  = results.reduce((s,r)=>s+r.assigned, 0);

  setEl('sim-covered',   covered.length);
  setEl('sim-partial',   partial.length);
  setEl('sim-uncovered', uncovered.length);
  setEl('sim-deployed',  deployed);
  setEl('sim-unused',    Math.max(0, officers - deployed));
  setEl('sim-trucks-used', trucks - remTrucks);

  /* render tables */
  renderSimTable('sim-covered-table',   covered,   'covered');
  renderSimTable('sim-partial-table',   partial,   'partial');
  renderSimTable('sim-uncovered-table', uncovered, 'uncovered');

  /* coverage bar */
  const coverPct = results.length ? Math.round(covered.length / results.length * 100) : 0;
  const barEl    = document.getElementById('sim-coverage-bar');
  if (barEl) barEl.style.width = coverPct + '%';
  const barLabel = document.getElementById('sim-coverage-pct');
  if (barLabel) barLabel.textContent = coverPct + '%';

  /* Update Coverage Map circles */
  if (simMapLayer) {
    simMapLayer.clearLayers();
    
    results.forEach(r => {
      const h = hs.find(x => x.hotspot_id === r.hotspot_id);
      if (!h) return;

      const color = r.status === 'Covered' ? '#22D47A' : r.status === 'Partial' ? '#F5A623' : '#FF5C72';
      
      const circle = L.circleMarker([h.lat, h.lon], {
        radius: Math.max(6, Math.sqrt(r.violations) * 0.12),
        color: color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.6,
        opacity: 0.9
      });

      const statusKey = 'sim_legend_' + r.status.toLowerCase();
      circle.bindTooltip(`
        <div style="font-family:var(--font-display);font-size:12px;font-weight:600;">#${h.hotspot_id} ${h.junction_name || 'Unnamed'}</div>
        <div style="font-size:11px;color:${color};text-transform:uppercase;font-weight:600;margin-top:2px;">${window.i18n.t(statusKey)}</div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;">${window.i18n.t('sim_tooltip_assigned', { assigned: r.assigned, needed: r.needed })}</div>
      `, { className: 'pp-tooltip', sticky: true, direction: 'top' });

      circle.addTo(simMapLayer);
    });

    if (simMapLayer.getLayers().length > 0 && window.simMap) {
      const bounds = L.featureGroup(simMapLayer.getLayers()).getBounds();
      window.simMap.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }
  }

  /* Visual pulse feedback */
  const resultsContainer = document.querySelector('.sim-results');
  if (resultsContainer) {
    resultsContainer.classList.remove('sim-pulse');
    void resultsContainer.offsetWidth; // Force reflow to restart animation
    resultsContainer.classList.add('sim-pulse');
  }
}

function renderSimTable(containerId, rows, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!rows.length) { el.closest('.sim-table-section')?.classList?.add('hidden'); return; }
  el.closest('.sim-table-section')?.classList?.remove('hidden');

  const color = type==='covered'?'#22D47A':type==='partial'?'#F5A623':'#FF5C72';

  el.innerHTML = `
    <table class="sim-table">
      <thead><tr>
        <th>${window.i18n.t('sim_tbl_col_rank')}</th>
        <th>${window.i18n.t('sim_tbl_col_junction')}</th>
        <th>${window.i18n.t('sim_tbl_col_score')}</th>
        <th>${window.i18n.t('sim_tbl_col_violations')}</th>
        <th>${window.i18n.t('sim_tbl_col_needed')}</th>
        <th>${window.i18n.t('sim_tbl_col_assigned')}</th>
        <th>${window.i18n.t('sim_tbl_col_tow')}</th>
      </tr></thead>
      <tbody>
        ${rows.slice(0,50).map(r=>`
          <tr>
            <td style="font-family:var(--font-display);font-weight:700;color:var(--text-muted);">${r.rank}</td>
            <td style="color:var(--text-primary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.junction.substring(0,30)}</td>
            <td style="color:${window.scoreColor?.(r.impact)||color};font-weight:600;font-family:var(--font-display);">${r.impact.toFixed(3)}</td>
            <td style="font-family:var(--font-display);">${r.violations.toLocaleString()}</td>
            <td>${r.needed}</td>
            <td style="font-family:var(--font-display);font-weight:700;color:${color};">${r.assigned}</td>
            <td>${r.truck ? `<span style="color:#F5A623;display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>${window.i18n.t('sim_tow_active')}</span>` : '–'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${rows.length > 50 ? `<div style="padding:8px 12px;font-size:11px;color:var(--text-muted);">${window.i18n.t('sim_more_zones', { count: rows.length - 50 })}</div>` : ''}
  `;
}

// Re-run simulation when language changed
window.addEventListener('languagechanged', () => {
  if (simInited) {
    runSimulation();
  }
});

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof val === 'number' ? val.toLocaleString() : val;
}

window.simRefresh = runSimulation;
