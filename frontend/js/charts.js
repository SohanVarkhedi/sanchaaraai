/**
 * Sanchaara AI — Charts Module (Chart.js)
 */

/* ─── Chart defaults ─────────────────────────────────────── */
const CHART_DEFAULTS = {
  color:       '#A8B4CC',
  borderColor: 'rgba(255,255,255,0.06)',
  font:        { family: "'Inter', sans-serif", size: 11 },
};

const DARK_THEME = {
  scales: {
    x: {
      ticks:  { color: '#505A72', font: { size: 10 } },
      grid:   { color: 'rgba(255,255,255,0.05)', drawBorder: false },
      border: { display: false },
    },
    y: {
      ticks:  { color: '#505A72', font: { size: 10 } },
      grid:   { color: 'rgba(255,255,255,0.05)', drawBorder: false },
      border: { display: false },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(8,16,28,0.95)',
      borderColor:     'rgba(123,108,246,0.2)',
      borderWidth:     1,
      titleColor:      '#EDF2FF',
      bodyColor:       '#A8B4CC',
      padding:         10,
      cornerRadius:    8,
    },
  },
  animation: { duration: 600, easing: 'easeOutQuart' },
  responsive: true,
  maintainAspectRatio: false,
};

/* ─── Chart registry ──────────────────────────────────────── */
const charts = {};
let chartsInited = false;

/* ─── Init ────────────────────────────────────────────────── */
window.chartsInit = function () {
  if (chartsInited) { window.chartsRefresh(); return; }
  chartsInited = true;

  /* apply global defaults */
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color       = CHART_DEFAULTS.color;
    Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;
    Chart.defaults.font        = CHART_DEFAULTS.font;
  }
  window.chartsRefresh();
};

window.chartsRefresh = function () {
  const hs = APP?.filtered ?? [];
  if (!hs.length) return;

  buildHourChart(hs);
  buildDowChart(hs);
  buildVtChart(hs);
  buildVehicleChart(hs);
  buildMonthlyChart(hs);
  buildScoreDistChart(hs);
};

/* ─── Helpers ─────────────────────────────────────────────── */
function getCanvas(id) { return document.getElementById(id)?.getContext('2d'); }

function mkChart(id, config) {
  const ctx = getCanvas(id);
  if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, config);
}

function merge(...objs) {
  return objs.reduce((acc, o) => {
    Object.keys(o).forEach(k => {
      if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) {
        acc[k] = merge(acc[k] || {}, o[k]);
      } else {
        acc[k] = o[k];
      }
    });
    return acc;
  }, {});
}

/* ─── Hour Chart ──────────────────────────────────────────── */
function buildHourChart(hs) {
  const hourTotals = new Array(24).fill(0);
  hs.forEach(h => {
    const hd = h.hour_distribution || {};
    for (let i = 0; i < 24; i++) {
      hourTotals[i] += parseInt(hd[String(i)] || 0);
    }
  });

  const labels = Array.from({length:24}, (_,i) => `${i}:00`);
  const colors = hourTotals.map((_, i) =>
    (i >= 7 && i <= 11) ? 'rgba(245,166,35,0.85)' : 'rgba(123,108,246,0.5)'
  );

  mkChart('chart-hour', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: hourTotals,
        backgroundColor: colors,
        borderColor:     colors.map(c => c.replace('0.5','0.85').replace('0.85','1')),
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: merge(DARK_THEME, {
      plugins: { tooltip: { callbacks: { title: i => `${i[0].label} IST` } } },
    }),
  });
}

/* ─── Day-of-Week Chart ───────────────────────────────────── */
function buildDowChart(hs) {
  const DOW = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const dowTotals = new Array(7).fill(0);
  hs.forEach(h => {
    const dd = h.day_of_week_distribution || {};
    DOW.forEach((d, i) => { dowTotals[i] += parseInt(dd[d] || 0); });
  });

  const maxV = Math.max(...dowTotals, 1);
  const colors = dowTotals.map(v => v === maxV ? 'rgba(255,92,114,0.9)' : 'rgba(123,108,246,0.5)');
  const shortDays = window.i18n.getLanguage() === 'kn' ? ['ಸೋಮ', 'ಮಂಗಳ', 'ಬುಧ', 'ಗುರು', 'ಶುಕ್ರ', 'ಶನಿ', 'ಭಾನು'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  mkChart('chart-dow', {
    type: 'bar',
    data: {
      labels: shortDays,
      datasets: [{
        data:            dowTotals,
        backgroundColor: colors,
        borderRadius:    3,
      }],
    },
    options: merge(DARK_THEME, {}),
  });
}

/* ─── Violation Type Chart ────────────────────────────────── */
function buildVtChart(hs) {
  const totals = {};
  hs.forEach(h => {
    const vt = h.violation_type_breakdown || {};
    Object.entries(vt).forEach(([k, v]) => {
      totals[k] = (totals[k] || 0) + v.count;
    });
  });

  const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const labels = sorted.map(([k]) => {
    const trans = window.i18n.t(k);
    return trans.length > 22 ? trans.slice(0,22)+'…' : trans;
  });
  const data   = sorted.map(([,v]) => v);
  const maxD   = Math.max(...data, 1);

  const palette = ['#7B6CF6','#C084FC','#F5A623','#FF5C72','#22D47A','#22D4F5','#F5A623','#FF5C72'];

  mkChart('chart-vt', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((v,i) => palette[i % palette.length] + (Math.round(v/maxD*155+100)).toString(16)),
        borderRadius:    3,
        indexAxis:       'y',
      }],
    },
    options: merge(DARK_THEME, { indexAxis: 'y' }),
  });
}

