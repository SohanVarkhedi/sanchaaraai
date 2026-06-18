import json
import pandas as pd
import folium
import streamlit as st
from streamlit_folium import st_folium
from src.hotspot_engine import simulate_allocation, OFFICER_THROUGHPUT

st.set_page_config(
    page_title="ParkPulse AI",
    page_icon="P",
    layout="wide",
)

HOTSPOTS_PATH = "data/processed/hotspots.json"
BANGALORE_CENTER = [12.9716, 77.5946]
CENTRAL_CLUSTER_ID = 2


@st.cache_data
def load_hotspots() -> pd.DataFrame:
    with open(HOTSPOTS_PATH) as f:
        records = json.load(f)
    df = pd.DataFrame(records)
    breakdown = df["score_breakdown"].apply(
        lambda x: json.loads(x) if isinstance(x, str) else x
    )
    df["violation_count"] = breakdown.apply(lambda x: int(x["violation_count"]))
    df["rush_frac"] = breakdown.apply(lambda x: round(float(x["rush_frac"]), 3))
    df["count_norm"] = breakdown.apply(lambda x: round(float(x["count_norm"]), 3))
    return df.sort_values("impact_score", ascending=False).reset_index(drop=True)


def _score_color(score: float) -> str:
    r = 232
    g = int(200 * (1 - score))
    b = int(85 * (1 - score))
    return f"#{r:02x}{max(0,g):02x}{max(0,b):02x}"


def _build_map(df: pd.DataFrame) -> folium.Map:
    m = folium.Map(location=BANGALORE_CENTER, zoom_start=12, tiles="CartoDB dark_matter")
    for _, row in df.iterrows():
        score = float(row["impact_score"])
        color = _score_color(score)
        radius = 5 + 22 * score

        note = (
            "<br><i style='color:#aaa'>Spans wider Cubbon Park / City Market /"
            " Majestic commercial core -- DBSCAN merged adjacent dense blocks.</i>"
            if row["hotspot_id"] == CENTRAL_CLUSTER_ID
            else ""
        )
        popup_html = (
            f"<b>Hotspot #{int(row['hotspot_id'])}</b>{note}<br>"
            f"Impact score: <b>{score:.3f}</b><br>"
            f"Violations: {int(row['violation_count']):,}<br>"
            f"Rush-hour share: {row['rush_frac']*100:.1f}%<br>"
            f"Violations/hr: {float(row['violations_per_hour']):.2f}<br>"
            f"Officers recommended: <b>{int(row['recommended_officers'])}</b>"
        )
        tooltip = (
            f"#{int(row['hotspot_id'])} | score {score:.2f} | "
            f"{int(row['violation_count']):,} violations"
        )
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=radius,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.75,
            weight=1,
            tooltip=tooltip,
            popup=folium.Popup(popup_html, max_width=280),
        ).add_to(m)
    return m


def page_map(df: pd.DataFrame) -> None:
    st.header("Hotspot Map")
    st.caption(
        "101 parking violation hotspots detected via DBSCAN clustering on 115,400 approved records "
        "(Nov 2023 - Apr 2024). Marker size and color scale with impact score."
    )

    col_a, col_b, col_c = st.columns(3)
    col_a.metric("Hotspots detected", len(df))
    col_b.metric("Top hotspot score", f"{df['impact_score'].max():.3f}")
    col_c.metric("Total violations mapped", f"{df['violation_count'].sum():,}")

    m = _build_map(df)
    st_folium(m, use_container_width=True, height=560, returned_objects=[])


