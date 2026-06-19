import itertools
import json
import math
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.cluster import DBSCAN
from scipy.spatial import ConvexHull

PARQUET = Path("data/clean_violations.parquet")
OUT_JSON = Path("data/processed/hotspots.json")
OUT_PARQUET = Path("data/processed/hotspots.parquet")

WEIGHT_COUNT = 0.5
WEIGHT_RUSH = 0.3
WEIGHT_SEVERITY = 0.2

OFFICER_THROUGHPUT = 4
SHIFT_HOURS = {"morning": 6, "afternoon": 6, "night": 12}

DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
PARTIAL_MONTHS = {"2023-11", "2024-03"}

SEVERITY_WEIGHTS: dict[str, float] = {
    "SCOOTER": 0.2,
    "MOTOR CYCLE": 0.2,
    "MOPED": 0.2,
    "PASSENGER AUTO": 0.4,
    "GOODS AUTO": 0.4,
    "CAR": 0.5,
    "JEEP": 0.5,
    "OTHERS": 0.5,
    "VAN": 0.6,
    "MAXI-CAB": 0.6,
    "LGV": 0.65,
    "TEMPO": 0.65,
    "SCHOOL VEHICLE": 0.7,
    "MINI LORRY": 0.75,
    "PRIVATE BUS": 0.8,
    "BUS (BMTC/KSRTC)": 0.8,
    "TOURIST BUS": 0.8,
    "FACTORY BUS": 0.8,
    "TRACTOR": 0.9,
    "HGV": 1.0,
    "LORRY/GOODS VEHICLE": 1.0,
    "TANKER": 1.0,
}


def get_shift(hour: int) -> str:
    if 6 <= hour < 12:
        return "morning"
    elif 12 <= hour < 18:
        return "afternoon"
    return "night"


def compute_convex_hull(lats: np.ndarray, lons: np.ndarray) -> list[list[float]]:
    coords = np.column_stack([lats, lons])
    unique = np.unique(coords, axis=0)
    if len(unique) < 3:
        return []
    try:
        hull = ConvexHull(coords)
        pts = coords[hull.vertices].tolist()
        pts.append(pts[0])
        return [[round(p[0], 6), round(p[1], 6)] for p in pts]
    except Exception:
        return []


def top_junctions(series: pd.Series, n: int = 5) -> list[dict]:
    cleaned = series.replace("No Junction", np.nan).dropna()
    if cleaned.empty:
        return []
    counts = cleaned.value_counts().head(n)
    total = len(series)
    return [
        {"name": str(j), "count": int(c), "pct": round(int(c) / total, 4)}
        for j, c in counts.items()
    ]


def assign_labels(df: pd.DataFrame, eps: float, min_samples: int) -> np.ndarray:
    labels = DBSCAN(eps=eps, min_samples=min_samples, n_jobs=-1).fit_predict(
        df[["latitude", "longitude"]].values
    )
    return labels


def split_giant_cluster(df: pd.DataFrame, labels: np.ndarray) -> np.ndarray:
    sizes = pd.Series(labels[labels != -1]).value_counts()
    giant_cid = int(sizes.index[0])
    giant_size = int(sizes.iloc[0])
    print(f"Giant cluster: {giant_cid} with {giant_size:,} rows -> sub-clustering")

    c_idx = np.where(labels == giant_cid)[0]
    sub_coords = df.iloc[c_idx][["latitude", "longitude"]].values
    sub_labels = DBSCAN(eps=0.0015, min_samples=50, n_jobs=-1).fit_predict(sub_coords)

    n_sub = len(set(sub_labels)) - (1 if -1 in sub_labels else 0)
    print(f"Sub-clusters produced: {n_sub}, noise discarded: {(sub_labels == -1).sum():,}")

    new_labels = labels.copy()
    max_label = int(labels.max())
    for pos, idx in enumerate(c_idx):
        sl = sub_labels[pos]
        new_labels[idx] = -1 if sl == -1 else max_label + 1 + sl

    return new_labels


