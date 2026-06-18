import itertools
import json
import math
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.cluster import DBSCAN

PARQUET = Path("data/clean_violations.parquet")
OUT_JSON = Path("data/processed/hotspots.json")
OUT_PARQUET = Path("data/processed/hotspots.parquet")

WEIGHT_COUNT = 0.5      # was 0.6 before severity component was added
WEIGHT_RUSH = 0.3       # was 0.4 before severity component was added
WEIGHT_SEVERITY = 0.2   # ASSUMPTION -- see docs/decisions.md for weight rationale

OFFICER_THROUGHPUT = 4  # violations per officer per hour -- ASSUMPTION, not measured
ENFORCEMENT_HOURS_PER_DAY = 5  # observed: IST 7-12 is dominant enforcement window

# Vehicle severity weights: 0=easiest to relocate, 1=hardest. ASSUMPTION, not measured.
# Larger/heavier vehicles score higher. All 22 distinct values found in the dataset are mapped.
# Any unknown value defaults to 0.5 (neutral) at compute time via .fillna(0.5).
SEVERITY_WEIGHTS: dict[str, float] = {
    "SCOOTER":             0.2,
    "MOTOR CYCLE":         0.2,
    "MOPED":               0.2,
    "PASSENGER AUTO":      0.4,
    "GOODS AUTO":          0.4,
    "CAR":                 0.5,
    "JEEP":                0.5,
    "OTHERS":              0.5,
    "VAN":                 0.6,
    "MAXI-CAB":            0.6,
    "LGV":                 0.65,
    "TEMPO":               0.65,
    "SCHOOL VEHICLE":      0.7,
    "MINI LORRY":          0.75,
    "PRIVATE BUS":         0.8,
    "BUS (BMTC/KSRTC)":   0.8,
    "TOURIST BUS":         0.8,
    "FACTORY BUS":         0.8,
    "TRACTOR":             0.9,
    "HGV":                 1.0,
    "LORRY/GOODS VEHICLE": 1.0,
    "TANKER":              1.0,
}


def tune_dbscan(coords: np.ndarray) -> None:
    print(f"\n{'eps':>8} {'min_s':>8} {'clusters':>10} {'noise_pts':>12} {'noise%':>8}")
    print("-" * 52)
    for eps in [0.001, 0.002, 0.003, 0.005]:
        for min_s in [20, 50, 100]:
            labels = DBSCAN(eps=eps, min_samples=min_s, n_jobs=-1).fit_predict(coords)
            n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
            n_noise = (labels == -1).sum()
            pct = n_noise / len(labels) * 100
            print(f"{eps:>8.3f} {min_s:>8} {n_clusters:>10} {n_noise:>12,} {pct:>7.1f}%")


def build_hotspots(
    df: pd.DataFrame, labels: np.ndarray, enforcement_hours: float
) -> pd.DataFrame:
    df = df.copy()
    df["cluster"] = labels

    rows = []
    for cid, grp in df[df["cluster"] != -1].groupby("cluster"):
        total = len(grp)
        rush = int(grp["is_rush_hour"].sum())
        station_series = grp["police_station"].dropna()
        police_station = station_series.mode().iloc[0] if len(station_series) > 0 else "Unknown"
        station_count = int(grp["police_station"].nunique())

        junc_series = grp["junction_name"].dropna()
        junction_name = junc_series.mode().iloc[0] if len(junc_series) > 0 else "Unnamed junction"

        sev_series = grp["vehicle_type"].map(SEVERITY_WEIGHTS).fillna(0.5)
        avg_severity = round(float(sev_series.mean()), 4)
        dominant_vehicle_type = grp["vehicle_type"].mode().iloc[0]

        vt_all = list(itertools.chain.from_iterable(grp["violation_type_list"]))
        vt_counts = pd.Series(vt_all).value_counts()
        vt_total = len(vt_all)
        dominant_violation_type = str(vt_counts.index[0])
        vt_filtered = vt_counts[vt_counts / vt_total >= 0.05].head(5)
        violation_type_breakdown = {
            str(vtype): {"count": int(cnt), "pct": round(int(cnt) / vt_total, 4)}
            for vtype, cnt in vt_filtered.items()
        }

        rows.append(
            {
                "hotspot_id": int(cid),
                "lat": round(float(grp["latitude"].mean()), 6),
                "lon": round(float(grp["longitude"].mean()), 6),
                "violation_count": total,
                "rush_violations": rush,
                "rush_frac": round(rush / total, 4),
                "violations_per_hour": round(total / enforcement_hours, 4),
                "police_station": police_station,
                "junction_name": junction_name,
                "station_count": station_count,
                "avg_severity": avg_severity,
                "dominant_vehicle_type": dominant_vehicle_type,
                "dominant_violation_type": dominant_violation_type,
                "violation_type_breakdown": violation_type_breakdown,
            }
        )

    hs = pd.DataFrame(rows)

    log_c = np.log1p(hs["violation_count"])
    hs["count_norm"] = ((log_c - log_c.min()) / (log_c.max() - log_c.min())).round(4)

    sev = hs["avg_severity"]
    sev_range = sev.max() - sev.min()
    hs["severity_norm"] = (
        ((sev - sev.min()) / sev_range).round(4)
        if sev_range > 0
        else pd.Series([0.5] * len(hs), index=hs.index)
    )

    hs["impact_score"] = (
        WEIGHT_COUNT * hs["count_norm"]
        + WEIGHT_RUSH * hs["rush_frac"]
        + WEIGHT_SEVERITY * hs["severity_norm"]
    ).round(4)

    hs["recommended_officers"] = hs["violations_per_hour"].apply(
        lambda x: max(1, math.ceil(x / OFFICER_THROUGHPUT))
    )

    hs["score_breakdown"] = hs.apply(
        lambda r: {
            "violation_count": r["violation_count"],
            "count_norm": round(r["count_norm"], 4),
            "rush_violations": r["rush_violations"],
            "rush_frac": round(r["rush_frac"], 4),
            "avg_severity": round(r["avg_severity"], 4),
            "severity_norm": round(r["severity_norm"], 4),
            "formula": (
                f"{WEIGHT_COUNT} * count_norm"
                f" + {WEIGHT_RUSH} * rush_frac"
                f" + {WEIGHT_SEVERITY} * severity_norm"
            ),
        },
        axis=1,
    )

    return hs.sort_values("impact_score", ascending=False).reset_index(drop=True)


