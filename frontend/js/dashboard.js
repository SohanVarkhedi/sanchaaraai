/**
 * Sanchaara AI — Dashboard Controller
 * Data loading, tab routing, station filter
 */

/* ═══ Config ════════════════════════════════════════════════ */
const DATA_URL     = '../data/processed/hotspots.json';
const DOW_ORDER    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const PARTIAL_MON  = new Set(['2023-11','2024-03']);

/* ═══ State ═════════════════════════════════════════════════ */
window.APP = {
  hotspots:        [],
  filtered:        [],
  selectedHotspot: null,
  activeTab:       'map',
  activeFilter:    'all',
  activeLayer:     'impact',
  station:         'all',
};

/* ═══ Bootstrap ═════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  await loadData();
  showLoading(false);
  initTabs();
  initStationFilter();
  initFilterChips();
  initLayerTabs();
  applyFilters();
  updateStats();
  // Render initial tab
  activateTab('map');
  renderSidePanel();

  // Listen for language changes to update stations and filters
  window.addEventListener('languagechanged', () => {
    repopulateStationFilter();
    applyFilters();
    if (APP.selectedHotspot) {
      renderHotspotDetail(APP.selectedHotspot);
    }
  });
});

/* ═══ Data Loading ══════════════════════════════════════════ */
async function loadData() {
  // First attempt: Check if the real dataset was loaded via script tag (e.g. locally without server)
  if (window.HOTSPOTS_DATA && window.HOTSPOTS_DATA.length > 0) {
    console.log('Successfully loaded real dataset from hotspots_data.js');
    APP.hotspots = window.HOTSPOTS_DATA.map(parseRecord);
    APP.filtered = [...APP.hotspots];
    return;
  }

  // Second attempt: Fallback to fetch hotspots.json (e.g. from local server)
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    APP.hotspots = raw.map(parseRecord);
  } catch (err) {
    console.warn('Could not fetch hotspots.json – using demo data.', err);
    APP.hotspots = buildDemoData();
    const banner = document.getElementById('demo-banner');
    if (banner) banner.classList.remove('hidden');
  }
  APP.filtered = [...APP.hotspots];
}

function parseRecord(r) {
  const parse = v => {
    if (typeof v === 'string') {
      try {
        const p1 = JSON.parse(v);
        if (typeof p1 === 'string') {
          return JSON.parse(p1);
        }
        return p1 ?? {};
      } catch (e) {
        return {};
      }
    }
    return v ?? {};
  };

  const parseArr = v => {
    if (typeof v === 'string') {
      try {
        const p1 = JSON.parse(v);
        if (typeof p1 === 'string') {
          return JSON.parse(p1);
        }
        return p1 ?? [];
      } catch (e) {
        return [];
      }
    }
    return v ?? [];
  };

  return {
    ...r,
    score_breakdown:          parse(r.score_breakdown)         || {},
    violation_type_breakdown: parse(r.violation_type_breakdown)|| {},
    shift_breakdown:          parse(r.shift_breakdown)         || {},
    top_junctions:            parseArr(r.top_junctions)        || [],
    day_of_week_distribution: parse(r.day_of_week_distribution)|| {},
    hour_distribution:        parse(r.hour_distribution)       || {},
    monthly_trend:            parse(r.monthly_trend)           || {},
    hull:                     parseArr(r.hull)                 || [],
  };
}