def build_hotspots(df: pd.DataFrame, labels: np.ndarray, span_days: float) -> pd.DataFrame:
    df = df.copy()
    df["cluster"] = labels

    rows = []
    for cid, grp in df[df["cluster"] != -1].groupby("cluster"):
        total = len(grp)

        station_series = grp["police_station"].dropna()
        police_station = station_series.mode().iloc[0] if len(station_series) > 0 else "Unknown"
        station_count = int(grp["police_station"].nunique())

        junc_top = top_junctions(grp["junction_name"], n=5)
        junction_name = junc_top[0]["name"] if junc_top else "Unnamed junction"

        sev_series = grp["vehicle_type"].map(SEVERITY_WEIGHTS).fillna(0.5)
        avg_severity = round(float(sev_series.mean()), 4)
        dominant_vehicle_type = grp["vehicle_type"].mode().iloc[0]

        vt_all = list(itertools.chain.from_iterable(grp["violation_type_list"]))
        vt_counts = pd.Series(vt_all).value_counts()
        vt_total = len(vt_all)
        dominant_violation_type = str(vt_counts.index[0])
        vt_filtered = vt_counts[vt_counts / vt_total >= 0.05].head(5)
        violation_type_breakdown = {
            str(vt): {"count": int(c), "pct": round(int(c) / vt_total, 4)}
            for vt, c in vt_filtered.items()
        }

        rush = int(grp["is_rush_hour"].sum())
        rush_frac = round(rush / total, 4)

        shift_counts = grp["shift"].value_counts()
        shift_officers = {}
        for shift, hrs in SHIFT_HOURS.items():
            count = int(shift_counts.get(shift, 0))
            shift_hours = span_days * hrs
            rate = count / shift_hours if shift_hours > 0 else 0.0
            shift_officers[shift] = {
                "violation_count": count,
                "pct": round(count / total, 4),
                "rate_per_hour": round(rate, 4),
                "recommended_officers": max(1, math.ceil(rate / OFFICER_THROUGHPUT)),
            }

        peak_shift = max(shift_officers, key=lambda s: shift_officers[s]["violation_count"])

        ist = grp["dt_ist"]
        dow_counts = ist.dt.day_name().value_counts().reindex(DOW_ORDER).fillna(0).astype(int)
        day_of_week_distribution = {d: int(c) for d, c in dow_counts.items()}
        peak_day = str(dow_counts.idxmax())

        hc = ist.dt.hour.value_counts().sort_index()
        hour_distribution = {str(h): int(hc.get(h, 0)) for h in range(24)}
        peak_hour = int(hc.idxmax())

        mc = ist.dt.strftime("%Y-%m").value_counts().sort_index()
        monthly_trend = {m: int(c) for m, c in mc.items()}

        hull_pts = compute_convex_hull(
            grp["latitude"].values, grp["longitude"].values
        )

        rows.append({
            "hotspot_id": int(cid),
            "lat": round(float(grp["latitude"].mean()), 6),
            "lon": round(float(grp["longitude"].mean()), 6),
            "lat_spread": round(float(grp["latitude"].std()), 6),
            "lon_spread": round(float(grp["longitude"].std()), 6),
            "violation_count": total,
            "rush_violations": rush,
            "rush_frac": rush_frac,
            "violations_per_hour": round(total / (span_days * 5), 4),
            "police_station": police_station,
            "station_count": station_count,
            "junction_name": junction_name,
            "top_junctions": junc_top,
            "avg_severity": avg_severity,
            "dominant_vehicle_type": dominant_vehicle_type,
            "dominant_violation_type": dominant_violation_type,
            "violation_type_breakdown": violation_type_breakdown,
            "shift_breakdown": shift_officers,
            "peak_shift": peak_shift,
            "day_of_week_distribution": day_of_week_distribution,
            "peak_day": peak_day,
            "hour_distribution": hour_distribution,
            "peak_hour": peak_hour,
            "monthly_trend": monthly_trend,
            "hull": hull_pts,
        })

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

    hs["recommended_officers"] = hs["shift_breakdown"].apply(
        lambda s: s["morning"]["recommended_officers"]
    )

    hs["score_breakdown"] = hs.apply(
        lambda r: {
            "violation_count": r["violation_count"],
            "count_norm": round(r["count_norm"], 4),
            "rush_violations": r["rush_violations"],
            "rush_frac": round(r["rush_frac"], 4),
            "avg_severity": round(r["avg_severity"], 4),
            "severity_norm": round(r["severity_norm"], 4),
            "formula": f"{WEIGHT_COUNT} * count_norm + {WEIGHT_RUSH} * rush_frac + {WEIGHT_SEVERITY} * severity_norm",
        },
        axis=1,
    )

    return hs.sort_values("impact_score", ascending=False).reset_index(drop=True)


