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

- [ ] Streamlit app with sidebar nav: Map / Priority List / Simulator
- [ ] Map screen: folium or pydeck map, hotspots as markers sized by impact score
- [ ] Priority list screen: ranked table with score breakdown column
- [ ] Simulator screen: officer/tow truck input sliders, coverage output table
- [ ] build all screens against sample/fake data first

---

## Phase 5: Decision Layer

- [ ] officer recommendation formula: violations_per_hour / officer_throughput_per_hour (A)
- [ ] simulator allocation: greedy fill from top-ranked hotspot down until officers exhausted (A)
- [ ] show uncovered hotspots honestly, no fake % improvement (A+B)

---

## Phase 6: Wire Together

- [ ] replace fake sample data in UI with real hotspot output (B)
- [ ] end-to-end test: run pipeline, verify map and table populate correctly (Both)
- [ ] fix any schema mismatches between A output and B expectations (Both)

---

## Phase 7: Deploy + Polish

- [ ] redeploy to Streamlit Cloud with real data wired in (B)
- [ ] visual polish: color scale on map, clean table formatting (B)
- [ ] confirm demo flow works: map -> priority list -> simulator (Both)
- [ ] write 3-sentence pitch (Both)
