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