def page_priority_list(df: pd.DataFrame) -> None:
    st.header("Priority List")
    st.caption(
        "Hotspots ranked by impact score (0.6 x count_norm + 0.4 x rush_frac). "
        "Score breakdown columns show each component. "
        "Rush-hour signal is morning-dominant (IST 7-12); evening data is sparse in this dataset."
    )

    display = df[
        [
            "hotspot_id",
            "impact_score",
            "violation_count",
            "count_norm",
            "rush_frac",
            "violations_per_hour",
            "recommended_officers",
        ]
    ].copy()
    display.index = range(1, len(display) + 1)
    display.index.name = "rank"

    display = display.rename(
        columns={
            "hotspot_id": "Hotspot ID",
            "impact_score": "Impact Score",
            "violation_count": "Violations",
            "count_norm": "Count Norm",
            "rush_frac": "Rush-Hr Frac",
            "violations_per_hour": "Viol/Hr",
            "recommended_officers": "Officers Rec.",
        }
    )

    st.dataframe(
        display.style.background_gradient(subset=["Impact Score"], cmap="YlOrRd"),
        use_container_width=True,
        height=600,
    )

    st.caption(
        "Count Norm: log-normalized violation volume (0-1). Rush-Hr Frac: share of violations "
        "during IST 7-11 or 17-20. Viol/Hr: cluster violations / 702 enforcement hours (140 days x 5 hrs/day). "
        "Officers Rec. assumes 4 violations/officer/hour -- labeled as an assumption, not a measurement."
    )


def page_simulator(df: pd.DataFrame) -> None:
    st.header("Resource Simulator")
    st.caption(
        "Allocate available officers top-down by impact score until the pool is exhausted. "
        "Shows which hotspots are covered, partially covered, or left uncovered. "
        "No estimated improvement percentages -- coverage and gaps only."
    )

    col_left, col_right = st.columns([1, 3])
    with col_left:
        st.subheader("Available Resources")
        officers = st.number_input(
            "Officers available", min_value=1, max_value=500, value=30, step=1
        )
        trucks = st.number_input(
            "Tow trucks available", min_value=0, max_value=100, value=5, step=1
        )
        st.caption("Officers allocated greedily from rank 1 downward. Tow trucks assigned 1 per covered hotspot.")

    result = simulate_allocation(df, int(officers), int(trucks))

    def _display(raw: pd.DataFrame) -> pd.DataFrame:
        return raw.rename(
            columns={
                "rank": "Rank",
                "hotspot_id": "Hotspot ID",
                "impact_score": "Impact Score",
                "violation_count": "Violations",
                "officers_needed": "Officers Needed",
                "officers_assigned": "Officers Assigned",
                "tow_truck": "Tow Truck",
                "status": "Status",
            }
        ).assign(**{"Tow Truck": lambda d: d["Tow Truck"].map({True: "Yes", False: "No"})}).set_index("Rank")

    covered = result[result["status"] == "Covered"]
    partial = result[result["status"] == "Partial"]
    uncovered = result[result["status"] == "Uncovered"]

    with col_right:
        s1, s2, s3, s4 = st.columns(4)
        s1.metric("Covered", len(covered))
        s2.metric("Partial", len(partial))
        s3.metric("Uncovered", len(uncovered))
        s4.metric(
            "Officers deployed",
            int(result["officers_assigned"].sum()),
            delta=f"{int(officers) - int(result['officers_assigned'].sum())} unused",
        )

        st.caption(
            f"Assumption: 1 officer processes {OFFICER_THROUGHPUT} violations/hour. "
            "Officers Needed = ceil(violations_per_hour / 4). "
            "This throughput figure is an operational assumption, not a measured value."
        )

        if not covered.empty:
            st.subheader("Covered hotspots")
            st.dataframe(_display(covered), use_container_width=True)

        if not partial.empty:
            st.subheader("Partially covered (officers ran out mid-allocation)")
            st.dataframe(_display(partial), use_container_width=True)

        if not uncovered.empty:
            st.subheader("Uncovered hotspots")
            st.dataframe(
                _display(uncovered)[["Hotspot ID", "Impact Score", "Violations", "Officers Needed"]],
                use_container_width=True,
            )


def main() -> None:
    st.sidebar.title("PARKPULSE AI")
    st.sidebar.caption("Decision Support System\nParking-Induced Congestion -- Bangalore")
    st.sidebar.divider()
    page = st.sidebar.radio("Navigate", ["Map", "Priority List", "Simulator"])
    st.sidebar.divider()
    st.sidebar.caption(
        "Data: 115,400 approved parking violations\n"
        "Period: Nov 2023 - Apr 2024\n"
        "Hotspots: 101 (DBSCAN eps=0.003)\n"
        "Rush-hour signal: morning IST 7-12"
    )

    df = load_hotspots()

    if page == "Map":
        page_map(df)
    elif page == "Priority List":
        page_priority_list(df)
    else:
        page_simulator(df)


main()
