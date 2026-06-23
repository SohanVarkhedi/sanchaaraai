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
hotspot_id, lat, lon, impact_score, score_breakdown, violations_per_hour, recommended_officers,
police_station, junction_name, station_count, severity_norm, dominant_vehicle_type,
dominant_violation_type, violation_type_breakdown,
day_of_week_distribution, peak_day, hour_distribution, peak_hour, monthly_trend, trend_direction
```
score_breakdown is a JSON string with keys:
  violation_count, count_norm, rush_violations, rush_frac,
  avg_severity, severity_norm, formula
police_station: most frequent (mode) police station within the cluster's rows; single string.
junction_name: most frequent non-null junction_name within the cluster; falls back to "Unnamed junction" if all rows are null.
station_count: integer count of distinct police_station values in the cluster. Used by the UI to flag clusters that span multiple jurisdictions (station_count > 1). The filter uses only police_station (the top station), not the full list.
severity_norm: cluster's average SEVERITY_WEIGHTS score, normalized 0-1 across all hotspots. ASSUMPTION -- see severity weights entry below.
dominant_vehicle_type: mode vehicle_type in the cluster; shown directly in the UI as a quick label.
dominant_violation_type: mode violation type across all exploded violation_type_list entries in the cluster.
violation_type_breakdown: JSON string mapping violation type → {count, pct} for types ≥5% share, capped at top 5.
  count = occurrences after exploding violation_type_list; pct = count / total exploded entries in cluster.
  Serialized as a JSON string in the handoff file (same pattern as score_breakdown).
day_of_week_distribution: JSON string {day_name: count} Monday-Sunday (IST). All 7 days present; zeros filled.
peak_day: string day name with highest violation count in the cluster.
hour_distribution: JSON string {str(hour): count} for hours 0-23 IST. All 24 hours present; zeros filled.
peak_hour: integer IST hour with highest violation count in the cluster.
monthly_trend: JSON string {YYYY-MM: count} for each calendar month present in the cluster (IST).
trend_direction: string "increasing" / "decreasing" / "stable" — see trend direction calculation in decisions.md.

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

**Actual date range: Nov 10 2023 to Mar 29 2024 IST (filename is misleading)**
The source CSV is named "jan to may" but the actual data spans Nov 2023 - Mar 2024 in IST. UTC min is Nov 9, UTC max is Mar 29 — after IST conversion (+5:30) the IST range is Nov 10 to Mar 29. Do not cite "Jan-May" or "Apr 8" in the demo. Use the confirmed range: Nov 2023 – Mar 2024.

---

**Temporal pattern fields added to handoff (Phase 8)**
Six new fields per hotspot computed from created_datetime values within each cluster:
- day_of_week_distribution: {day_name: count} for Monday-Sunday (IST day). Stored as JSON string.
- peak_day: day name with highest violation count (mode day).
- hour_distribution: {str(0..23): count} for each IST hour. Stored as JSON string. Zeros included for all 24 hours.
- peak_hour: integer IST hour with highest count.
- monthly_trend: {YYYY-MM: count} for each calendar month present in the cluster. Stored as JSON string.
- trend_direction: "increasing" / "decreasing" / "stable" — see calculation below.

Partial months (fewer calendar days in dataset than a full month):
- 2023-11: starts Nov 10 IST (21 of 30 days). Raw counts are ~30% lower than a full November would be.
- 2024-03: ends Mar 29 IST (28 of 31 days). Raw counts slightly understated.
- 2024-02 and 2024-03 have dramatically sparse enforcement data city-wide (1,719 and 7,038 records vs ~38,000/month in Dec–Jan). This is an enforcement reporting gap, not a proven decline in parking violations. The UI notes this explicitly and avoids implying a real trend.

Trend direction calculation:
- Midpoint: dataset IST min (Nov 10) + half of total span (140.3 days / 2 = 70.2 days) = Jan 19, 2024.
- First-half count: violations in that cluster before Jan 19, 2024 IST.
- Second-half count: violations on or after Jan 19, 2024 IST.
- Daily rates: fh_rate = fh_count / 70.2; sh_rate = sh_count / 70.2.
- Ratio = sh_rate / fh_rate. If ratio > 1.10: "increasing". If ratio < 0.90: "decreasing". Else: "stable".
- This is a simple observed ratio on recorded violations, NOT a forecast. 99 of 101 hotspots are "decreasing" in this dataset due to the Feb–Mar reporting gap. The UI explicitly warns against interpreting this as a real enforcement trend.

City-wide day-of-week finding:
- No sharp weekday/weekend cliff. Sunday (18,129) and Thursday (19,164) are highest; Monday (12,073) is lowest.
- Weekend avg/day (17,540) marginally exceeds weekday avg/day (16,064).
- The Monday dip is partly a data artifact: the dataset has fewer Mondays in its 140-day window.
- Per-hotspot day-of-week breakdown is informative — different zones show different peaks.

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

---

**Vehicle severity weights: ASSUMPTION, not measured**
Verified data first: profiled vehicle_type across all 115,400 clean rows. Found 22 distinct values, 0 nulls, 0 blanks. All 22 are explicitly mapped.
Severity weights (0.0 = easiest to relocate, 1.0 = hardest / greatest lane blockage):
  SCOOTER, MOTOR CYCLE, MOPED          → 0.2  (smallest footprint, easiest to move)
  PASSENGER AUTO, GOODS AUTO           → 0.4  (three-wheelers, compact)
  CAR, JEEP, OTHERS                    → 0.5  (baseline; OTHERS is unknown, neutral)
  VAN, MAXI-CAB                        → 0.6  (larger passenger/goods carriers)
  LGV, TEMPO                           → 0.65 (Light Goods Vehicle class)
  SCHOOL VEHICLE                       → 0.7  (variable; van or bus)
  MINI LORRY                           → 0.75 (between LGV and full lorry)
  PRIVATE BUS, BUS (BMTC/KSRTC), TOURIST BUS, FACTORY BUS → 0.8 (full-size buses)
  TRACTOR                              → 0.9  (large, slow, difficult to tow)
  HGV, LORRY/GOODS VEHICLE, TANKER     → 1.0  (maximum severity)
Any vehicle_type not in this map defaults to 0.5 at compute time (0 rows affected in current dataset).
Impact score formula updated to: 0.5 × count_norm + 0.3 × rush_frac + 0.2 × severity_norm
(was: 0.6 × count_norm + 0.4 × rush_frac before severity was added)
severity_norm: per-cluster average of SEVERITY_WEIGHTS values, normalized 0-1 across all 101 hotspots.

---

**Simulator scope follows the station filter (fix applied post-launch)**
Original implementation passed the unfiltered city-wide df to page_simulator even when a station was selected. Fixed to pass filtered_df consistently.
When "All stations" is selected, the simulator allocates officers across all 101 city-wide hotspots (unchanged behavior).
When a specific station is selected, the simulator allocates only among that station's hotspots, representing that station's own officer pool deployed within its own jurisdiction. This is the more realistic use case for an individual station-level commander, not a bug in the filter, which is why it is the correct fix rather than just a consistency patch.
The default of 30 officers is kept as-is: it is illustrative and the user is expected to adjust it. No per-station staffing figure is invented.
