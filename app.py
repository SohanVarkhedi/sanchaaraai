import json
import pandas as pd
import folium
import streamlit as st
from streamlit_folium import st_folium
from src.hotspot_engine import simulate_allocation, OFFICER_THROUGHPUT
from src.i18n import t

st.set_page_config(
    page_title="ParkPulse AI",
    page_icon="P",
    layout="wide",
)

HOTSPOTS_PATH = "data/processed/hotspots.json"
BANGALORE_CENTER = [12.9716, 77.5946]
CENTRAL_CLUSTER_ID = 2

LEGEND_HTML = """
<div style="display:flex;align-items:center;gap:12px;padding:6px 0 2px 0;font-size:0.82em;color:#bbb;">
  <span>Low impact</span>
  <div style="width:160px;height:10px;border-radius:5px;
              background:linear-gradient(to right,#e8c855,#e80000);flex-shrink:0;"></div>
  <span>High impact</span>
  <span style="margin-left:18px;color:#888;">
    Marker color and size both scale with impact score (radius&nbsp;=&nbsp;5&nbsp;+&nbsp;22&nbsp;&times;&nbsp;score)
  </span>
</div>
"""


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


def page_map(df: pd.DataFrame, lang: str) -> None:
    st.header(t("map_header", lang))
    st.caption(
        "101 parking violation hotspots detected via DBSCAN clustering on 115,400 approved "
        "records (Nov 2023 - Apr 2024). Click any marker for the full breakdown."
    )

    col_a, col_b, col_c = st.columns(3)
    col_a.metric(t("hotspots_detected", lang), len(df))
    col_b.metric(t("top_hotspot_score", lang), f"{df['impact_score'].max():.3f}")
    col_c.metric(t("total_violations_mapped", lang), f"{df['violation_count'].sum():,}")

    st.markdown("&nbsp;", unsafe_allow_html=True)
    m = _build_map(df)
    st_folium(m, use_container_width=True, height=560, returned_objects=[])
    st.markdown(LEGEND_HTML, unsafe_allow_html=True)


def page_priority_list(df: pd.DataFrame, lang: str) -> None:
    st.header(t("priority_list_header", lang))
    st.caption(
        "Hotspots ranked by impact score (0.6 x count_norm + 0.4 x rush_frac). "
        "Rush-hour signal is morning-dominant (IST 7-12); evening data is sparse in this dataset."
    )

    rec_col = t("recommended_officers", lang)

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
            "recommended_officers": rec_col,
        }
    )

    styled = (
        display.style
        .format(
            {
                "Impact Score": "{:.4f}",
                "Violations": "{:,.0f}",
                "Count Norm": "{:.3f}",
                "Rush-Hr Frac": "{:.3f}",
                "Viol/Hr": "{:.2f}",
                rec_col: "{:.0f}",
            }
        )
        .background_gradient(subset=["Impact Score"], cmap="YlOrRd")
    )

    st.dataframe(styled, use_container_width=True, height=600)

    st.caption(
        "Count Norm: log-normalized violation volume (0-1). "
        "Rush-Hr Frac: share of violations during IST 7-11 or 17-20. "
        "Viol/Hr: cluster violations / 702 enforcement hours (140 days x 5 hrs/day). "
        f"{rec_col}: ceil(Viol/Hr / 4) -- officer throughput of 4 vph is an assumption, not a measurement."
    )


def _display_sim(raw: pd.DataFrame) -> pd.DataFrame:
    return (
        raw.rename(
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
        )
        .assign(**{"Tow Truck": lambda d: d["Tow Truck"].map({True: "Yes", False: "No"})})
        .set_index("Rank")
    )


def _fmt_sim(df: pd.DataFrame) -> object:
    fmt = {}
    if "Violations" in df.columns:
        fmt["Violations"] = "{:,.0f}"
    if "Impact Score" in df.columns:
        fmt["Impact Score"] = "{:.3f}"
    return df.style.format(fmt)


