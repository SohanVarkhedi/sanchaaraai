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
    if "police_station" not in df.columns:
        df["police_station"] = "Unknown"
    if "junction_name" not in df.columns:
        df["junction_name"] = "Unnamed junction"
    if "station_count" not in df.columns:
        df["station_count"] = 1
    if "severity_norm" not in df.columns:
        df["severity_norm"] = breakdown.apply(lambda x: round(float(x.get("severity_norm", 0.5)), 3))
    if "dominant_vehicle_type" not in df.columns:
        df["dominant_vehicle_type"] = "OTHERS"
    if "violation_type_breakdown" in df.columns:
        df["violation_type_breakdown"] = df["violation_type_breakdown"].apply(
            lambda x: json.loads(x) if isinstance(x, str) else (x if isinstance(x, dict) else {})
        )
    else:
        df["violation_type_breakdown"] = [{} for _ in range(len(df))]
    if "dominant_violation_type" not in df.columns:
        df["dominant_violation_type"] = "UNKNOWN"
    return df.sort_values("impact_score", ascending=False).reset_index(drop=True)


def _score_color(score: float) -> str:
    r = 232
    g = int(200 * (1 - score))
    b = int(85 * (1 - score))
    return f"#{r:02x}{max(0,g):02x}{max(0,b):02x}"


def _legend_html(lang: str) -> str:
    low = t("legend_low", lang)
    high = t("legend_high", lang)
    return (
        f"<div style='display:flex;align-items:center;gap:12px;padding:6px 0 2px 0;"
        f"font-size:0.82em;color:#bbb;'>"
        f"<span>{low}</span>"
        f"<div style='width:160px;height:10px;border-radius:5px;"
        f"background:linear-gradient(to right,#e8c855,#e80000);flex-shrink:0;'></div>"
        f"<span>{high}</span>"
        f"<span style='margin-left:18px;color:#888;'>"
        f"Marker color and size both scale with impact score "
        f"(radius&nbsp;=&nbsp;5&nbsp;+&nbsp;22&nbsp;&times;&nbsp;score)"
        f"</span></div>"
    )


def _build_map(df: pd.DataFrame, lang: str) -> folium.Map:
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
        junction = row.get("junction_name") or "Unnamed junction"
        station = row.get("police_station") or "Unknown"
        sc = int(row.get("station_count", 1))
        dom_veh = row.get("dominant_vehicle_type") or "Unknown"
        dom_viol = row.get("dominant_violation_type") or "Unknown"
        station_html = (
            f"{station} <i style='color:#f0a;'>({t('spans_multiple_stations', lang)})</i>"
            if sc > 1 else station
        )
        popup_html = (
            f"<b>Hotspot #{int(row['hotspot_id'])}</b>{note}<br>"
            f"Junction: {junction}<br>"
            f"Police station: {station_html}<br>"
            f"Dominant vehicle: {dom_veh}<br>"
            f"Dominant violation: {dom_viol}<br>"
            f"Severity (norm): {float(row.get('severity_norm', 0.5)):.3f}<br>"
            f"Impact score: <b>{score:.3f}</b><br>"
            f"Violations: {int(row['violation_count']):,}<br>"
            f"Rush-hour share: {row['rush_frac']*100:.1f}%<br>"
            f"Violations/hr: {float(row['violations_per_hour']):.2f}<br>"
            f"Officers recommended: <b>{int(row['recommended_officers'])}</b>"
        )
        tooltip = (
            f"#{int(row['hotspot_id'])} {junction} | score {score:.2f} | "
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
        "101 zones where illegal parking is actively choking traffic flow, detected via DBSCAN "
        "clustering on 115,400 approved records (Nov 2023 - Apr 2024). "
        "Click any marker for the full breakdown."
    )

    col_a, col_b, col_c = st.columns(3)
    col_a.metric(t("hotspots_detected", lang), len(df))
    col_b.metric(t("top_hotspot_score", lang), f"{df['impact_score'].max():.3f}")
    col_c.metric(t("total_violations_mapped", lang), f"{df['violation_count'].sum():,}")

    st.markdown("&nbsp;", unsafe_allow_html=True)
    m = _build_map(df, lang)
    st_folium(m, use_container_width=True, height=560, returned_objects=[])
    st.markdown(_legend_html(lang), unsafe_allow_html=True)