/* ═══ Demo Data (fallback) ══════════════════════════════════ */
function buildDemoData() {
  const stations = ['Whitefield PS','Koramangala PS','Hebbal PS','Yeshwanthpur PS',
                    'Jayanagar PS','BTM Layout PS','Electronic City PS'];
  const junctions = [
    'Silk Board Junction','KR Market','Marathahalli Bridge',
    'Hebbal Flyover','Jayanagar 4th Block','Yelahanka Junction',
    'Nagawara Circle','HSR Layout','Varthur Road','Sarjapur Road',
  ];
  const vehicles = ['TWO WHEELER','CAR','AUTO RICKSHAW','LGV','HGV','VAN'];
  const violations= ['Wrong Parking','Obstruction','No Parking Zone','Double Parking'];

  return Array.from({length:30}, (_, i) => {
    const score  = Math.max(0.01, 1 - i * 0.032 + (Math.random()-0.5)*0.03);
    const count  = Math.floor(6000 - i * 180 + Math.random()*400);
    const rushF  = 0.3 + Math.random()*0.4;
    const sevN   = 0.2 + Math.random()*0.6;
    const cntN   = Math.max(0, score * 2 - rushF * 0.6 - sevN * 0.4);
    return {
      hotspot_id:              i + 1,
      lat:                     12.97 + (Math.random()-0.5)*0.35,
      lon:                     77.59 + (Math.random()-0.5)*0.45,
      lat_spread:              0.003 + Math.random()*0.005,
      lon_spread:              0.003 + Math.random()*0.005,
      impact_score:            +score.toFixed(4),
      violation_count:         count,
      violations_per_hour:     +(count / 90).toFixed(3),
      recommended_officers:    Math.max(1, Math.ceil(count * 0.55 / 6 / 18 / 4)),
      police_station:          stations[i % stations.length],
      junction_name:           junctions[i % junctions.length],
      station_count:           1,
      dominant_vehicle_type:   vehicles[i % vehicles.length],
      dominant_violation_type: violations[i % violations.length],
      peak_shift:              ['morning','afternoon','night'][i % 3],
      peak_day:                DOW_ORDER[i % 7],
      peak_hour:               7 + (i % 12),
      rush_frac:               +rushF.toFixed(4),
      count_norm:              +Math.min(1,cntN).toFixed(4),
      severity_norm:           +sevN.toFixed(4),
      needs_tow:               i % 5 === 0,
      score_breakdown:         { violation_count:count, rush_frac:+rushF.toFixed(4), count_norm:+cntN.toFixed(4), severity_norm:+sevN.toFixed(4) },
      violation_type_breakdown:{
        'Wrong Parking':    { count: Math.floor(count*0.45), pct:0.45 },
        'No Parking Zone':  { count: Math.floor(count*0.3),  pct:0.3  },
        'Double Parking':   { count: Math.floor(count*0.15), pct:0.15 },
        'Obstruction':      { count: Math.floor(count*0.1),  pct:0.1  },
      },
      shift_breakdown: {
        morning:   { violation_count:Math.floor(count*0.55), pct:0.55, rate_per_hour:+(count*0.55/6/18).toFixed(3), recommended_officers:Math.max(1,Math.ceil(count*0.55/6/18/4)) },
        afternoon: { violation_count:Math.floor(count*0.30), pct:0.30, rate_per_hour:+(count*0.30/6/18).toFixed(3), recommended_officers:Math.max(1,Math.ceil(count*0.30/6/18/4)) },
        night:     { violation_count:Math.floor(count*0.15), pct:0.15, rate_per_hour:+(count*0.15/12/18).toFixed(3),recommended_officers:Math.max(1,Math.ceil(count*0.15/12/18/4)) },
      },
      top_junctions: [
        { name: junctions[i % junctions.length], count: Math.floor(count*0.4), pct:0.4 },
        { name: junctions[(i+1)%junctions.length], count: Math.floor(count*0.2), pct:0.2 },
      ],
      day_of_week_distribution: Object.fromEntries(DOW_ORDER.map((d,di)=>
        [d, Math.floor(count/7 * (di<5?1.2:0.6))]
      )),
      hour_distribution: Object.fromEntries(Array.from({length:24},(_,h)=>
        [String(h), Math.floor(count/24 * (h>=7&&h<=11?2.4:h>=12&&h<=17?1.3:0.6))]
      )),
      monthly_trend: {
        '2023-11': Math.floor(count*0.18), '2023-12': Math.floor(count*0.22),
        '2024-01': Math.floor(count*0.20), '2024-02': Math.floor(count*0.19),
        '2024-03': Math.floor(count*0.21),
      },
      hull: [],
    };
  });
}

/* ═══ Filters ═══════════════════════════════════════════════ */
function applyFilters() {
  let data = [...APP.hotspots];

  /* station filter */
  if (APP.station !== 'all') {
    data = data.filter(h => h.police_station === APP.station);
  }

  /* severity filter */
  if (APP.activeFilter === 'critical') {
    data = data.filter(h => h.impact_score >= 0.65);
  } else if (APP.activeFilter === 'high') {
    data = data.filter(h => h.impact_score >= 0.5 && h.impact_score < 0.65);
  } else if (APP.activeFilter === 'watch') {
    data = data.filter(h => h.impact_score < 0.5);
  }

  APP.filtered = data;
  updateStats();

  /* refresh current tab content */
  if (APP.activeTab === 'map')      window.mapRefresh  && window.mapRefresh();
  if (APP.activeTab === 'priority') renderPriorityList();
  if (APP.activeTab === 'insights') window.chartsRefresh && window.chartsRefresh();
  if (APP.activeTab === 'simulator') window.simRefresh && window.simRefresh();
  renderSidePanel();
}

