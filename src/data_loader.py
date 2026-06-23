import json
import pandas as pd
from pathlib import Path
from zoneinfo import ZoneInfo

RAW = Path("data/raw/violations_raw.csv")
OUT = Path("data/clean_violations.parquet")

IST = ZoneInfo("Asia/Kolkata")

RUSH_HOUR_MORNING = (7, 11)
RUSH_HOUR_EVENING = (17, 20)


def load_raw() -> pd.DataFrame:
    return pd.read_csv(RAW, low_memory=False)


def profile(df: pd.DataFrame) -> None:
    print(f"Total rows : {len(df):,}")
    print(f"Columns    : {list(df.columns)}\n")

    print("--- dtypes ---")
    print(df.dtypes.to_string())

    print("\n--- null counts ---")
    null_counts = df.isnull().sum()
    print(null_counts[null_counts > 0].to_string())

    ts = pd.to_datetime(df["created_datetime"], utc=True, errors="coerce")
    print("\n--- created_datetime range (UTC) ---")
    print(f"  min : {ts.min()}")
    print(f"  max : {ts.max()}")

    print("\n--- validation_status ---")
    print(df["validation_status"].value_counts(dropna=False).to_string())

    print("\n--- vehicle_type ---")
    print(df["vehicle_type"].value_counts(dropna=False).head(10).to_string())

    print("\n--- lat/lon bounds ---")
    print(df[["latitude", "longitude"]].describe().to_string())

    print("\n--- violation_type sample (5 rows) ---")
    print(df["violation_type"].dropna().head(5).tolist())

    print("\n--- police_station top 10 ---")
    print(df["police_station"].value_counts().head(10).to_string())


def _parse_violation_type(raw) -> list:
    if pd.isna(raw):
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except (json.JSONDecodeError, TypeError):
        return [str(raw)]


def clean(df: pd.DataFrame) -> pd.DataFrame:
    original_count = len(df)

    approved = df[df["validation_status"] == "approved"].copy()
    removed = original_count - len(approved)
    print(f"\n--- filter: validation_status = approved ---")
    print(f"  kept    : {len(approved):,}")
    print(f"  removed : {removed:,} ({removed/original_count*100:.1f}%)")

    approved["created_datetime"] = pd.to_datetime(
        approved["created_datetime"], utc=True, errors="coerce"
    )
    nat_count = approved["created_datetime"].isna().sum()
    if nat_count:
        print(f"  dropped {nat_count} rows with unparseable created_datetime")
    approved = approved[approved["created_datetime"].notna()]

    approved["latitude"] = pd.to_numeric(approved["latitude"], errors="coerce")
    approved["longitude"] = pd.to_numeric(approved["longitude"], errors="coerce")
    bad_coords = approved["latitude"].isna() | approved["longitude"].isna()
    if bad_coords.sum():
        print(f"  dropped {bad_coords.sum()} rows with invalid coordinates")
    approved = approved[~bad_coords]

    ist_times = approved["created_datetime"].dt.tz_convert(IST)
    approved["hour_ist"] = ist_times.dt.hour
    approved["is_rush_hour"] = approved["hour_ist"].between(
        *RUSH_HOUR_MORNING
    ) | approved["hour_ist"].between(*RUSH_HOUR_EVENING)

    approved["violation_type_list"] = approved["violation_type"].apply(
        _parse_violation_type
    )

    cols = [
        "id",
        "latitude",
        "longitude",
        "vehicle_type",
        "violation_type_list",
        "created_datetime",
        "hour_ist",
        "is_rush_hour",
        "police_station",
        "junction_name",
        "validation_status",
    ]
    cols = [c for c in cols if c in approved.columns]
    result = approved[cols].reset_index(drop=True)

    print(f"\n--- final clean shape ---")
    print(f"  rows : {len(result):,}")
    print(f"  cols : {list(result.columns)}")
    print(f"\n--- hour_ist distribution ---")
    print(result["hour_ist"].value_counts().sort_index().to_string())
    print(f"\n--- rush hour rows ---")
    print(
        f"  {result['is_rush_hour'].sum():,} of {len(result):,} "
        f"({result['is_rush_hour'].mean()*100:.1f}%)"
    )

    return result


def run() -> pd.DataFrame:
    print("=" * 60)
    print("PHASE 2: DATA PROFILE + CLEAN")
    print("=" * 60)
    df = load_raw()
    profile(df)
    clean_df = clean(df)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    clean_df.to_parquet(OUT, index=False)
    print(f"\nSaved to {OUT}")
    return clean_df


if __name__ == "__main__":
    run()
