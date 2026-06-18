# Tasks

Status: todo / doing / done

---

## Phase 0: Docs

- [x] README.md (Both)
- [x] docs/tasks.md (Both)
- [x] docs/decisions.md (Both)

---

## Phase 1: Repo Setup + Deploy Skeleton

- [x] repo structure: src/, app.py, requirements.txt (Both)
- [x] hello world Streamlit app running locally (B)
- [x] push to GitHub (Both)
- [x] deploy to Streamlit Cloud and confirm live link works (B)

---

## Phase 2: Data Layer (A)

- [x] load CSV, confirm row count, date range, column types
- [x] profile nulls, filter to validation_status = approved
- [x] parse violation_type from JSON array to usable form
- [x] extract hour from created_datetime for rush-hour weighting
- [x] output clean dataframe saved to data/clean_violations.parquet

---

## Phase 3: Hotspot Detection + Scoring (A)

- [x] run DBSCAN on lat/lon, tune eps and min_samples against real data
- [x] compute violation density per cluster
- [x] compute rush-hour concentration (% of violations in 8-10am, 5-8pm)
- [x] build composite impact score with explainable breakdown
- [x] compute violations_per_hour and recommended_officers per hotspot
- [x] output handoff JSON: hotspot_id, lat, lon, impact_score, score_breakdown, violations_per_hour, recommended_officers

---

## Phase 4: Frontend Shell (B, runs in parallel with Phase 2-3)

- [x] Streamlit app with sidebar nav: Map / Priority List / Simulator
- [x] Map screen: folium or pydeck map, hotspots as markers sized by impact score
- [x] Priority list screen: ranked table with score breakdown column
- [x] Simulator screen: officer/tow truck input sliders, coverage output table
- [x] built against real data/processed/hotspots.json (no fake data needed)

---

## Phase 5: Decision Layer

- [x] officer recommendation formula: violations_per_hour / officer_throughput_per_hour (A)
- [x] simulator allocation: greedy fill from top-ranked hotspot down until officers exhausted (A)
- [x] show uncovered hotspots honestly, no fake % improvement (A+B)

---

## Phase 6: Wire Together (verification pass -- no fake data was ever used)

- [x] data_loader.py runs clean end-to-end, produces data/clean_violations.parquet (115,400 rows)
- [x] hotspot_engine.py runs clean end-to-end, produces data/processed/hotspots.json (101 hotspots, deterministic output)
- [x] full schema match confirmed: all columns app.py reads from hotspots.json and score_breakdown match exactly what hotspot_engine.py writes
- [x] simulate_allocation output schema matches what page_simulator expects (rank, hotspot_id, impact_score, violation_count, officers_needed, officers_assigned, tow_truck, status)
- [x] sort order, dtypes, row count, and i18n keys all verified programmatically
- [x] no schema mismatches found

---

## Language Toggle (post Phase 5 feature)

- [x] src/i18n.py with translations dict and t(key, lang) helper
- [x] language selector in sidebar (English / ಕನ್ನಡ), persisted via session_state
- [x] all keys in the provided starter set wired into app.py
- [x] data values, place names, and dynamic tooltip text left in English
- [x] 6 new keys added: legend_low/high, about_data_title, col_impact_score, col_violations, col_officers_rec
- [x] LEGEND_HTML converted to _legend_html(lang) function; expander title uses t("about_data_title", lang)
- [x] col_impact_score and col_violations routed through t() in both priority list and simulator tables
- [x] Count Norm, Rush-Hr Frac, Viol/Hr kept as English string literals in both language modes (technical abbreviations without clean Kannada equivalents)
- [x] methodology expander body stays English in both modes

---

## Simulator Station Filter Fix (post Phase 7 bugfix)

- [x] page_simulator now receives filtered_df instead of df, so station selection scopes the sim to that station's hotspots
- [x] simulator caption updated to state that scope follows the sidebar station filter
- [x] verified: All stations / 30 officers shows city-wide 4 covered / 97 uncovered (unchanged from pre-fix)
- [x] verified: Jayanagara / 30 officers shows 3 covered / 0 uncovered (3 hotspots, all rec'd=1 officer each)
- [x] verified: Jayanagara / 2 officers shows 2 covered / 1 uncovered (greedy rank-order correct)
- [x] decisions.md updated with rationale: station-level simulation is the realistic use case for a station commander

---

## Police Station Filter + Junction Name (post Phase 7 feature)

- [x] build_hotspots(): compute mode police_station, mode junction_name, station_count per cluster
- [x] handoff JSON extended with police_station, junction_name, station_count
- [x] load_hotspots() in app.py: graceful defaults if JSON not yet regenerated (backward compat)
- [x] _build_map(): junction_name and police_station in popup; "Spans multiple stations" note when station_count > 1
- [x] junction_name in map tooltip
- [x] Priority List: Junction and Police Station columns added; "Spans multiple stations" note in cell when station_count > 1
- [x] Sidebar: police station filter selectbox (All stations + sorted station list)
- [x] Filter applied to Map and Priority List; Simulator always runs on full hotspot set
- [x] 3 new i18n keys: station_filter, all_stations, spans_multiple_stations (en + kn first draft)
- [x] decisions.md handoff contract updated with new fields

---

## Phase 7: Deploy + Polish

- [x] confirmed live on Streamlit Cloud at latest commit
- [x] map legend added: labeled HTML gradient bar (low to high impact, color + radius encoding explained)
- [x] priority list table: commas on Violations, consistent decimal places on all numeric columns
- [x] simulator tables: Violations formatted with commas, Impact Score to 3dp
- [x] About this data expander in sidebar: dataset, clustering method, impact score formula, officer throughput assumption -- all in plain language
- [x] st.info block on simulator left panel labels officer throughput assumption visibly
- [x] README.md: dataset numbers corrected (298k raw / 115k approved), pydeck removed, Pitch section added
- [x] 3-sentence pitch written in README.md under Pitch heading
- [x] demo flow confirmed: Map (hotspot density story) -> Priority List (ranking + score breakdown) -> Simulator (allocation + coverage gaps)