/* ═══ Stats Row ══════════════════════════════════════════════ */
function updateStats() {
  const hs = APP.filtered;
  animateCount('stat-total',     hs.reduce((s,h)=>s+h.violation_count, 0), '');
  animateCount('stat-cells',     hs.length,                                 '');
  animateCount('stat-junctions', Math.round(hs.filter(h=>h.junction_name && h.junction_name!=='Unnamed junction').length / Math.max(hs.length,1) * 100), '%');
  animateCount('stat-critical',  hs.filter(h=>h.impact_score>=0.65).length, '');
}

function animateCount(id, target, suffix) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 900;
  const start = performance.now();
  const from = parseInt(el.dataset.current || '0');
  el.dataset.current = target;
  function step(now) {
    const p = Math.min((now-start)/dur, 1);
    const e = 1 - Math.pow(1-p, 3);
    const v = Math.round(from + (target-from)*e);
    el.textContent = v.toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ═══ Tab System ═════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.topbar-tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
}

function activateTab(tab) {
  APP.activeTab = tab;

  document.querySelectorAll('.topbar-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));

  /* show side panel only on map tab */
  const side = document.querySelector('.dash-side');
  if (side) side.style.display = (tab === 'map') ? '' : 'none';

  /* hide map layer tabs on non-map tabs */
  const layerTabsEl = document.querySelector('.layer-tabs');
  if (layerTabsEl) layerTabsEl.style.display = (tab === 'map') ? '' : 'none';

  /* initialise content */
  if (tab === 'map') {
    window.mapInit && window.mapInit();
    window.mapRefresh && window.mapRefresh();
    if (APP.station !== 'all' && window.mapPanToStation) {
      setTimeout(() => window.mapPanToStation(APP.station), 300);
    }
  } else if (tab === 'priority') {
    renderPriorityList();
  } else if (tab === 'simulator') {
    window.simInit && window.simInit();
    window.simRefresh && window.simRefresh();
    if (window.simMap) {
      setTimeout(() => window.simMap.invalidateSize(), 100);
    }
  } else if (tab === 'insights') {
    window.chartsInit && window.chartsInit();
  }
}

/* ═══ Station Filter ════════════════════════════════════════ */
function repopulateStationFilter() {
  const sel = document.getElementById('station-filter');
  if (!sel) return;

  const currentVal = APP.station;
  sel.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = window.i18n.t('all_stations');
  sel.appendChild(allOpt);

  const stations = [...new Set(APP.hotspots.map(h=>h.police_station))].sort();
  stations.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = window.i18n.t(s);
    sel.appendChild(opt);
  });

  sel.value = currentVal;
}

function initStationFilter() {
  repopulateStationFilter();

  const sel = document.getElementById('station-filter');
  if (!sel) return;

  sel.addEventListener('change', () => {
    APP.station = sel.value;
    applyFilters();
    if (APP.activeTab === 'map' && window.mapPanToStation) {
      window.mapPanToStation(APP.station);
    }
  });
}

/* ═══ Filter Chips ══════════════════════════════════════════ */
function initFilterChips() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      APP.activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });
}

/* ═══ Layer Tabs ════════════════════════════════════════════ */
function initLayerTabs() {
  document.querySelectorAll('.layer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.layer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      APP.activeLayer = tab.dataset.layer;
      window.mapRefresh && window.mapRefresh();
    });
  });
}