def simulate_allocation(
    df: pd.DataFrame, available_officers: int, available_trucks: int
) -> pd.DataFrame:
    """
    Greedy top-down officer allocation by impact_score rank.
    df must be sorted by impact_score descending (as produced by run()).
    Returns one row per hotspot with status: Covered / Partial / Uncovered.
    Tow trucks are assigned one per covered or partially covered hotspot until exhausted.
    """
    remaining_officers = available_officers
    remaining_trucks = available_trucks
    rows = []
    for rank, (_, row) in enumerate(df.iterrows(), start=1):
        needed = int(row["recommended_officers"])
        if remaining_officers >= needed:
            assigned, remaining_officers, status = needed, remaining_officers - needed, "Covered"
        elif remaining_officers > 0:
            assigned, remaining_officers, status = remaining_officers, 0, "Partial"
        else:
            assigned, status = 0, "Uncovered"

        truck_assigned = remaining_trucks > 0 and status != "Uncovered"
        if truck_assigned:
            remaining_trucks -= 1

        rows.append(
            {
                "rank": rank,
                "hotspot_id": int(row["hotspot_id"]),
                "impact_score": float(row["impact_score"]),
                "violation_count": int(row["violation_count"]),
                "officers_needed": needed,
                "officers_assigned": assigned,
                "tow_truck": truck_assigned,
                "status": status,
            }
        )
    return pd.DataFrame(rows)


def run(eps: float, min_samples: int) -> pd.DataFrame:
    df = pd.read_parquet(PARQUET)
    print(f"Loaded {len(df):,} rows")

    unmapped_mask = ~df["vehicle_type"].isin(SEVERITY_WEIGHTS)
    n_unmapped = int(unmapped_mask.sum())
    if n_unmapped > 0:
        print(f"WARNING: {n_unmapped:,} rows have vehicle_type not in SEVERITY_WEIGHTS (defaulted to 0.5):")
        print(df.loc[unmapped_mask, "vehicle_type"].value_counts().to_string())
    else:
        print(f"Severity: all {df['vehicle_type'].nunique()} vehicle_type values mapped, 0 rows defaulted to 0.5")

    span_days = (
        df["created_datetime"].max() - df["created_datetime"].min()
    ).total_seconds() / 86400
    enforcement_hours = span_days * ENFORCEMENT_HOURS_PER_DAY
    print(
        f"Span: {span_days:.1f} days x {ENFORCEMENT_HOURS_PER_DAY} hrs/day "
        f"= {enforcement_hours:.0f} enforcement hours"
    )

    coords = df[["latitude", "longitude"]].values

    print(f"\nRunning DBSCAN eps={eps}, min_samples={min_samples}")
    labels = DBSCAN(eps=eps, min_samples=min_samples, n_jobs=-1).fit_predict(coords)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()
    print(f"Clusters  : {n_clusters}")
    print(f"Noise pts : {n_noise:,} ({n_noise / len(labels) * 100:.1f}% of rows)")

    hs = build_hotspots(df, labels, enforcement_hours)

    display = [
        "hotspot_id", "lat", "lon", "impact_score",
        "violation_count", "rush_frac", "violations_per_hour", "recommended_officers",
    ]
    print(f"\nTop 10 hotspots by impact_score:")
    print(hs[display].head(10).to_string(index=False))

    OUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    hs.to_parquet(OUT_PARQUET, index=False)

    handoff = hs[
        ["hotspot_id", "lat", "lon", "impact_score",
         "score_breakdown", "violations_per_hour", "recommended_officers",
         "police_station", "junction_name", "station_count",
         "severity_norm", "dominant_vehicle_type",
         "dominant_violation_type", "violation_type_breakdown"]
    ].copy()
    handoff["score_breakdown"] = handoff["score_breakdown"].apply(json.dumps)
    handoff["violation_type_breakdown"] = handoff["violation_type_breakdown"].apply(json.dumps)
    handoff.to_json(OUT_JSON, orient="records", indent=2)

    print(f"\nSaved {len(hs)} hotspots to data/processed/")
    return hs