def page_priority_list(df: pd.DataFrame, lang: str) -> None:
    st.header(t("priority_list_header", lang))
    st.caption(
        "Zones ranked by parking-induced traffic disruption score (0.5 x count_norm + 0.3 x rush_frac + 0.2 x severity_norm). "
        "Impact here means congestion pressure on the carriageway: high volume illegal parking during peak hours "
        "is more likely to be actively blocking traffic than the same volume at 2am. "
        "Rush-hour signal is morning-dominant (IST 7-12); evening data is sparse in this dataset."
    )

    impact_col = t("col_impact_score", lang)
    viol_col = t("col_violations", lang)
    rec_col = t("col_officers_rec", lang)
    dom_veh_col = t("col_dominant_vehicle", lang)
    dom_viol_col = t("col_dominant_violation", lang)

    display = df[
        [
            "hotspot_id",
            "junction_name",
            "police_station",
            "station_count",
            "dominant_vehicle_type",
            "dominant_violation_type",
            "impact_score",
            "violation_count",
            "count_norm",
            "rush_frac",
            "severity_norm",
            "violations_per_hour",
            "recommended_officers",
        ]
    ].copy()
    display["police_station"] = display.apply(
        lambda r: f"{r['police_station']} ({t('spans_multiple_stations', lang)})"
        if int(r["station_count"]) > 1 else r["police_station"],
        axis=1,
    )
    display = display.drop(columns=["station_count"])
    display.index = range(1, len(display) + 1)
    display.index.name = "rank"
    display = display.rename(
        columns={
            "hotspot_id": "Hotspot ID",
            "junction_name": "Junction",
            "police_station": "Police Station",
            "dominant_vehicle_type": dom_veh_col,
            "dominant_violation_type": dom_viol_col,
            "impact_score": impact_col,
            "violation_count": viol_col,
            "count_norm": "Count Norm",       # technical abbreviation -- stays English
            "rush_frac": "Rush-Hr Frac",      # technical abbreviation -- stays English
            "severity_norm": "Sev Norm",      # technical abbreviation -- stays English
            "violations_per_hour": "Viol/Hr", # technical abbreviation -- stays English
            "recommended_officers": rec_col,
        }
    )

    styled = (
        display.style
        .format(
            {
                impact_col: "{:.4f}",
                viol_col: "{:,.0f}",
                "Count Norm": "{:.3f}",
                "Rush-Hr Frac": "{:.3f}",
                "Sev Norm": "{:.3f}",
                "Viol/Hr": "{:.2f}",
                rec_col: "{:.0f}",
            }
        )
        .background_gradient(subset=[impact_col], cmap="YlOrRd")
    )

    st.dataframe(styled, use_container_width=True, height=600)

    st.caption(
        "Count Norm: log-normalized violation volume (0-1). "
        "Rush-Hr Frac: share of violations during IST 7-11 or 17-20. "
        "Sev Norm: avg vehicle severity weight per cluster, normalized 0-1 (HGV/Lorry=1.0, Scooter=0.2). "
        "Viol/Hr: cluster violations / 702 enforcement hours (140 days x 5 hrs/day). "
        f"{rec_col}: ceil(Viol/Hr / 4) -- officer throughput of 4 vph is an assumption, not a measurement. "
        "Formula: 0.5 x Count Norm + 0.3 x Rush-Hr Frac + 0.2 x Sev Norm."
    )

    top = df.iloc[0]
    top_id = int(top["hotspot_id"])
    top_breakdown = top.get("violation_type_breakdown", {})
    if isinstance(top_breakdown, str):
        top_breakdown = json.loads(top_breakdown)

    with st.expander(f"{t('violation_breakdown_title', lang)} — Hotspot #{top_id} (rank 1)"):
        if top_breakdown:
            bd_df = pd.DataFrame(
                [{"Violation Type": vt, "Count": v["count"], "Share": f"{v['pct'] * 100:.1f}%"}
                 for vt, v in sorted(top_breakdown.items(), key=lambda x: -x[1]["count"])]
            ).set_index("Violation Type")
            st.dataframe(bd_df, use_container_width=True)
            st.caption("Types below 5% share omitted; capped at top 5.")
        else:
            st.caption("No breakdown data available.")


def _display_sim(raw: pd.DataFrame, lang: str) -> pd.DataFrame:
    impact_col = t("col_impact_score", lang)
    viol_col = t("col_violations", lang)
    return (
        raw.rename(
            columns={
                "rank": "Rank",
                "hotspot_id": "Hotspot ID",
                "impact_score": impact_col,
                "violation_count": viol_col,
                "officers_needed": "Officers Needed",
                "officers_assigned": "Officers Assigned",
                "tow_truck": "Tow Truck",
                "status": "Status",
            }
        )
        .assign(**{"Tow Truck": lambda d: d["Tow Truck"].map({True: "Yes", False: "No"})})
        .set_index("Rank")
    )


