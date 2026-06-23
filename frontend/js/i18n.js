/**
 * Sanchaara AI — Internationalization Module
 * Client-side translation support (English / Kannada)
 */
'use strict';

window.i18n = (() => {
  const STORAGE_KEY = 'sanchaara_lang';

  // Kannada translations for stations, vehicle types, violation types, days of the week, shifts, etc.
  const dictionaries = {
    en: {
      // Rebrand & Titles
      app_title: "Sanchaara AI",
      app_logo: "Sanchaara <span>AI</span>",
      app_logo_short: "SC<span>AI</span>",
      app_subtitle: "Decision Support System for Parking-Induced Traffic Congestion -- Bangalore",
      tmc_status: "TMC ONLINE",
      console_login: "Console Login →",
      open_dashboard: "Open Dashboard",
      back_to_home: "← Home",
      hero_tag: "BENGALURU TRAFFIC POLICE · TMC SYSTEM",
      hero_desc: "AI-Powered Parking Enforcement & Congestion Analytics. Spatial density clustering identifies 120 key hotspots, optimizing BTP enforcement routing across 46 police jurisdictions.",

      // Ticker
      ticker_1: "115,400 VALIDATED VIOLATIONS",
      ticker_2: "120 RISK-RANKED HOTSPOTS",
      ticker_3: "46 POLICE STATIONS",
      ticker_4: "DBSCAN SPATIAL CLUSTERING",
      ticker_5: "BENGALURU TRAFFIC POLICE",
      ticker_6: "AI ENFORCEMENT INTELLIGENCE",

      // Navigation
      nav_map: "Map",
      nav_priority_list: "Priority List",
      nav_simulator: "Simulator",
      nav_insights: "Insights",
      nav_temporal: "Temporal Patterns",

      // Live CCTV
      cctv_title: "LIVE TRAFFIC CCTV FEEDS",
      cctv_subtitle: "Real-time mock cctv telemetry captured across Bangalore traffic corridors",
      cam_mg_road: "CAM 01 // MG ROAD",
      cam_silk_board: "CAM 02 // SILK BOARD",
      cam_marathahalli: "CAM 03 // MARATHAHALLI",
      cam_indiranagar: "CAM 04 // INDIRANAGAR",
      cam_koramangala: "CAM 05 // KORAMANGALA",
      cam_hebbal: "CAM 06 // HEBBAL FLYOVER",
      cctv_secure: "SECURE",
      cctv_overcrowd: "OVERCROWD",
      cctv_congested: "CONGESTED",
      cctv_violation: "VIOLATION DETECTED",

      // DBSCAN Section
      dbscan_title: "DBSCAN SPATIAL CLUSTERING",
      dbscan_desc: "Violations are grouped automatically using Density-Based Spatial Clustering. The system filters out random noise (scattered parking tickets) and collapses coordinates into dense hotspot nodes.",
      dbscan_eps: "Epsilon (eps)",
      dbscan_min_samples: "Min Samples",
      dbscan_scroll_note: "Scroll Down to watch scattered raw violations collapse dynamically into tight, localized BTP enforcement hotspots.",

      // Feature Section
      features_title: "TMC ENGINE ABSTRACTIONS",
      features_subtitle: "Tactical modules running within the Sanchaara AI Console",
      feat_priority_title: "Prioritization",
      feat_priority_desc: "Hotspots are prioritized dynamically using the formula: 0.5 * Count + 0.3 * RushHour + 0.2 * Severity",
      feat_alloc_title: "Resource Allocator",
      feat_alloc_desc: "Greedily deploys available officers to the highest-priority zones. Automatically dispatches tow trucks where heavy vehicles exceed 20% of infractions.",
      feat_insights_title: "City Insights",
      feat_insights_desc: "Visualizes peak enforcement hours, day-of-week distributions, and breakdown of violation types (Wrong Parking, Double Parking, Obstruction).",

      // Footer
      footer_note: "Bengaluru Traffic Police Command console · Flipkart Gridlock Hackathon",
      ticker_meta: "115,400 violations · Nov 2023 – Mar 2024",

      // Method Pane
      method_dataset_title: "Dataset",
      method_dataset_desc: "298,450 raw records filtered to 115,400 approved. Period: Nov 2023 – Mar 2024. Columns: lat/lon, timestamp, violation type, vehicle type, police station.",
      method_clustering_title: "Clustering",
      method_clustering_desc: "DBSCAN eps=0.003, min_samples=50. Downtown giant cluster sub-clustered at eps=0.0015 into 20 zones. Final: 120 hotspots, 4.9% noise discarded.",
      method_impact_title: "Impact Score",
      method_impact_desc: "Severity weights: HGV=1.0, Scooter=0.2 (assumptions). Rush-hour = IST 07–12.",
      method_shift_title: "Shift Deployment",
      method_shift_desc: "Officer needs per shift (morning 06–12, afternoon 12–18, night 18–06) using real violation counts ÷ shift hours over dataset span. Throughput: 4 vph (assumption).",
      method_tow_title: "Tow Truck",
      method_tow_desc: "Assigned only where heavy vehicles (HGV/Bus/Lorry/Tanker) exceed 20% of violations in a hotspot.",

      // Controls Bar
      filter_station_lbl: "Filter by police station",
      all_stations: "All police stations",
      severity_all: "All",
      severity_critical: "Critical",
      severity_high: "High",
      severity_watch: "Watch",
      layer_impact: "Impact",
      layer_volume: "Volume",
      layer_junction: "Junction",
      layer_heatmap: "Heatmap",

      // Map View
      map_layer_impact_title: "Impact Layer",
      map_layer_impact_desc: "Overall congestion-priority score. Red = critical (≥0.65), amber = high (0.50–0.64), teal = medium/watch. Circle size reflects cluster spread.",
      map_layer_volume_title: "Volume Layer",
      map_layer_volume_desc: "Raw violation count mapped to color intensity. Shows absolute enforcement demand regardless of rush-hour factor.",
      map_layer_junction_title: "Junction Layer",
      map_layer_junction_desc: "Purple = junction-linked hotspot. Grey = no named junction. Useful for identifying intersection-clearing priorities.",
      map_layer_heatmap_title: "Heatmap Layer",
      map_layer_heatmap_desc: "Radius-weighted density overlay. Shows spatial concentration of violations across Bangalore.",
      map_legend_crit: "Critical (≥0.65)",
      map_legend_high: "High (0.50–0.64)",
      map_legend_watch: "Medium / Watch",

      // Priority List Tab
      priority_title: "Parking Congestion Priority Zones",
      priority_subtitle: "Zones ranked by impact score · {count} zones",
      priority_formula_note: "Formula: 0.5 × count_norm + 0.3 × rush_frac + 0.2 × sev_norm",
      priority_throughput_note: "Throughput: 4 vph per officer (assumption)",
      col_rank: "Rank",
      col_id: "ID",
      col_junction: "Junction",
      col_station: "Police Station",
      col_impact: "Impact Score",
      col_violations: "Violations",
      col_officers_am: "Officers (AM)",
      col_peak_shift: "Peak Shift",
      col_top_vehicle: "Top Vehicle",
      priority_footnote_desc: "Count Norm: log-normalized violation volume. Rush-Hr Frac: share during IST 7-11 or 17-20. Sev Norm: avg vehicle weight normalized (HGV=1.0, Scooter=0.2). Officers (AM): morning shift officers. Throughput of 4 vph is an assumption.",

      // Simulator Tab
      sim_resources: "Resources",
      sim_officers_label: "Officers available",
      sim_trucks_label: "Tow trucks available",
      sim_shift_label: "Deployment shift",
      sim_shift_morning_val: "Morning (06:00–12:00)",
      sim_shift_afternoon_val: "Afternoon (12:00–18:00)",
      sim_shift_night_val: "Night (18:00–06:00)",
      sim_resources_note: "Officers allocated greedily from rank 1 downward. Tow trucks assigned only where heavy vehicles (HGV/Bus/Tanker/Lorry) exceed 20% of violations.",
      sim_run_btn: "▶ Run Simulation",
      sim_summary_label: "Deployment Summary",
      sim_deployed_officers: "Officers deployed",
      sim_unused_officers: "Unused officers",
      sim_tow_used: "Tow trucks used",
      sim_covered_label: "Covered",
      sim_partial_label: "Partial",
      sim_uncovered_label: "Uncovered",
      sim_coverage_rate_lbl: "Coverage Rate",
      sim_coverage_map_title: "Coverage Map",
      sim_tbl_covered: "Covered Zones",
      sim_tbl_partial: "Partial Coverage",
      sim_tbl_uncovered: "Uncovered Zones",
      sim_tbl_col_rank: "RANK",
      sim_tbl_col_junction: "JUNCTION",
      sim_tbl_col_score: "SCORE",
      sim_tbl_col_violations: "VIOLATIONS",
      sim_tbl_col_needed: "NEEDED",
      sim_tbl_col_assigned: "ASSIGNED",
      sim_tbl_col_tow: "TOW",
      sim_tow_active: "Tow",
      sim_more_zones: "+ {count} more zones",
      sim_tooltip_assigned: "Assigned: {assigned} / {needed} officers",

      // Insights Tab
      insights_total_violations: "Violations Analyzed",
      insights_total_violations_sub: "violations in hotspots",
      insights_hotspots: "Scored Urban Cells",
      insights_hotspots_sub: "DBSCAN hotspots",
      insights_junction_linked: "Junction-Linked Cases",
      insights_junction_linked_sub: "of filtered hotspots",
      insights_critical_hs: "Critical Hotspots",
      insights_critical_hs_sub: "score ≥ 0.65",
      chart_title_hour: "Violations by Hour (IST)",
      chart_desc_hour: "Amber = rush-hour (07–11 IST). Evening data sparse — enforcement is morning-concentrated.",
      chart_title_dow: "Violations by Day of Week",
      chart_title_vt: "Top Violation Types",
      chart_title_vehicle: "Vehicle Type Breakdown",
      chart_title_monthly: "Monthly Violation Trend",
      chart_desc_monthly: "Nov 2023 and Mar 2024 are partial months (dimmed). Feb–Mar 2024 sparse data is a reporting gap, not a real decline.",
      detail_partial_month_legend: "Partial month",
      chart_title_score_dist: "Impact Score Distribution",
      chart_y_hotspots: "Hotspots",

      // Side Panel
      side_tab_overview: "Overview",
      side_tab_hotspot: "Hotspot",
      side_tab_method: "Method",
      side_overview_title: "Overview",
      side_judge_brief_title: "Judge Brief",
      side_judge_loading: "Loading intelligence summary…",
      side_top_hotspots_title: "Top Hotspots",
      side_loading_hs: "Loading hotspots…",
      side_empty_detail: "Click a hotspot on the map or in the list to see details",
      side_detail_shift_title: "Shift Deployment",
      side_detail_vt_title: "Violation Breakdown",

      // Judge Brief Template
      judge_brief_template: "Sanchaara AI found {critCnt} critical zones (score ≥0.65) across {totalCnt} hotspots. {pctJxn}% are linked to named junction zones. {topStn} is the highest-priority station. Morning shift (07:00–12:00 IST) is the dominant enforcement window — prioritise obstruction removal over ticket counting.",

      // Details Pane Labels
      detail_shift: "SHIFT",
      detail_violations: "VIOLATIONS",
      detail_share: "SHARE",
      detail_officers: "OFFICERS",
      detail_type: "TYPE",
      detail_count: "COUNT",
      detail_tow_required: "Tow Required",

      // Map dynamic labels
      map_violations_word: "violations",
      map_popup_junction: "Junction",
      map_popup_station: "Station",
      map_popup_impact: "Impact Score",
      map_popup_violations: "Violations",
      map_popup_peak: "Peak",
      map_popup_officers: "Officers needed",
      map_popup_tow_req: "Tow truck required",

      // Categories
      "SCOOTER": "SCOOTER",
      "CAR": "CAR",
      "PASSENGER AUTO": "PASSENGER AUTO",
      "MAXI-CAB": "MAXI-CAB",
      "MOTOR CYCLE": "MOTOR CYCLE",
      "TWO WHEELER": "TWO WHEELER",
      "AUTO RICKSHAW": "AUTO RICKSHAW",
      "LGV": "LGV",
      "HGV": "HGV",
      "VAN": "VAN",
      "BMTC/KSRTC BUS": "BMTC/KSRTC BUS",
      "PRIVATE BUS": "PRIVATE BUS",

      "PARKING IN A MAIN ROAD": "PARKING IN A MAIN ROAD",
      "WRONG PARKING": "WRONG PARKING",
      "NO PARKING": "NO PARKING",
      "PARKING ON FOOTPATH": "PARKING ON FOOTPATH",
      "Obstruction": "Obstruction",
      "No Parking Zone": "No Parking Zone",
      "Double Parking": "Double Parking",

      // Days
      "Monday": "Monday",
      "Tuesday": "Tuesday",
      "Wednesday": "Wednesday",
      "Thursday": "Thursday",
      "Friday": "Friday",
      "Saturday": "Saturday",
      "Sunday": "Sunday",

      // Shifts
      "morning": "morning",
      "afternoon": "afternoon",
      "night": "night"
    },
    kn: {
      // Rebrand & Titles
      app_title: "ಸಂಚಾರ AI",
      app_logo: "ಸಂಚಾರ <span>AI</span>",
      app_logo_short: "ಸಂ<span>AI</span>",
      app_subtitle: "ಪಾರ್ಕಿಂಗ್ ಸಮಸ್ಯೆಯಿಂದ ಉಂಟಾಗುವ ಸಂಚಾರ ದಟ್ಟಣೆಗಾಗಿ ನಿರ್ಣಯ ಬೆಂಬಲ ವ್ಯವಸ್ಥೆ -- ಬೆಂಗಳೂರು",
      tmc_status: "TMC ಆನ್‌ಲೈನ್",
      console_login: "ಕನ್ಸೋಲ್ ಲಾಗಿನ್ →",
      open_dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ",
      back_to_home: "← ಮುಖಪುಟ",
      hero_tag: "ಬೆಂಗಳೂರು ಸಂಚಾರ ಪೊಲೀಸ್ · ಟಿಎಂಸಿ ಸಿಸ್ಟಮ್",
      hero_desc: "AI-ಚಾಲಿತ ಪಾರ್ಕಿಂಗ್ ಜಾರಿ ಮತ್ತು ಸಂಚಾರ ದಟ್ಟಣೆ ವಿಶ್ಲೇಷಣೆ. ಪ್ರಾದೇಶಿಕ ಸಾಂದ್ರತೆಯ ಕ್ಲಸ್ಟರಿಂಗ್ 120 ಪ್ರಮುಖ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳನ್ನು ಗುರುತಿಸುತ್ತದೆ, 46 ಪೊಲೀಸ್ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ BTP ಜಾರಿ ರೂಟಿಂಗ್ ಅನ್ನು ಅತ್ಯುತ್ತಮವಾಗಿಸುತ್ತದೆ.",

      // Ticker
      ticker_1: "115,400 ಪರಿಶೀಲಿಸಿದ ಉಲ್ಲಂಘನೆಗಳು",
      ticker_2: "120 ಅಪಾಯ-ಶ್ರೇಣೀಕೃತ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
      ticker_3: "46 ಪೊಲೀಸ್ ಠಾಣೆಗಳು",
      ticker_4: "DBSCAN ಪ್ರಾದೇಶಿಕ ಕ್ಲಸ್ಟರಿಂಗ್",
      ticker_5: "ಬೆಂಗಳೂರು ಸಂಚಾರ ಪೊಲೀಸ್",
      ticker_6: "AI ಜಾರಿ ಗುಪ್ತಚರ",

      // Navigation
      nav_map: "ನಕ್ಷೆ",
      nav_priority_list: "ಆದ್ಯತಾ ಪಟ್ಟಿ",
      nav_simulator: "ಸಿಮ್ಯುಲೇಟರ್",
      nav_insights: "ಒಳನೋಟಗಳು",
      nav_temporal: "ಕಾಲಿಕ ಮಾದರಿಗಳು",

      // Live CCTV
      cctv_title: "ಲೈವ್ ಸಂಚಾರ ಸಿಸಿಟಿವಿ ಫೀಡ್‌ಗಳು",
      cctv_subtitle: "ಬೆಂಗಳೂರು ಸಂಚಾರ ಕಾರಿಡಾರ್‌ಗಳಲ್ಲಿ ಸೆರೆಹಿಡಿಯಲಾದ ನೈಜ-ಸಮಯದ ಸಿಸಿಟಿವಿ ಟೆಲಿಮೆಟ್ರಿ",
      cam_mg_road: "CAM 01 // ಎಂಜಿ ರಸ್ತೆ",
      cam_silk_board: "CAM 02 // ಸಿಲ್ಕ್ ಬೋರ್ಡ್",
      cam_marathahalli: "CAM 03 // ಮಾರತಹಳ್ಳಿ",
      cam_indiranagar: "CAM 04 // ಇಂದಿರಾನಗರ",
      cam_koramangala: "CAM 05 // ಕೋರಮಂಗಲ",
      cam_hebbal: "CAM 06 // ಹೆಬ್ಬಾಳ ಫ್ಲೈಓವರ್",
      cctv_secure: "ಸುರಕ್ಷಿತ",
      cctv_overcrowd: "ದಟ್ಟಣೆ ಅತಿಹೆಚ್ಚು",
      cctv_congested: "ದಟ್ಟಣೆ",
      cctv_violation: "ಉಲ್ಲಂಘನೆ ಪತ್ತೆಯಾಗಿದೆ",

      // DBSCAN Section
      dbscan_title: "DBSCAN ಪ್ರಾದೇಶಿಕ ಕ್ಲಸ್ಟರಿಂಗ್",
      dbscan_desc: "ಸಾಂದ್ರತೆ-ಆಧಾರಿತ ಪ್ರಾದೇಶಿಕ ಕ್ಲಸ್ಟರಿಂಗ್ ಬಳಸಿ ಉಲ್ಲಂಘನೆಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗುಂಪು ಮಾಡಲಾಗುತ್ತದೆ. ಸಿಸ್ಟಮ್ ಯಾದೃಚ್ಛಿಕ ಶಬ್ದವನ್ನು ಫಿಲ್ಟರ್ ಮಾಡುತ್ತದೆ ಮತ್ತು ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಹಾಟ್‌ಸ್ಪಾಟ್ ನೋಡ್‌ಗಳಾಗಿ ಕುಗ್ಗಿಸುತ್ತದೆ.",
      dbscan_eps: "ಎಪ್ಸಿಲಾನ್ (eps)",
      dbscan_min_samples: "ಕನಿಷ್ಠ ಮಾದರಿಗಳು",
      dbscan_scroll_note: "ಚದುರಿದ ಉಲ್ಲಂಘನೆಗಳು ಸ್ಥಳೀಯ ಜಾರಿ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಾಗಿ ಕುಗ್ಗುವುದನ್ನು ವೀಕ್ಷಿಸಲು ಕೆಳಗೆ ಸ್ಕ್ರಾಲ್ ಮಾಡಿ.",

      // Feature Section
      features_title: "TMC ಇಂಜಿನ್ ಅಮೂರ್ತತೆಗಳು",
      features_subtitle: "ಸಂಚಾರ AI ಕನ್ಸೋಲ್‌ನಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುವ ಯುದ್ಧತಂತ್ರದ ಮಾಡ್ಯೂಲ್‌ಗಳು",
      feat_priority_title: "ಆದ್ಯತೆ",
      feat_priority_desc: "ಸೂತ್ರವನ್ನು ಬಳಸಿಕೊಂಡು ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಿಗೆ ಆದ್ಯತೆ ನೀಡಲಾಗುತ್ತದೆ: 0.5 * Count + 0.3 * RushHour + 0.2 * Severity",
      feat_alloc_title: "ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆ",
      feat_alloc_desc: "ಲಭ್ಯವಿರುವ ಅಧಿಕಾರಿಗಳನ್ನು ಆದ್ಯತೆಯ ವಲಯಗಳಿಗೆ ನಿಯೋಜಿಸುತ್ತದೆ. ಹೆವಿ ವಾಹನಗಳು ಶೇ.20 ಮೀರಿದಾಗ ಟೋ ಟ್ರಕ್‌ಗಳನ್ನು ಕಳುಹಿಸುತ್ತದೆ.",
      feat_insights_title: "ನಗರ ಒಳನೋಟಗಳು",
      feat_insights_desc: "ಪೀಕ್ ಜಾರಿ ಸಮಯಗಳು, ವಾರದ ದಿನಗಳ ವಿತರಣೆಗಳು ಮತ್ತು ಉಲ್ಲಂಘನೆ ಪ್ರಕಾರಗಳ ಸ್ಥಗಿತವನ್ನು ದೃಶ್ಯೀಕರಿಸುತ್ತದೆ.",

      // Footer
      footer_note: "ಬೆಂಗಳೂರು ಸಂಚಾರ ಪೊಲೀಸ್ ಕಮಾಂಡ್ ಕನ್ಸೋಲ್ · ಫ್ಲಿಪ್‌ಕಾರ್ಟ್ ಗ್ರಿಡ್‌ಲಾಕ್ ಹ್ಯಾಕಥಾನ್",
      ticker_meta: "115,400 ಉಲ್ಲಂಘನೆಗಳು · ನವೆಂಬರ್ 2023 - ಮಾರ್ಚ್ 2024",

      // Method Pane
      method_dataset_title: "ದತ್ತಾಂಶ",
      method_dataset_desc: "298,450 ಕಚ್ಚಾ ದಾಖಲೆಗಳನ್ನು 115,400 ಅನುಮೋದಿತ ದಾಖಲೆಗಳಿಗೆ ಫಿಲ್ಟರ್ ಮಾಡಲಾಗಿದೆ. ಅವಧಿ: ನವೆಂಬರ್ 2023 – ಮಾರ್ಚ್ 2024. ಕಾಲಮ್‌ಗಳು: ಅಕ್ಷಾಂಶ/ರೇಖಾಂಶ, ಸಮಯ, ಉಲ್ಲಂಘನೆ ಪ್ರಕಾರ, ವಾಹನ ಪ್ರಕಾರ, ಪೊಲೀಸ್ ಠಾಣೆ.",
      method_clustering_title: "ಕ್ಲಸ್ಟರಿಂಗ್",
      method_clustering_desc: "DBSCAN eps=0.003, min_samples=50. ಒಟ್ಟು 120 ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು, 4.9% ಧೂಳು ತಿರಸ್ಕರಿಸಲಾಗಿದೆ.",
      method_impact_title: "ಪ್ರಭಾವ ಅಂಕ",
      method_impact_desc: "ತೂಕ ತೀವ್ರತೆ: HGV=1.0, ಸ್ಕೂಟರ್=0.2 (ಊಹೆಗಳು). ಪೀಕ್ ಸಮಯ = IST 07-12.",
      method_shift_title: "ಶಿಫ್ಟ್ ನಿಯೋಜನೆ",
      method_shift_desc: "ಪ್ರತಿ ಶಿಫ್ಟ್‌ಗೆ ಅಧಿಕಾರಿ ಅಗತ್ಯತೆಗಳು. ಉಲ್ಲಂಘನೆಗಳ ಆಧಾರದ ಮೇಲೆ ಅಧಿಕಾರಿ ನಿಯೋಜನೆ. 4 vph ಸಾಮರ್ಥ್ಯದ ಊಹೆ.",
      method_tow_title: "ಟೋ ಟ್ರಕ್",
      method_tow_desc: "ಹೆವಿ ವಾಹನಗಳು ಶೇ.20 ಮೀರಿದ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಿಗೆ ಮಾತ್ರ ನಿಯೋಜಿಸಲಾಗುತ್ತದೆ.",

      // Controls Bar
      filter_station_lbl: "ಪೊಲೀಸ್ ಠಾಣೆಯಿಂದ ಫಿಲ್ಟರ್ ಮಾಡಿ",
      all_stations: "ಎಲ್ಲಾ ಪೊಲೀಸ್ ಠಾಣೆಗಳು",
      severity_all: "ಎಲ್ಲಾ",
      severity_critical: "ಗಂಭೀರ",
      severity_high: "ಹೆಚ್ಚು",
      severity_watch: "ವೀಕ್ಷಣೆ",
      layer_impact: "ಪ್ರಭಾವ",
      layer_volume: "ಪ್ರಮಾಣ",
      layer_junction: "ಜಂಕ್ಷನ್",
      layer_heatmap: "ಹಾಟ್‌ಸ್ಪಾಟ್ ಹೀಟ್‌ಮ್ಯಾಪ್",

      // Map View
      map_layer_impact_title: "ಪ್ರಭಾವ ವಲಯ",
      map_layer_impact_desc: "ಒಟ್ಟು ಸಂಚಾರ ದಟ್ಟಣೆ ಆದ್ಯತಾ ಅಂಕ. ಕೆಂಪು = ಗಂಭೀರ (≥೦.೬೫), ಕಿತ್ತಳೆ = ಹೆಚ್ಚು (೦.೫೦–೦.೬೪), ಹಸಿರು/ನೀಲಿ = ಮಧ್ಯಮ. ವಲಯದ ಗಾತ್ರವು ಹರಡುವಿಕೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ.",
      map_layer_volume_title: "ಪ್ರಮಾಣ ವಲಯ",
      map_layer_volume_desc: "ಉಲ್ಲಂಘನೆಗಳ ಸಂಖ್ಯೆಗೆ ತಕ್ಕಂತೆ ಬಣ್ಣದ ಸಾಂದ್ರತೆ. ಇದು ಒಟ್ಟು ಜಾರಿ ಬೇಡಿಕೆಯನ್ನು ತಿಳಿಸುತ್ತದೆ.",
      map_layer_junction_title: "ಜಂಕ್ಷನ್ ವಲಯ",
      map_layer_junction_desc: "ನೇರಳೆ = ಜಂಕ್ಷನ್ ಹೊಂದಿರುವ ಹಾಟ್‌ಸ್ಪಾಟ್. ಬೂದು = ಹೆಸರಿಸದ ಜಂಕ್ಷನ್. ಇಂಟರ್‌ಸೆಕ್ಷನ್‌ಗಳನ್ನು ಮೊದಲು ತೆರವುಗೊಳಿಸಲು ಇದು ಸಹಕಾರಿ.",
      map_layer_heatmap_title: "ಹೀಟ್‌ಮ್ಯಾಪ್ ವಲಯ",
      map_layer_heatmap_desc: "ರೇಡಿಯಸ್-ವೇಟೆಡ್ ಸಾಂದ್ರತೆಯ ಮೇಲ್ಪದರ. ಬೆಂಗಳೂರಿನಾದ್ಯಂತ ಉಲ್ಲಂಘನೆಗಳ ಪ್ರಾದೇಶಿಕ ಸಾಂದ್ರತೆಯನ್ನು ತೋರಿಸುತ್ತದೆ.",
      map_legend_crit: "ಗಂಭೀರ (≥೦.೬೫)",
      map_legend_high: "ಹೆಚ್ಚು (೦.೫೦–೦.೬೪)",
      map_legend_watch: "ಮಧ್ಯಮ / ವೀಕ್ಷಣೆ",

      // Priority List Tab
      priority_title: "ಪಾರ್ಕಿಂಗ್ ದಟ್ಟಣೆ ಆದ್ಯತಾ ಪ್ರದೇಶಗಳು",
      priority_subtitle: "ಪ್ರಭಾವ ಅಂಕಗಳ ಆಧಾರದ ಮೇಲೆ ಶ್ರೇಣೀಕರಿಸಿದ ವಲಯಗಳು · {count} ಪ್ರದೇಶಗಳು",
      priority_formula_note: "ಸೂತ್ರ: 0.5 × count_norm + 0.3 × rush_frac + 0.2 × sev_norm",
      priority_throughput_note: "ಸಾಮರ್ಥ್ಯ: ಪ್ರತಿ ಅಧಿಕಾರಿಗೆ ಗಂಟೆಗೆ 4 ಉಲ್ಲಂಘನೆಗಳು (ಊಹೆ)",
      col_rank: "ಶ್ರೇಣಿ",
      col_id: "ID",
      col_junction: "ಜಂಕ್ಷನ್",
      col_station: "ಪೊಲೀಸ್ ಠಾಣೆ",
      col_impact: "ಪ್ರಭಾವ ಅಂಕ",
      col_violations: "ಉಲ್ಲಂಘನೆಗಳು",
      col_officers_am: "ಅಧಿಕಾರಿಗಳು (AM)",
      col_peak_shift: "ಪೀಕ್ ಶಿಫ್ಟ್",
      col_top_vehicle: "ಪ್ರಮುಖ ವಾಹನ",
      priority_footnote_desc: "Count Norm: ಲಾಗ್-ನಾರ್ಮಲೈಸ್ ಮಾಡಿದ ಉಲ್ಲಂಘನೆಯ ಪ್ರಮಾಣ. Rush-Hr Frac: IST 7-11 ಅಥವಾ 17-20 ರ ನಡುವಿನ ಪಾಲು. Sev Norm: ವಾಹನದ ತೂಕದ ಸರಾಸರಿ (HGV=1.0, ಸ್ಕೂಟರ್=0.2). ಅಧಿಕಾರಿಗಳು (AM): ಬೆಳಿಗ್ಗೆ ಶಿಫ್ಟ್ ಅಧಿಕಾರಿಗಳು. 4 vph ಸಾಮರ್ಥ್ಯವು ಒಂದು ಊಹೆಯಾಗಿದೆ.",

      // Simulator Tab
      sim_resources: "ಸಂಪನ್ಮೂಲಗಳು",
      sim_officers_label: "ಲಭ್ಯವಿರುವ ಅಧಿಕಾರಿಗಳು",
      sim_trucks_label: "ಲಭ್ಯವಿರುವ ಟೋ ಟ್ರಕ್‌ಗಳು",
      sim_shift_label: "ನಿಯೋಜನೆ ಶಿಫ್ಟ್",
      sim_shift_morning_val: "ಬೆಳಿಗ್ಗೆ (೦೬:೦೦-೧೨:೦೦)",
      sim_shift_afternoon_val: "ಮಧ್ಯಾಹ್ನ (೧೨:೦೦-೧೮:೦೦)",
      sim_shift_night_val: "ರಾತ್ರಿ (೧೮:೦೦-೦೬:೦೦)",
      sim_resources_note: "ಅಧಿಕಾರಿಗಳನ್ನು ಶ್ರೇಣಿ 1 ರಿಂದ ಕೆಳಕ್ಕೆ ನಿಯೋಜಿಸಲಾಗುತ್ತದೆ. ಹೆವಿ ವಾಹನಗಳು (HGV/ಬಸ್/ಟ್ಯಾಂಕರ್/ಲಾರಿ) ಶೇ.20 ಮೀರಿದ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಿಗೆ ಮಾತ್ರ ಟೋ ಟ್ರಕ್‌ಗಳನ್ನು ನಿಯೋಜಿಸಲಾಗುತ್ತದೆ.",
      sim_run_btn: "▶ ಸಿಮ್ಯುಲೇಶನ್ ರನ್ ಮಾಡಿ",
      sim_summary_label: "ನಿಯೋಜನೆ ಸಾರಾಂಶ",
      sim_deployed_officers: "ನಿಯೋಜಿತ ಅಧಿಕಾರಿಗಳು",
      sim_unused_officers: "ಬಳಕೆಯಾಗದ ಅಧಿಕಾರಿಗಳು",
      sim_tow_used: "ಬಳಸಿದ ಟೋ ಟ್ರಕ್‌ಗಳು",
      sim_covered_label: "ವ್ಯಾಪ್ತಿಯಲ್ಲಿರುವ",
      sim_partial_label: "ಭಾಗಶಃ ವ್ಯಾಪ್ತಿ",
      sim_uncovered_label: "ವ್ಯಾಪ್ತಿಯಿಲ್ಲದ",
      sim_coverage_rate_lbl: "ವ್ಯಾಪ್ತಿ ದರ",
      sim_coverage_map_title: "ವ್ಯಾಪ್ತಿ ನಕ್ಷೆ",
      sim_tbl_covered: "ವ್ಯಾಪ್ತಿಯಲ್ಲಿರುವ ವಲಯಗಳು",
      sim_tbl_partial: "ಭಾಗಶಃ ವ್ಯಾಪ್ತಿಯಿರುವ ವಲಯಗಳು",
      sim_tbl_uncovered: "ವ್ಯಾಪ್ತಿಯಿಲ್ಲದ ವಲಯಗಳು",
      sim_tbl_col_rank: "ಶ್ರೇಣಿ",
      sim_tbl_col_junction: "ಜಂಕ್ಷನ್",
      sim_tbl_col_score: "ಸ್ಕೋರ್",
      sim_tbl_col_violations: "ಉಲ್ಲಂಘನೆಗಳು",
      sim_tbl_col_needed: "ಅಗತ್ಯವಿದೆ",
      sim_tbl_col_assigned: "ನಿಯೋಜನೆ",
      sim_tbl_col_tow: "ಟೋ",
      sim_tow_active: "ಟೋ",
      sim_more_zones: "+ {count} ಹೆಚ್ಚುವರಿ ವಲಯಗಳು",
      sim_tooltip_assigned: "ನಿಯೋಜನೆ: {assigned} / {needed} ಅಧಿಕಾರಿಗಳು",

      // Insights Tab
      insights_total_violations: "ವಿಶ್ಲೇಷಿಸಿದ ಉಲ್ಲಂಘನೆಗಳು",
      insights_total_violations_sub: "ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಲ್ಲಿ ಉಲ್ಲಂಘನೆಗಳು",
      insights_hotspots: "ಸ್ಕೋರ್ ಮಾಡಿದ ನಗರ ಸೆಲ್‌ಗಳು",
      insights_hotspots_sub: "DBSCAN ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
      insights_junction_linked: "ಜಂಕ್ಷನ್-ಸಂಯೋಜಿತ ಪ್ರಕರಣಗಳು",
      insights_junction_linked_sub: "ಫಿಲ್ಟರ್ ಮಾಡಿದ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
      insights_critical_hs: "ಗಂಭೀರ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
      insights_critical_hs_sub: "ಸ್ಕೋರ್ ≥ ೦.೬೫",
      chart_title_hour: "ಗಂಟೆಯ ಪ್ರಕಾರ ಉಲ್ಲಂಘನೆಗಳು (IST)",
      chart_desc_hour: "ಕಿತ್ತಳೆ = ಪೀಕ್ ಅವರ್ಸ್ (೦೭–೧೧ IST). ಸಂಜೆ ದತ್ತಾಂಶ ಕಡಿಮೆ ಇದೆ - ಜಾರಿ ಪ್ರಕ್ರಿಯೆಯು ಬೆಳಿಗ್ಗೆ ಕೇಂದ್ರೀಕೃತವಾಗಿದೆ.",
      chart_title_dow: "ವಾರದ ದಿನದ ಪ್ರಕಾರ ಉಲ್ಲಂಘನೆಗಳು",
      chart_title_vt: "ಪ್ರಮುಖ ಉಲ್ಲಂಘನೆ ಪ್ರಕಾರಗಳು",
      chart_title_vehicle: "ವಾಹನದ ಪ್ರಕಾರಗಳ ವಿಶ್ಲೇಷಣೆ",
      chart_title_monthly: "ಮಾಸಿಕ ಉಲ್ಲಂಘನೆಯ ಪ್ರವೃತ್ತಿ",
      chart_desc_monthly: "ನವೆಂಬರ್ 2023 ಮತ್ತು ಮಾರ್ಚ್ 2024 ಭಾಗಶಃ ತಿಂಗಳುಗಳು (ಮಸುಕಾಗಿದೆ). ಫೆಬ್ರವರಿ-ಮಾರ್ಚ್ 2024 ರ ಕಡಿಮೆ ದತ್ತಾಂಶವು ವರದಿ ಮಾಡುವಲ್ಲಿನ ವ್ಯತ್ಯಾಸವಾಗಿದೆ, ನೈಜ ಇಳಿಕೆಯಲ್ಲ.",
      detail_partial_month_legend: "ಭಾಗಶಃ ತಿಂಗಳು",
      chart_title_score_dist: "ಪ್ರಭಾವ ಅಂಕಗಳ ವಿತರಣೆ",
      chart_y_hotspots: "ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",

      // Side Panel
      side_tab_overview: "ಅವಲೋಕನ",
      side_tab_hotspot: "ಹಾಟ್‌ಸ್ಪಾಟ್",
      side_tab_method: "ವಿಧಾನ",
      side_overview_title: "ಅವಲೋಕನ",
      side_judge_brief_title: "ವಿಚಾರಣೆ ಸಾರಾಂಶ",
      side_judge_loading: "ಗುಪ್ತಚರ ಸಾರಾಂಶವನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
      side_top_hotspots_title: "ಪ್ರಮುಖ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
      side_loading_hs: "ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
      side_empty_detail: "ವಿವರಗಳನ್ನು ನೋಡಲು ನಕ್ಷೆ ಅಥವಾ ಪಟ್ಟಿಯಲ್ಲಿರುವ ಹಾಟ್‌ಸ್ಪಾಟ್ ಕ್ಲಿಕ್ ಮಾಡಿ",
      side_detail_shift_title: "ಶಿಫ್ಟ್ ನಿಯೋಜನೆ",
      side_detail_vt_title: "ಉಲ್ಲಂಘನೆ ವಿವರಗಳು",

      // Judge Brief Template
      judge_brief_template: "ಸಂಚಾರ AI ಒಟ್ಟು {totalCnt} ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಲ್ಲಿ {critCnt} ಗಂಭೀರ ವಲಯಗಳನ್ನು (ಸ್ಕೋರ್ ≥೦.೬೫) ಪತ್ತೆಹಚ್ಚಿದೆ. ಶೇಕಡಾ {pctJxn}% ಜಂಕ್ಷನ್ ವಲಯಗಳಿಗೆ ಸಂಯೋಜಿತವಾಗಿವೆ. {topStn} ಅತ್ಯಂತ ಪ್ರಮುಖ ಪೊಲೀಸ್ ಠಾಣೆಯಾಗಿದೆ. ಬೆಳಿಗ್ಗೆ ಶಿಫ್ಟ್ (೦೭:೦೦-೧೨:೦೦ IST) ಪ್ರಮುಖ ಜಾರಿ ವಿಂಡೋ ಆಗಿದೆ — ಟಿಕೆಟ್ ಎಣಿಕೆಗಿಂತ ಸಂಚಾರ ಅಡಚಣೆ ತೆರವುಗೊಳಿಸಲು ಆದ್ಯತೆ ನೀಡಿ.",

      // Details Pane Labels
      detail_shift: "ಶಿಫ್ಟ್",
      detail_violations: "ಉಲ್ಲಂಘನೆಗಳು",
      detail_share: "ಪಾಲು",
      detail_officers: "ಅಧಿಕಾರಿಗಳು",
      detail_type: "ಪ್ರಕಾರ",
      detail_count: "ಸಂಖ್ಯೆ",
      detail_tow_required: "ಟೋ ಅಗತ್ಯವಿದೆ",

      // Map dynamic labels
      map_violations_word: "ಉಲ್ಲಂಘನೆಗಳು",
      map_popup_junction: "ಜಂಕ್ಷನ್",
      map_popup_station: "ಠಾಣೆ",
      map_popup_impact: "ಪ್ರಭಾವ ಅಂಕ",
      map_popup_violations: "ಉಲ್ಲಂಘನೆಗಳು",
      map_popup_peak: "ಪೀಕ್",
      map_popup_officers: "ಅಧಿಕಾರಿಗಳ ಅಗತ್ಯವಿದೆ",
      map_popup_tow_req: "ಟೋ ಟ್ರಕ್ ಅಗತ್ಯವಿದೆ",

      // Categories
      "SCOOTER": "ಸ್ಕೂಟರ್",
      "CAR": "ಕಾರು",
      "PASSENGER AUTO": "ಆಟೋ ರಿಕ್ಷಾ",
      "MAXI-CAB": "ಮ್ಯಾಕ್ಸಿ ಕ್ಯಾಬ್",
      "MOTOR CYCLE": "ಮೋಟಾರ್ ಸೈಕಲ್",
      "TWO WHEELER": "ದ್ವಿಚಕ್ರ ವಾಹನ",
      "AUTO RICKSHAW": "ಆಟೋ ರಿಕ್ಷಾ",
      "LGV": "ಲಘು ಸರಕು ವಾಹನ",
      "HGV": "ಭಾರೀ ಸರಕು ವಾಹನ",
      "VAN": "ವ್ಯಾನ್",
      "BMTC/KSRTC BUS": "BMTC/KSRTC ಬಸ್",
      "PRIVATE BUS": "ಖಾಸಗಿ ಬಸ್",

      "PARKING IN A MAIN ROAD": "ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ಪಾರ್ಕಿಂಗ್",
      "WRONG PARKING": "ತಪ್ಪಾದ ಪಾರ್ಕಿಂಗ್",
      "NO PARKING": "ನೋ ಪಾರ್ಕಿಂಗ್",
      "PARKING ON FOOTPATH": "ಫುಟ್‌ಪಾತ್ ಮೇಲೆ ಪಾರ್ಕಿಂಗ್",
      "Obstruction": "ಸಂಚಾರ ಅಡಚಣೆ",
      "No Parking Zone": "ನೋ ಪಾರ್ಕಿಂಗ್ ವಲಯ",
      "Double Parking": "ಡಬಲ್ ಪಾರ್ಕಿಂಗ್",

      // Stations
      'Whitefield': 'ವೈಟ್‌ಫೀಲ್ಡ್',
      'Rajajinagar': 'ರಾಜಾಜಿನಗರ',
      'Chamarajpet': 'ಚಾಮರಾಜಪೇಟೆ',
      'HAL Old Airport': 'HAL ಹಳೇ ವಿಮಾನ ನಿಲ್ದಾಣ',
      'Peenya': 'ಪೀಣ್ಯ',
      'K.G. Halli': 'ಕೆ.ಜಿ. ಹಳ್ಳಿ',
      'Byatarayanapura': 'ಬ್ಯಾಟರಾಯನಪುರ',
      'Sheshadripuram': 'ಶೇಷಾದ್ರಿಪುರಂ',
      'K.R. Pura': 'ಕೆ.ಆರ್. ಪುರ',
      'Banaswadi': 'ಬಾಣಸವಾಡಿ',
      'K.S. Layout': 'ಕೆ.ಎಸ್. ಲೇಔಟ್',
      'Yeshwanthpura': 'ಯಶವಂತಪುರ',
      'Jalahalli': 'ಜಲಹಳ್ಳಿ',
      'Mico Layout': 'ಮೈಕೋ ಲೇಔಟ್',
      'Jayanagara': 'ಜಯನಗರ',
      'Electronic City': 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ',
      'Kamakshipalya': 'ಕಾಮಾಕ್ಷಿಪಾಳ್ಯ',
      'Banashankari': 'ಬನಶಂಕರಿ',
      'Kodigehalli': 'ಕೊಡಿಗೆಹಳ್ಳಿ',
      'Bellandur': 'ಬೆಳ್ಳಂದೂರು',
      'Chikkajala': 'ಚಿಕ್ಕಜಾಲ',
      'Halasur': 'ಹಲಸೂರು',
      'Sadashivanagar': 'ಸದಾಶಿವನಗರ',
      'Adugodi': 'ಆಡುಗೋಡಿ',
      'Shivajinagar': 'ಶಿವಾಜಿನಗರ',
      'Thalagattapura': 'ತಲಘಟ್ಟಪುರ',
      'Wilson Garden': 'ವಿಲ್ಸನ್ ಗಾರ್ಡನ್',
      'Cubbon Park': 'ಕಬ್ಬನ್ ಪಾರ್ಕ್',
      'Pulikeshinagar(F.Town)': 'ಪುಲಕೇಶಿನಗರ',
      'Ashok Nagar': 'ಅಶೋಕ್ ನಗರ',
      'R.T. Nagar': 'ಆರ್.ಟಿ. ನಗರ',
      'Yelahanka': 'ಯಲಹಂಕ',
      'High ground': 'ಹೈ ಗ್ರೌಂಡ್ಸ್',
      'Jnanabharathi': 'ಜ್ಞಾನಭಾರತಿ',
      'Madiwala': 'ಮಡಿವಾಳ',
      'Vijayanagara': 'ವಿಜಯನಗರ',
      'Hulimavu': 'ಹುಳಿಮಾವು',
      'Chikkabanavara': 'ಚಿಕ್ಕಬಾಣಾವಾರ',
      'Jeevanbheemanagar': 'ಜೀವನ್‌ಭೀಮಾನಗರ',
      'Mahadevapura': 'ಮಹದೇವಪುರ',
      'Hebbala': 'ಹೆಬ್ಬಾಳ',
      'Upparpet': 'ಉಪ್ಪಾರಪೇಟೆ',
      'Hennuru': 'ಹೆಣ್ಣೂರು',
      'Basavanagudi': 'ಬಸವನಗುಡಿ',
      'J.P. Nagar': 'ಜೆ.ಪಿ. ನಗರ',
      'HSR Layout': 'ಎಚ್ಎಸ್‌ಆರ್ ಲೇಔಟ್',
      
      'Whitefield PS': 'ವೈಟ್‌ಫೀಲ್ಡ್ ಪೊಲೀಸ್ ಠಾಣೆ',
      'Koramangala PS': 'ಕೋರಮಂಗಲ ಪೊಲೀಸ್ ಠಾಣೆ',
      'Hebbal PS': 'ಹೆಬ್ಬಾಳ ಪೊಲೀಸ್ ಠಾಣೆ',
      'Yeshwanthpur PS': 'ಯಶವಂತಪುರ ಪೊಲೀಸ್ ಠಾಣೆ',
      'Jayanagar PS': 'ಜಯನಗರ್ ಪೊಲೀಸ್ ಠಾಣೆ',
      'BTM Layout PS': 'ಬಿಟಿಎಂ ಲೇಔಟ್ ಪೊಲೀಸ್ ಠಾಣೆ',
      'Electronic City PS': 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ ಪೊಲೀಸ್ ಠಾಣೆ',

      "spans_multiple": "ಬಹು ಠಾಣೆಗಳನ್ನು ಒಳಗೊಂಡಿದೆ",

      // Days
      "Monday": "ಸೋಮವಾರ",
      "Tuesday": "ಮಂಗಳವಾರ",
      "Wednesday": "ಬುಧವಾರ",
      "Thursday": "ಗುರುವಾರ",
      "Friday": "ಶುಕ್ರವಾರ",
      "Saturday": "ಶನಿವಾರ",
      "Sunday": "ಭಾನುವಾರ",

      // Shifts
      "morning": "ಬೆಳಿಗ್ಗೆ",
      "afternoon": "ಮಧ್ಯಾಹ್ನ",
      "night": "ರಾತ್ರಿ"
    }
  };

  // Get current language from localStorage or default to 'en'
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

  function getLanguage() {
    return currentLang;
  }

  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'kn') lang = 'en';
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    updateDOM();
    
    // Dispatch a custom event to notify other modules (charts, map, simulator)
    window.dispatchEvent(new CustomEvent('languagechanged', { detail: { lang } }));
  }

  // Simple string translation helper
  function t(key, replacements = {}) {
    const dict = dictionaries[currentLang] || dictionaries.en;
    let translation = dict[key] || dictionaries.en[key] || key;

    // Interpolate variables like {count}
    Object.entries(replacements).forEach(([k, v]) => {
      translation = translation.replace(new RegExp(`{${k}}`, 'g'), v);
    });

    return translation;
  }

  // Scans the page for [data-i18n] and [data-i18n-html] elements and updates them
  function updateDOM() {
    // Normal text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });

    // HTML elements (e.g. logo with tags)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key);
    });

    // Attribute placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });

    // Update document title if applicable
    const titleKey = document.querySelector('title')?.getAttribute('data-i18n-title');
    if (titleKey) {
      document.title = t(titleKey);
    }
  }

  // Run DOM update on load
  document.addEventListener('DOMContentLoaded', () => {
    updateDOM();
  });

  return {
    getLanguage,
    setLanguage,
    t,
    updateDOM,
    dictionaries
  };
})();
