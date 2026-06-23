/**
 * Sanchaara AI — Leaflet Map Module
 */

/* ─── Constants ────────────────────────────────────────────── */
const BLR_CENTER = [12.9716, 77.5946];
const BLR_BOUNDS = [[12.70, 77.28], [13.25, 77.95]];
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '&copy; <a href="https://carto.com/">CARTO</a>';

let leafletMap    = null;
let markerLayer   = null;
let heatLayer     = null;
let mapInited     = false;
let pendingRefresh = false;
let introPlayed   = false;

/* ─── Init ─────────────────────────────────────────────────── */
window.mapInit = function () {
  if (mapInited) return;
  mapInited = true;

  leafletMap = L.map('leaflet-map', {
    center:    [14.6, 75.8], // Start wide on Karnataka
    zoom:      7.2,
    zoomControl: false,
    minZoom:   7,
    maxZoom:   17,
  });

  // Temporarily lock interactions during the intro flight to prevent manual zoom-outs
  if (!introPlayed) {
    leafletMap.dragging.disable();
    leafletMap.touchZoom.disable();
    leafletMap.doubleClickZoom.disable();
    leafletMap.scrollWheelZoom.disable();
    leafletMap.boxZoom.disable();
    leafletMap.keyboard.disable();
    if (leafletMap.tap) leafletMap.tap.disable();
  }

  L.tileLayer(TILE_DARK, {
    attribution: TILE_ATTR,
    subdomains:  'abcd',
    maxZoom:     19,
  }).addTo(leafletMap);

  /* custom zoom control bottom-right */
  L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

  markerLayer = L.layerGroup().addTo(leafletMap);
  heatLayer   = L.layerGroup().addTo(leafletMap);

  if (pendingRefresh) { pendingRefresh = false; window.mapRefresh(); }
};

/* ─── Refresh Markers ───────────────────────────────────────── */
window.mapRefresh = function () {
  if (!mapInited) { pendingRefresh = true; return; }
  if (!APP?.filtered) return;

  markerLayer.clearLayers();
  heatLayer.clearLayers();

  const layer   = APP.activeLayer || 'impact';
  const hotspots = APP.filtered;

  /* heatmap layer using Leaflet.heat */
  if (layer === 'heatmap') {
    const maxVal = Math.max(...hotspots.map(h => h.violation_count), 1);
    const heatPoints = hotspots.map(h => [
      h.lat,
      h.lon,
      h.violation_count / maxVal
    ]);
    
    const heat = L.heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 15,
      gradient: {
        0.2: '#7B6CF6', // violet
        0.4: '#22D47A', // green
        0.7: '#F5A623', // amber
        1.0: '#FF5C72'  // coral
      }
    });
    heat.addTo(heatLayer);
  }

  /* marker circles */
  hotspots.forEach((h, i) => {
    const rank    = i + 1;
    const isTop20 = rank <= 20;
    const col     = layerColor(h, layer);
    const r       = markerRadius(h.lat_spread, h.lon_spread, isTop20);

    const circle = L.circleMarker([h.lat, h.lon], {
      radius:      r,
      color:       col,
      weight:      isTop20 ? 1.8 : 1,
      fillColor:   col,
      fillOpacity: isTop20 ? 0.78 : 0.48,
      opacity:     0.9,
    });

    /* Tooltip */
    circle.bindTooltip(
      `<div style="font-family:var(--font-display);font-size:12px;font-weight:600;">#${h.hotspot_id} ${h.junction_name||'Unnamed'}</div>
       <div style="font-size:11px;color:#aaa;">${h.impact_score.toFixed(3)} · ${h.violation_count.toLocaleString()} ${window.i18n.t('map_violations_word')}</div>`,
      { className: 'pp-tooltip', sticky: true, direction: 'top' }
    );

    /* Popup */
    circle.bindPopup(buildPopup(h, rank), { maxWidth: 280, className: 'pp-popup' });

    /* Select on click */
    circle.on('click', () => {
      if (window.selectHotspot) window.selectHotspot(h);
    });

    circle.addTo(markerLayer);
  });

  /* one-shot intro: fly from Karnataka down to Bengaluru city level */
  if (!introPlayed && hotspots.length > 0) {
    introPlayed = true;
    setTimeout(() => {
      // Fly to Bengaluru, landing exactly at city-wide zoom 11.2
      leafletMap.flyTo(BLR_CENTER, 11.2, { duration: 3.5, easeLinearity: 0.15 });
      
      // Once flight finishes, lock bounds and minZoom to preserve context
      leafletMap.once('moveend', () => {
        leafletMap.setMaxBounds(BLR_BOUNDS);
        leafletMap.setMinZoom(11); // Strict lock to prevent zooming out past city bounds
        
        // Re-enable interactions once flight has landed
        leafletMap.dragging.enable();
        leafletMap.touchZoom.enable();
        leafletMap.doubleClickZoom.enable();
        leafletMap.scrollWheelZoom.enable();
        leafletMap.boxZoom.enable();
        leafletMap.keyboard.enable();
        if (leafletMap.tap) leafletMap.tap.enable();
      });
    }, 600);
  }
};

/* ─── Fly To ───────────────────────────────────────────────── */
window.mapFlyTo = function (lat, lon) {
  if (!leafletMap) return;
  // Use zoom 13 instead of 15 so context of surrounding hotspots is preserved
  leafletMap.flyTo([lat, lon], 13, { duration: 1.2 });
};