def simulate_allocation(df: pd.DataFrame, available_officers: int, available_trucks: int) -> pd.DataFrame:
    remaining_officers = available_officers
    remaining_trucks = available_trucks
    rows = []
    for rank, (_, row) in enumerate(df.iterrows(), start=1):
        needed = int(row["recommended_officers"])
        if remaining_officers >= needed:
            assigned = needed
            remaining_officers -= needed
            status = "Covered"
        elif remaining_officers > 0:
            assigned = remaining_officers
            remaining_officers = 0
            status = "Partial"
        else:
            assigned = 0
            status = "Uncovered"

        truck = remaining_trucks > 0 and status != "Uncovered"
        if truck:
            remaining_trucks -= 1

        rows.append({
            "rank": rank,
            "hotspot_id": int(row["hotspot_id"]),
            "impact_score": float(row["impact_score"]),
            "violation_count": int(row["violation_count"]),
            "officers_needed": needed,
            "officers_assigned": assigned,
            "tow_truck": truck,
            "status": status,
        })
    return pd.DataFrame(rows)


def run(eps: float = 0.003, min_samples: int = 50) -> pd.DataFrame:
    df = pd.read_parquet(PARQUET)
    print(f"Loaded {len(df):,} rows")

    df["dt_ist"] = df["created_datetime"].dt.tz_convert("Asia/Kolkata")
    df["shift"] = df["hour_ist"].apply(get_shift)

    unmapped = ~df["vehicle_type"].isin(SEVERITY_WEIGHTS)
    if unmapped.sum() > 0:
        print(f"WARNING: {unmapped.sum():,} rows unmapped in SEVERITY_WEIGHTS (defaulted to 0.5)")
    else:
        print("Severity: all vehicle_type values mapped")

    span_days = (
        df["created_datetime"].max() - df["created_datetime"].min()
    ).total_seconds() / 86400
    print(f"Span: {span_days:.1f} days")

    labels = assign_labels(df, eps, min_samples)
    labels = split_giant_cluster(df, labels)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()
    print(f"Final clusters: {n_clusters}")
    print(f"Noise points: {n_noise:,} ({n_noise / len(labels) * 100:.1f}%)")

    hs = build_hotspots(df, labels, span_days)

    print(f"\nTop 10 hotspots:")
    print(hs[["hotspot_id", "lat", "lon", "impact_score", "violation_count", "peak_shift"]].head(10).to_string(index=False))

    OUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    hs.to_parquet(OUT_PARQUET, index=False)

    handoff_cols = [
        "hotspot_id", "lat", "lon", "lat_spread", "lon_spread",
        "impact_score", "score_breakdown",
        "violation_count", "violations_per_hour", "recommended_officers",
        "police_station", "junction_name", "station_count", "top_junctions",
        "severity_norm", "dominant_vehicle_type", "dominant_violation_type",
        "violation_type_breakdown", "shift_breakdown", "peak_shift",
        "day_of_week_distribution", "peak_day",
        "hour_distribution", "peak_hour",
        "monthly_trend", "hull",
    ]
    handoff = hs[handoff_cols].copy()

    for col in ["score_breakdown", "violation_type_breakdown", "shift_breakdown",
                "top_junctions", "day_of_week_distribution", "hour_distribution",
                "monthly_trend", "hull"]:
        handoff[col] = handoff[col].apply(json.dumps)

    handoff.to_json(OUT_JSON, orient="records", indent=2)
    print(f"\nSaved {len(hs)} hotspots to {OUT_JSON}")
    return hs


if __name__ == "__main__":
    run()