def page_simulator(df: pd.DataFrame, lang: str) -> None:
    st.header(t("simulator_header", lang))
    st.caption(
        "Allocate available officers top-down by impact score until the pool is exhausted. "
        "Shows which hotspots are covered, partially covered, or left uncovered. "
        "No estimated improvement percentages -- coverage and gaps only."
    )

    col_left, col_right = st.columns([1, 3])
    with col_left:
        st.subheader("Available Resources")
        officers = st.number_input(
            t("officers_available", lang), min_value=1, max_value=500, value=30, step=1
        )
        trucks = st.number_input(
            t("tow_trucks_available", lang), min_value=0, max_value=100, value=5, step=1
        )
        st.caption(
            "Officers allocated greedily from rank 1 downward. "
            "Tow trucks assigned one per covered hotspot until exhausted."
        )
        st.info(
            f"Throughput assumption: 1 officer = {OFFICER_THROUGHPUT} violations/hour. "
            "This is an operational estimate, not a measured value.",
        )

    result = simulate_allocation(df, int(officers), int(trucks))
    covered = result[result["status"] == "Covered"]
    partial = result[result["status"] == "Partial"]
    uncovered = result[result["status"] == "Uncovered"]
    deployed = int(result["officers_assigned"].sum())

    with col_right:
        s1, s2, s3, s4 = st.columns(4)
        s1.metric(t("covered", lang), len(covered))
        s2.metric(t("partial", lang), len(partial))
        s3.metric(t("uncovered", lang), len(uncovered))
        s4.metric(
            "Officers deployed",
            deployed,
            delta=f"{int(officers) - deployed} unused",
        )

        if not covered.empty:
            st.subheader("Covered hotspots")
            st.dataframe(_fmt_sim(_display_sim(covered)), use_container_width=True)

        if not partial.empty:
            st.subheader("Partially covered (officers ran out mid-allocation)")
            st.dataframe(_fmt_sim(_display_sim(partial)), use_container_width=True)

        if not uncovered.empty:
            st.subheader("Uncovered hotspots")
            uncov_display = _display_sim(uncovered)[
                ["Hotspot ID", "Impact Score", "Violations", "Officers Needed"]
            ]
            st.dataframe(_fmt_sim(uncov_display), use_container_width=True)


def _sidebar_methodology() -> None:
    with st.sidebar.expander("About this data"):
        st.markdown(
            """
**Dataset:** 298,450 raw parking violation records from Bangalore (Nov 2023 - Apr 2024),
filtered to 115,400 approved records. Source: police enforcement mobile app.

**Clustering:** DBSCAN with eps = 0.003 (~333 m radius) and min 50 violations per cluster
produces 101 hotspots. 4,320 points (3.7%) are treated as noise and excluded.

**Impact score:** `0.6 × count_norm + 0.4 × rush_frac`.
count_norm is the log-normalized violation count (0-1 across all hotspots).
rush_frac is the share of that hotspot's violations during rush hours (IST 7-11 or 17-20).
Rush-hour signal is morning-dominant; evening data is sparse in this dataset.

**Officer recommendation:** `ceil(violations_per_hour / 4)`.
violations_per_hour = cluster total / 702 enforcement hours (140 days × 5 hrs/day).
The throughput figure (4 violations per officer per hour) is an **assumption**, not a measurement.
Results should be interpreted as minimum deployment guidance, not a precise staffing model.
"""
        )


def main() -> None:
    if "lang" not in st.session_state:
        st.session_state.lang = "en"

    st.sidebar.title(t("app_title", st.session_state.lang))
    st.sidebar.caption(t("app_subtitle", st.session_state.lang))
    st.sidebar.divider()

    lang_choice = st.sidebar.selectbox(
        t("language_toggle", st.session_state.lang),
        options=["English", "ಕನ್ನಡ"],
        index=0 if st.session_state.lang == "en" else 1,
    )
    st.session_state.lang = "en" if lang_choice == "English" else "kn"
    lang = st.session_state.lang

    st.sidebar.divider()

    nav_keys = ["nav_map", "nav_priority_list", "nav_simulator"]
    page_key = st.sidebar.radio(
        "Navigate",
        nav_keys,
        format_func=lambda k: t(k, lang),
    )

    st.sidebar.divider()
    st.sidebar.caption(
        "Data: 115,400 approved violations\n"
        "Period: Nov 2023 - Apr 2024\n"
        "Hotspots: 101 (DBSCAN eps=0.003)\n"
        "Rush-hour signal: morning IST 7-12"
    )

    _sidebar_methodology()

    df = load_hotspots()

    if page_key == "nav_map":
        page_map(df, lang)
    elif page_key == "nav_priority_list":
        page_priority_list(df, lang)
    else:
        page_simulator(df, lang)


main()