/* ─── Fly To Station ───────────────────────────────────────── */
window.mapPanToStation = function (stationName) {
  if (!leafletMap || !APP?.hotspots) return;

  if (stationName === 'all') {
    leafletMap.flyTo(BLR_CENTER, 12, { duration: 1.5 });
    return;
  }

  const stationHotspots = APP.hotspots.filter(h => h.police_station === stationName);
  if (stationHotspots.length === 0) return;

  const coords = stationHotspots.map(h => [h.lat, h.lon]);
  const bounds = L.latLngBounds(coords);

  // Set maxZoom to 12.5 so that it remains zoomed out enough to keep multiple hotspots in view
  leafletMap.flyToBounds(bounds, {
    padding: [80, 80],
    maxZoom: 12.5,
    duration: 1.8,
    easeLinearity: 0.15
  });

  const heatmapTab = document.querySelector('.layer-tab[data-layer="heatmap"]');
  if (heatmapTab) {
    document.querySelectorAll('.layer-tab').forEach(t => t.classList.remove('active'));
    heatmapTab.classList.add('active');
    APP.activeLayer = 'heatmap';
    window.mapRefresh();
  }
};

/* ─── Helpers ──────────────────────────────────────────────── */
function layerColor(h, layer) {
  if (layer === 'impact' || layer === 'heatmap') {
    return window.scoreColor ? window.scoreColor(h.impact_score) : '#7B6CF6';
  }
  if (layer === 'volume') {
    const maxV = Math.max(...APP.filtered.map(x=>x.violation_count), 1);
    const t    = h.violation_count / maxV;
    return lerpColor('#005599', '#7B6CF6', t);
  }
  if (layer === 'junction') {
    return h.junction_name && h.junction_name !== 'Unnamed junction' ? '#8B5CF6' : '#505A72';
  }
  return '#7B6CF6';
}

function markerRadius(latSpread, lonSpread, isTop) {
  const spread  = Math.max(latSpread || 0.003, lonSpread || 0.003);
  const meters  = spread * 111000;
  const px      = meters / (156543.03 * Math.pow(2, -12));
  const base    = Math.max(5, Math.min(px, 44));
  return isTop ? base : Math.max(4, base * 0.62);
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah>>16)&0xff, ag=(ah>>8)&0xff, ab=ah&0xff;
  const br = (bh>>16)&0xff, bg=(bh>>8)&0xff, bb=bh&0xff;
  const rr = Math.round(ar+(br-ar)*t);
  const rg = Math.round(ag+(bg-ag)*t);
  const rb = Math.round(ab+(bb-ab)*t);
  return `#${rr.toString(16).padStart(2,'0')}${rg.toString(16).padStart(2,'0')}${rb.toString(16).padStart(2,'0')}`;
}

function buildPopup(h, rank) {
  const col = window.scoreColor ? window.scoreColor(h.impact_score) : '#7B6CF6';
  const sb  = h.shift_breakdown?.morning;
  const staLocal = window.i18n.t((h.police_station || '').replace(/^BTP\d+ - /, '') || 'Unknown PS');
  return `
    <div style="font-family:var(--font-display);padding:4px 0;">
      <div style="font-size:10px;color:#666;margin-bottom:6px;letter-spacing:0.05em;">${window.i18n.t('side_tab_hotspot').toUpperCase()} #${h.hotspot_id} · ${window.i18n.t('col_rank').toUpperCase()} ${rank}</div>
      <div style="font-size:15px;font-weight:700;color:#EDF2FF;margin-bottom:4px;">${h.junction_name||'Unnamed junction'}</div>
      <div style="font-size:11px;color:#A8B4CC;margin-bottom:10px;">${staLocal}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
        <div style="padding:7px 10px;background:rgba(123,108,246,0.08);border:1px solid rgba(123,108,246,0.22);border-radius:7px;">
          <div style="font-size:16px;font-weight:800;color:${col};">${h.impact_score.toFixed(3)}</div>
          <div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.06em;">${window.i18n.t('map_popup_impact')}</div>
        </div>
        <div style="padding:7px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:7px;">
          <div style="font-size:16px;font-weight:800;color:#EDF2FF;">${h.violation_count.toLocaleString()}</div>
          <div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.06em;">${window.i18n.t('map_popup_violations')}</div>
        </div>
      </div>
      <div style="font-size:11px;color:#A8B4CC;">
        ${window.i18n.t('map_popup_peak')}: <strong style="color:#EDF2FF;">${window.i18n.t(h.peak_shift)} · ${window.i18n.t(h.peak_day)} · ${h.peak_hour}:00</strong><br>
        ${window.i18n.t('map_popup_officers')}: <strong style="color:#7B6CF6;">${sb?.recommended_officers ?? h.recommended_officers} (${window.i18n.t('morning')})</strong>
        ${h.needs_tow ? `<br><span style="color:#FF5C72;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${window.i18n.t('map_popup_tow_req')}</span>` : ''}
      </div>
    </div>
  `;
}

// Re-render markers when language changed
window.addEventListener('languagechanged', () => {
  if (mapInited && window.mapRefresh) {
    window.mapRefresh();
  }
});