def _fmt_sim(df: pd.DataFrame, lang: str) -> object:
    impact_col = t("col_impact_score", lang)
    viol_col = t("col_violations", lang)
    fmt = {}
    if viol_col in df.columns:
        fmt[viol_col] = "{:,.0f}"
    if impact_col in df.columns:
        fmt[impact_col] = "{:.3f}"
    return df.style.format(fmt)


def page_simulator(df: pd.DataFrame, lang: str) -> None:
    st.header(t("simulator_header", lang))
    st.caption(
        "Allocate available officers top-down by impact score until the pool is exhausted. "
        "Shows which hotspots are covered, partially covered, or left uncovered. "
        "No estimated improvement percentages -- coverage and gaps only. "
        "Scope follows the station filter in the sidebar: select a station to simulate "
        "that station's own officer pool across its jurisdiction's hotspots only."
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
            st.dataframe(_fmt_sim(_display_sim(covered, lang), lang), use_container_width=True)

        if not partial.empty:
            st.subheader("Partially covered (officers ran out mid-allocation)")
            st.dataframe(_fmt_sim(_display_sim(partial, lang), lang), use_container_width=True)

        if not uncovered.empty:
            st.subheader("Uncovered hotspots")
            impact_col = t("col_impact_score", lang)
            viol_col = t("col_violations", lang)
            uncov_display = _display_sim(uncovered, lang)[
                ["Hotspot ID", impact_col, viol_col, "Officers Needed"]
            ]
            st.dataframe(_fmt_sim(uncov_display, lang), use_container_width=True)


def _sidebar_methodology(lang: str) -> None:
    with st.sidebar.expander(t("about_data_title", lang)):
        st.markdown(
            """
**Dataset:** 298,450 raw parking violation records from Bangalore (Nov 2023 - Apr 2024),
filtered to 115,400 approved records. Source: police enforcement mobile app.

**Clustering:** DBSCAN with eps = 0.003 (~333 m radius) and min 50 violations per cluster
produces 101 hotspots. 4,320 points (3.7%) are treated as noise and excluded.

**Impact score:** `0.5 × count_norm + 0.3 × rush_frac + 0.2 × severity_norm`.
count_norm is the log-normalized violation count (0-1 across all hotspots).
rush_frac is the share of that hotspot's violations during rush hours (IST 7-11 or 17-20).
severity_norm is the cluster's average vehicle severity weight, normalized 0-1 (HGV/Lorry/Tanker = 1.0, Scooter/Motorcycle = 0.2).
Rush-hour violation density is used as a proxy for congestion impact — a hotspot with high violations during peak hours is more likely to be actively blocking carriageways than one with the same volume at 2am.
Rush-hour signal is morning-dominant; evening data is sparse in this dataset.
Severity weights are assumptions, not measurements — see docs/decisions.md.

**Officer recommendation:** `ceil(violations_per_hour / 4)`.
violations_per_hour = cluster total / 702 enforcement hours (140 days × 5 hrs/day).
The throughput figure (4 violations per officer per hour) is an **assumption**, not a measurement.
Results should be interpreted as minimum deployment guidance, not a precise staffing model.
"""
        )


def main() -> None:
    if "lang" not in st.session_state:
        st.session_state.lang = "en"

    df = load_hotspots()

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

    stations = sorted(df["police_station"].unique().tolist())
    all_label = t("all_stations", lang)
    selected_station = st.sidebar.selectbox(
        t("station_filter", lang),
        [all_label] + stations,
    )
    if selected_station == all_label:
        filtered_df = df
    else:
        filtered_df = df[df["police_station"] == selected_station].reset_index(drop=True)

    st.sidebar.divider()
    st.sidebar.caption(
        "Data: 115,400 approved violations\n"
        "Period: Nov 2023 - Apr 2024\n"
        "Hotspots: 101 (DBSCAN eps=0.003)\n"
        "Rush-hour signal: morning IST 7-12"
    )

    _sidebar_methodology(lang)

    if page_key == "nav_map":
        page_map(filtered_df, lang)
    elif page_key == "nav_priority_list":
        page_priority_list(filtered_df, lang)
    else:
        page_simulator(filtered_df, lang)


main()
