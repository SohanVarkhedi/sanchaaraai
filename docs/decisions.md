# Decisions

Short log of non-obvious choices. Update this when something changes.

---

**Clustering: DBSCAN over k-means**
Parking hotspots are not uniform blobs and we do not know the number of clusters in advance. DBSCAN finds arbitrary-shaped clusters and marks noise points as outliers automatically. k-means requires a preset k and forces every point into a cluster.

---

**Data filter: validation_status = approved only**
The dataset has records with NULL or other validation statuses. Using only approved records reduces noise from duplicate or contested reports. Confirmed this column exists and is usable.

---

**Rush-hour weighting: derived from created_datetime hour**
The dataset has hour-level timestamps in created_datetime. We can compute what fraction of a hotspot's violations occur during morning peak (8-10am) and evening peak (5-8pm). This is a real signal, not an assumption.

---

**No vehicle severity weighting in MVP**
violation_type is stored as a JSON array per row (e.g. ["WRONG PARKING","NO PARKING"]). Parsing and weighting by type adds complexity. Deferred to after Phase 5 if time remains.

---

**Handoff contract (do not change without telling both people)**
Person A outputs exactly:
```
hotspot_id, lat, lon, impact_score, score_breakdown, violations_per_hour, recommended_officers
```
score_breakdown is a dict or JSON string showing how much each factor contributed to impact_score.

---

**Deployment: Streamlit Cloud**
Free, zero infrastructure, deploys from GitHub in minutes. Confirmed compatible with our stack.

---

**No fake metrics**
No output like "28% improvement" unless there is real math behind it. Simulator shows coverage (which hotspots get officers) and gaps (which do not). That is honest and still compelling to a judge.

---

**Officer throughput assumption**
Needs to be set in Phase 5 based on realistic field data or a stated assumption. Example: 1 officer can process 3 violations per hour. This number must be documented and labeled as an assumption, not presented as a measurement.

---

**Map tile: CartoDB dark_matter**
Used in the skeleton app and will carry through to production. Matches the dark theme, requires no API key, and renders clearly on Streamlit Cloud.

---

**streamlit-folium for map rendering**
Folium generates Leaflet HTML. streamlit-folium embeds it inside a Streamlit iframe component. No alternative needed; this is the standard pairing.

---

**app.py at repo root, not inside src/**
Streamlit Cloud expects the entry point at the root by default. src/ is reserved for importable modules (data loading, clustering, scoring). Keeps the deploy config simple.

---

**Timestamps are UTC, must convert to IST before hour extraction**
The dataset marks all timestamps as UTC (+00:00). Bangalore is IST = UTC+5:30 (Asia/Kolkata). Extracting hours in UTC gives a completely wrong distribution -- peaks appear at 0-6 UTC (actually IST morning). All hour-based logic uses `dt.tz_convert("Asia/Kolkata")` before calling `.dt.hour`. Column is named `hour_ist` to make this explicit.

---

**Actual date range: Nov 9 2023 to Apr 8 2024 (filename is misleading)**
The source CSV is named "jan to may" but the actual data spans Nov 2023 - Apr 2024. Do not cite "Jan-May" in the demo. Use the confirmed range.

---

**Row count after approved filter: 115,400 of 298,450 (61.3% removed)**
NULLs account for 125,254 rows (no status assigned). Rejected: 49,754. Others (created1, processing, duplicate): ~8,042. Only approved records are used downstream.

---

**Morning enforcement is dominant; evening rush is absent from this dataset**
After IST conversion, the hour distribution peaks at 8-11am IST (10k-12k violations/hour). Evening rush hours 17-20 IST contain only ~154 rows total across all hotspots. This is not a data error -- enforcement in Bangalore appears morning-heavy. Consequence for Phase 3: rush-hour weighting will be driven almost entirely by the morning signal. Do not claim evening congestion insight from this data.

---

**Rush-hour windows used: morning 7-11 IST, evening 17-20 IST**
Both windows are flagged in `is_rush_hour` for completeness, but Phase 3 scoring should compute the actual fraction per hotspot from raw data -- the evening window will naturally contribute near-zero weight where data is sparse.

---

**violation_type kept as a list per row, not exploded**
Each row is one enforcement event (one vehicle stop). A single event can have multiple violation subtypes stored as a JSON array string. Parsed with `json.loads()` into a Python list and stored in `violation_type_list`. Not exploded into multiple rows because that would inflate violation counts in Phase 3 density calculations. One row = one event.

---

**DBSCAN parameters: eps=0.003, min_samples=50**
Tuning grid tested eps in [0.001, 0.002, 0.003, 0.005] and min_samples in [20, 50, 100].
Chosen: eps=0.003 (~333m radius), min_samples=50.
Rationale: produces 101 clusters with 3.7% noise (4,320 points discarded).
101 hotspots is an actionable number for a city -- not so granular officers can't use it, not so coarse it merges neighborhoods.
333m captures a typical city block + surrounding streets, which matches how parking pressure zones form.
min_samples=50 means a minimum of 50 real violation events to qualify as a hotspot.
eps=0.005 (45 clusters) merged distinct city zones. eps=0.001 (180+ clusters) split single blocks into fragments.

---

**Central Bangalore forms one giant cluster (hotspot_id=2, 50,623 violations)**
DBSCAN can "chain" through continuously dense areas into one large cluster. The MG Road / Cubbon Park commercial core has uniform high violation density, so it connects into one cluster containing 44% of all approved violations. This is an honest finding, not a bug -- downtown Bangalore is overwhelmingly the highest-pressure zone. The centroid (12.978, 77.588) is the average location, not a single point. Flagged in the app display. Not splitting it further to avoid arbitrary parameter-hacking.

---

**Impact score formula: 0.6 * count_norm + 0.4 * rush_frac**
Two components:
- count_norm: log1p(violation_count) normalized to [0,1] across all hotspots. Log transform prevents the giant downtown cluster from making all others score near zero.
- rush_frac: fraction of a hotspot's violations that fall during is_rush_hour (IST 7-11 or 17-20). Measures how concentrated the hotspot is during congestion windows.
Weights 0.6/0.4: volume matters slightly more than timing, but timing is a meaningful congestion signal.
No vehicle severity component -- deferred per earlier decision.

---

**violations_per_hour: cluster_violations / (span_days * 5)**
span_days computed from actual data: 140.3 days (Nov 9 2023 to Apr 8 2024).
5 enforcement hours/day is observed from the IST hour distribution (IST 7-12 is the dominant enforcement window).
Total enforcement hours = 140.3 * 5 = 702 hours.
violations_per_hour = violation_count / 702.
This is the average rate at which violations occurred per hour of enforcement activity over the full dataset period. It is NOT a peak-hour rate; it is a whole-dataset average.

---

**recommended_officers: ceil(violations_per_hour / 4)**
Officer throughput assumption: 1 officer can process 4 violations per hour (write ticket, document, coordinate tow if needed). THIS IS AN ASSUMPTION. No measured data supports this number. It must be labeled as such in the UI.
Formula: recommended_officers = ceil(violations_per_hour / 4), minimum 1.
Result: top hotspot (downtown, 72 vph) needs 19 officers. Most others need 1-3.