/* ═══ Priority List ══════════════════════════════════════════ */
function renderPriorityList() {
  const container = document.getElementById('priority-table-body');
  if (!container) return;
  container.innerHTML = '';

  APP.filtered.forEach((h, i) => {
    const rank     = i + 1;
    const rankCls  = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';
    const scoreCol = scoreColor(h.impact_score);
    const fillW    = Math.round(h.impact_score * 100);
    const junc     = (h.junction_name || 'Unnamed').substring(0, 38);
    const sta      = (h.police_station || 'Unknown').replace(/^BTP\d+ - /, '');
    const staLocal = window.i18n.t(sta);
    const staD     = h.station_count > 1 ? ` (+${h.station_count-1})` : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="rank-num ${rankCls}">${rank}</span></td>
      <td><span style="font-family:var(--font-display);font-size:11px;color:var(--text-muted);">#${h.hotspot_id}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);font-weight:500;" title="${h.junction_name}">${junc}</td>
      <td style="color:var(--text-secondary);font-size:12px;">${staLocal}${staD}</td>
      <td>
        <div class="score-col">
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${fillW}%;background:${scoreCol};"></div></div>
          <span class="score-val" style="color:${scoreCol};">${h.impact_score.toFixed(3)}</span>
        </div>
      </td>
      <td>${h.violation_count.toLocaleString()}</td>
      <td style="font-family:var(--font-display);font-weight:600;color:var(--text-primary);">${h.recommended_officers}</td>
      <td><span class="badge ${shiftBadge(h.peak_shift)}">${window.i18n.t(h.peak_shift)}</span></td>
      <td style="font-size:11px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;">${window.i18n.t(h.dominant_vehicle_type)}</td>
    `;
    tr.addEventListener('click', () => {
      selectHotspot(h);
      activateTab('map');
      setTimeout(() => {
        window.mapFlyTo && window.mapFlyTo(h.lat, h.lon);
      }, 300);
    });
    container.appendChild(tr);
  });

  const countEl = document.getElementById('priority-count');
  if (countEl) {
    if (window.i18n.getLanguage() === 'kn') {
      countEl.textContent = `${APP.filtered.length} ಪ್ರದೇಶಗಳು`;
    } else {
      countEl.textContent = `${APP.filtered.length} zones`;
    }
  }
}

/* ═══ Side Panel ═════════════════════════════════════════════ */
function renderSidePanel() {
  renderHotspotList();
  updateJudgeBrief();
}

function renderHotspotList() {
  const container = document.getElementById('hotspot-list');
  if (!container) return;
  container.innerHTML = '';

  APP.filtered.slice(0, 40).forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'hotspot-card' + (APP.selectedHotspot?.hotspot_id === h.hotspot_id ? ' selected' : '');
    div.innerHTML = hotspotCardHTML(h, i + 1);
    div.addEventListener('click', () => {
      selectHotspot(h);
      window.mapFlyTo && window.mapFlyTo(h.lat, h.lon);
    });
    container.appendChild(div);
  });
}

function hotspotCardHTML(h, rank) {
  const scoreCol = scoreColor(h.impact_score);
  const junc     = (h.junction_name || 'Unnamed').substring(0, 32);
  const sta      = (h.police_station || 'Unknown').replace(/^BTP\d+ - /, '');
  const staLocal = window.i18n.t(sta);
  const peakLocal = window.i18n.t(h.peak_shift);

  return `
    <div class="hc-header">
      <span class="hc-id">${window.i18n.t('side_tab_hotspot').toUpperCase()} #${h.hotspot_id} · ${window.i18n.t('col_rank').toUpperCase()} ${rank}</span>
      <span class="hc-score-pill" style="background:${scoreCol}22;color:${scoreCol};border:1px solid ${scoreCol}55;">
        ${h.impact_score.toFixed(2)}
      </span>
    </div>
    <div class="hc-name">${junc}</div>
    <div class="hc-meta">
      <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${staLocal}</span>
      <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${peakLocal}</span>
    </div>
    <div class="hc-stats">
      <div class="hc-mini-stat">
        <div class="hc-mini-val">${h.violation_count.toLocaleString()}</div>
        <div class="hc-mini-label">${window.i18n.t('col_violations').toLowerCase()}</div>
      </div>
      <div class="hc-mini-stat">
        <div class="hc-mini-val">${h.recommended_officers}</div>
        <div class="hc-mini-label">${window.i18n.t('col_officers_am').toLowerCase()}</div>
      </div>
    </div>
  `;
}

function updateJudgeBrief() {
  const el = document.getElementById('judge-brief-text');
  if (!el || !APP.filtered.length) return;
  const hs       = APP.filtered;
  const top      = hs[0];
  const critCnt  = hs.filter(h=>h.impact_score>=0.65).length;
  const jxnCnt   = hs.filter(h=>h.junction_name && h.junction_name!=='Unnamed junction').length;
  const pctJxn   = Math.round(jxnCnt / hs.length * 100);
  const topStn   = top?.police_station?.replace(/^BTP\d+ - /, '') || '—';
  const topStnLocal = window.i18n.t(topStn);

  el.textContent = window.i18n.t('judge_brief_template', {
    critCnt: critCnt,
    totalCnt: hs.length,
    pctJxn: pctJxn,
    topStn: topStnLocal
  });
}

/* ═══ Hotspot Selection ═════════════════════════════════════ */
function selectHotspot(h) {
  APP.selectedHotspot = h;
  renderHotspotList();
  renderHotspotDetail(h);
  /* scroll selected card into view */
  const el = document.querySelector('.hotspot-card.selected');
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
window.selectHotspot = selectHotspot;

function renderHotspotDetail(h) {
  const el = document.getElementById('hotspot-detail');
  if (!el) return;
  const scoreCol = scoreColor(h.impact_score);
  const vt = h.violation_type_breakdown || {};
  const vtRows = Object.entries(vt).sort((a,b)=>b[1].count-a[1].count).slice(0,5)
    .map(([k,v])=>`<tr>
      <td style="color:var(--text-secondary);font-size:12px;">${window.i18n.t(k)}</td>
      <td style="font-family:var(--font-display);font-weight:600;font-size:13px;">${v.count.toLocaleString()}</td>
      <td style="color:var(--text-muted);font-size:11px;">${(v.pct*100).toFixed(1)}%</td>
    </tr>`).join('');

  const sb = h.shift_breakdown || {};
  const shiftRows = ['morning','afternoon','night'].filter(s=>sb[s])
    .map(s=>`<tr>
      <td style="font-size:12px;text-transform:capitalize;color:var(--text-secondary);">${window.i18n.t(s)}</td>
      <td style="font-family:var(--font-display);font-weight:600;">${sb[s].violation_count.toLocaleString()}</td>
      <td style="color:var(--text-muted);font-size:11px;">${(sb[s].pct*100).toFixed(0)}%</td>
      <td style="color:var(--accent-teal);font-family:var(--font-display);font-weight:700;">${sb[s].recommended_officers}</td>
    </tr>`).join('');

  const towBadge = h.needs_tow ? `<span class="badge badge-coral">${window.i18n.t('detail_tow_required')}</span>` : '';

  el.innerHTML = `
    <div style="padding:14px;border-bottom:1px solid var(--border-subtle);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:11px;color:var(--text-muted);font-weight:600;">#${h.hotspot_id} · ${window.i18n.t(h.police_station?.replace(/^BTP\d+ - /,'') || '–')}</span>
        <span style="font-family:var(--font-display);font-size:18px;font-weight:800;color:${scoreCol};">${h.impact_score.toFixed(3)}</span>
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${h.junction_name||'Unnamed junction'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span class="badge badge-teal">${window.i18n.t(h.peak_shift)}</span>
        <span class="badge badge-amber">${window.i18n.t(h.peak_day)}</span>
        ${towBadge}
      </div>
    </div>

    <div style="padding:14px;border-bottom:1px solid var(--border-subtle);">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">${window.i18n.t('side_detail_shift_title')}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_shift')}</th>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_violations')}</th>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_share')}</th>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_officers')}</th>
        </tr></thead>
        <tbody>${shiftRows}</tbody>
      </table>
    </div>

    <div style="padding:14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">${window.i18n.t('side_detail_vt_title')}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_type')}</th>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_count')}</th>
          <th style="text-align:left;color:var(--text-muted);font-size:10px;padding:4px 0;">${window.i18n.t('detail_share')}</th>
        </tr></thead>
        <tbody>${vtRows}</tbody>
      </table>
    </div>
  `;
}

/* ═══ Helpers ════════════════════════════════════════════════ */
function scoreColor(s) {
  if (s >= 0.65) return '#FF5C72';
  if (s >= 0.50) return '#F5A623';
  if (s >= 0.25) return '#22D47A';
  return '#7B6CF6';
}
window.scoreColor = scoreColor;

function shiftBadge(shift) {
  return shift === 'morning' ? 'badge-amber' : shift === 'afternoon' ? 'badge-teal' : 'badge-purple';
}

function showLoading(visible) {
  const el = document.getElementById('global-loading');
  if (el) el.style.display = visible ? 'flex' : 'none';
}

/* ═══ Side Tab Switching ═════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.side-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.side-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.side-body').forEach(p => p.style.display = 'none');
      const target = document.getElementById(`side-pane-${tab.dataset.pane}`);
      if (target) target.style.display = 'block';
    });
  });
});
