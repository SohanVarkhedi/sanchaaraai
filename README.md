# PARKPULSE AI

A decision support system that turns parking violation records into ranked enforcement hotspots, officer allocation recommendations, and a resource simulator -- so police can do more with limited staff.

## Pitch

Traffic enforcement in Bangalore is reactive and spread thin -- officers are dispatched by intuition, not data, leaving the highest-impact parking violation zones chronically underserved. ParkPulse AI clusters 115,400 real enforcement records into 101 geographic hotspots, scores each by violation volume and rush-hour concentration, and simulates how a limited officer pool should be allocated to maximize coverage of the most dangerous zones. Built on real Bangalore data (Nov 2023 - Apr 2024) with a two-component explainable impact score and honest gap reporting -- no fabricated improvement percentages anywhere in the output.

## Problem

Illegal parking in dense urban areas blocks traffic, creates congestion, and slows emergency response. Enforcement is reactive and spread thin. Officers are dispatched by intuition, not data. The result: high-impact zones go underserved while low-impact zones get equal attention.

## What It Does

1. Clusters real violation records into geographic hotspots using DBSCAN.
2. Scores each hotspot by violation density and rush-hour concentration.
3. Ranks hotspots into a priority list with an explainable breakdown.
4. Recommends officer count per hotspot based on violations-per-hour math.
5. Runs a simulator: given N officers and M tow trucks, show what gets covered and what does not.

## Tech Stack

- Python, pandas, scikit-learn (DBSCAN)
- Streamlit (UI + deployment)
- Folium / streamlit-folium (map)
- Streamlit Cloud (hosting)

## Dataset

Bangalore parking violations, Nov 2023 to Apr 2024. 298,450 raw records, 115,400 approved and used for analysis. Columns include: lat/lon, timestamp, violation type, vehicle type, police station, validation status.

## How to Run

```bash
git clone https://github.com/SohanVarkhedi/parkpulseai.git
cd parkpulseai
pip install -r requirements.txt
streamlit run app.py
```

## Ownership

| Area | Owner |
|---|---|
| Data loading, cleaning, profiling | Person A |
| DBSCAN clustering | Person A |
| Impact scoring formula | Person A |
| Officer capacity math | Person A |
| Handoff dataframe / JSON | Person A |
| Streamlit app shell | Person B |
| Map screen | Person B |
| Ranked priority table | Person B |
| Simulator UI | Person B |
| Deployment (Streamlit Cloud) | Person B |

## Handoff Contract

Person A outputs a dataframe / JSON with exactly these columns:

```
hotspot_id, lat, lon, impact_score, score_breakdown, violations_per_hour, recommended_officers
```

Person B builds the UI against this shape. Do not change column names without telling both people.
