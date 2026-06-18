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

---

## Phase 7: Deploy + Polish

- [ ] redeploy to Streamlit Cloud with real data wired in (B)
- [ ] visual polish: color scale on map, clean table formatting (B)
- [ ] confirm demo flow works: map -> priority list -> simulator (Both)
- [ ] write 3-sentence pitch (Both)