/* ─── Vehicle Type Chart (Donut) ──────────────────────────── */
function buildVehicleChart(hs) {
  const totals = {};
  hs.forEach(h => {
    const vt = h.dominant_vehicle_type;
    if (vt) totals[vt] = (totals[vt] || 0) + h.violation_count;
  });

  const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const colors = ['#7B6CF6','#F5A623','#FF5C72','#C084FC','#22D47A','#22D4F5'];

  mkChart('chart-vehicle', {
    type: 'doughnut',
    data: {
      labels: sorted.map(([k]) => window.i18n.t(k)),
      datasets: [{
        data:            sorted.map(([,v]) => v),
        backgroundColor: colors,
        borderColor:     'rgba(2,4,8,0.8)',
        borderWidth:     2,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           DARK_THEME.animation,
      cutout:              '68%',
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels:   { color: '#A8B4CC', font: { size: 10 }, boxWidth: 10, padding: 10 },
        },
        tooltip: DARK_THEME.plugins.tooltip,
      },
    },
  });
}

/* ─── Monthly Trend Chart ─────────────────────────────────── */
function buildMonthlyChart(hs) {
  const allMonths = {};
  hs.forEach(h => {
    const mt = h.monthly_trend || {};
    Object.entries(mt).forEach(([m, v]) => { allMonths[m] = (allMonths[m] || 0) + v; });
  });

  const sorted  = Object.entries(allMonths).sort((a,b)=>a[0]<b[0]?-1:1);
  const PARTIAL  = new Set(['2023-11','2024-03']);
  const labels   = sorted.map(([m]) => m);
  const data     = sorted.map(([,v]) => v);
  const colors   = sorted.map(([m]) => PARTIAL.has(m) ? 'rgba(255,255,255,0.25)' : 'rgba(123,108,246,0.9)');

  mkChart('chart-monthly', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor:            '#7B6CF6',
        backgroundColor:        'rgba(123,108,246,0.08)',
        pointBackgroundColor:   colors,
        pointBorderColor:       colors,
        pointRadius:            5,
        pointHoverRadius:       7,
        fill:                   true,
        tension:                0.35,
        borderWidth:            2,
      }],
    },
    options: merge(DARK_THEME, {
      plugins: { tooltip: { callbacks: {
        afterLabel: ctx => PARTIAL.has(labels[ctx.dataIndex]) ? ('* ' + window.i18n.t('detail_partial_month_legend')) : '',
      }}},
    }),
  });
}

/* ─── Score Distribution ──────────────────────────────────── */
function buildScoreDistChart(hs) {
  const bins     = new Array(10).fill(0);
  hs.forEach(h => { bins[Math.min(Math.floor(h.impact_score * 10), 9)]++; });
  const binLabels = bins.map((_,i) => `${(i/10).toFixed(1)}–${((i+1)/10).toFixed(1)}`);
  const colors    = bins.map((_,i) => {
    if (i >= 7) return 'rgba(255,92,114,0.85)';
    if (i >= 4) return 'rgba(245,166,35,0.85)';
    return 'rgba(123,108,246,0.6)';
  });

  mkChart('chart-score-dist', {
    type: 'bar',
    data: {
      labels: binLabels,
      datasets: [{ data: bins, backgroundColor: colors, borderRadius: 3 }],
    },
    options: merge(DARK_THEME, {
      plugins: { tooltip: { callbacks: { title: i => `Score ${i[0].label}` }}},
      scales: { y: { ...DARK_THEME.scales.y, title: { display: true, text: window.i18n.t('chart_y_hotspots'), color:'#505A72', font:{size:10} } }},
    }),
  });
}

// Redraw charts on language switch
window.addEventListener('languagechanged', () => {
  if (chartsInited) {
    window.chartsRefresh();
  }
});
