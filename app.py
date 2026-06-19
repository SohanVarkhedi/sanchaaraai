import json
import itertools
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import folium
from folium.plugins import HeatMap
import streamlit as st
from streamlit_folium import st_folium
from src.hotspot_engine import simulate_allocation, OFFICER_THROUGHPUT, DOW_ORDER, PARTIAL_MONTHS
from src.i18n import t

st.set_page_config(
    page_title="ParkPulse AI",
    page_icon="P",
    layout="wide",
)

HOTSPOTS_PATH = "data/processed/hotspots.json"
RAW_PATH = "data/raw/violations_raw.csv"
BANGALORE_CENTER = [12.9716, 77.5946]
HEAVY_VEHICLE_TYPES = {"HGV", "LORRY/GOODS VEHICLE", "TANKER", "PRIVATE BUS",
                        "BUS (BMTC/KSRTC)", "TOURIST BUS", "FACTORY BUS", "TRACTOR"}
HEAVY_THRESHOLD = 0.20


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
    df["severity_norm"] = breakdown.apply(lambda x: round(float(x.get("severity_norm", 0.5)), 3))

    for col, default in [
        ("police_station", "Unknown"),
        ("junction_name", "Unnamed junction"),
        ("dominant_vehicle_type", "OTHERS"),
        ("dominant_violation_type", "UNKNOWN"),
        ("peak_shift", "morning"),
        ("peak_day", "Unknown"),
        ("peak_hour", 0),
        ("lat_spread", 0.003),
        ("lon_spread", 0.003),
    ]:
        if col not in df.columns:
            df[col] = default

    if "station_count" not in df.columns:
        df["station_count"] = 1

    for list_field in ("top_junctions",):
        if list_field in df.columns:
            df[list_field] = df[list_field].apply(
                lambda x: json.loads(x) if isinstance(x, str) else (x if isinstance(x, list) else [])
            )
        else:
            df[list_field] = [[] for _ in range(len(df))]

    for dict_field in ("violation_type_breakdown", "shift_breakdown",
                       "day_of_week_distribution", "hour_distribution", "monthly_trend"):
        if dict_field in df.columns:
            df[dict_field] = df[dict_field].apply(
                lambda x: json.loads(x) if isinstance(x, str) else (x if isinstance(x, dict) else {})
            )
        else:
            df[dict_field] = [{} for _ in range(len(df))]

    if "hull" in df.columns:
        df["hull"] = df["hull"].apply(
            lambda x: json.loads(x) if isinstance(x, str) else (x if isinstance(x, list) else [])
        )
    else:
        df["hull"] = [[] for _ in range(len(df))]

    df["needs_tow"] = df["violation_type_breakdown"].apply(
        lambda vt: any(
            k in HEAVY_VEHICLE_TYPES and v.get("pct", 0) >= HEAVY_THRESHOLD
            for k, v in vt.items()
        ) if isinstance(vt, dict) else False
    )

    return df.sort_values("impact_score", ascending=False).reset_index(drop=True)


@st.cache_data
def load_city_stats() -> dict:
    from zoneinfo import ZoneInfo
    import json as _json

    df = pd.read_csv(RAW_PATH, low_memory=False)
    df = df[df["validation_status"] == "approved"].copy()
    df["created_datetime"] = pd.to_datetime(df["created_datetime"], utc=True, errors="coerce")
    df = df[df["created_datetime"].notna()].reset_index(drop=True)
    IST = ZoneInfo("Asia/Kolkata")
    df["dt_ist"] = df["created_datetime"].dt.tz_convert(IST)
    df["hour_ist"] = df["dt_ist"].dt.hour
    df["dow"] = df["dt_ist"].dt.day_name()
    df["month"] = df["dt_ist"].dt.strftime("%Y-%m")

    def parse_vt(raw):
        if pd.isna(raw): return []
        try:
            p = _json.loads(raw)
            return p if isinstance(p, list) else [str(p)]
        except: return [str(raw)]

    df["vt_list"] = df["violation_type"].apply(parse_vt)
    all_vt = list(itertools.chain.from_iterable(df["vt_list"]))
    vt_counts = pd.Series(all_vt).value_counts()

    matrix = df.groupby(["dow", "hour_ist"]).size().unstack(fill_value=0).reindex(DOW_ORDER)

    return {
        "total": len(df),
        "worst_station": df["police_station"].value_counts().head(5).to_dict(),
        "worst_junction": df["junction_name"].replace("No Junction", np.nan).dropna().value_counts().head(10).to_dict(),
        "hour_dist": df["hour_ist"].value_counts().sort_index().to_dict(),
        "dow_dist": df["dow"].value_counts().reindex(DOW_ORDER).to_dict(),
        "vt_counts": vt_counts.head(10).to_dict(),
        "vehicle_counts": df["vehicle_type"].value_counts().head(8).to_dict(),
        "monthly": df["month"].value_counts().sort_index().to_dict(),
        "matrix_hours": [int(c) for c in matrix.columns.tolist()],
        "matrix_rows": {day: [int(matrix.loc[day, c]) if day in matrix.index and c in matrix.columns else 0
                               for c in matrix.columns] for day in DOW_ORDER},
        "peak_hour": int(df["hour_ist"].value_counts().idxmax()),
        "peak_dow": str(df["dow"].value_counts().idxmax()),
        "peak_station": str(df["police_station"].value_counts().idxmax()),
        "peak_junction": str(df["junction_name"].replace("No Junction", np.nan).dropna().value_counts().idxmax()),
    }


def _score_color(score: float) -> str:
    r = 232
    g = int(200 * (1 - score))
    b = int(85 * (1 - score))
    return f"#{r:02x}{max(0, g):02x}{max(0, b):02x}"


def _sim_color(status: str) -> str:
    return {"Covered": "#00cc44", "Partial": "#ffaa00", "Uncovered": "#cc2200"}.get(status, "#888888")


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
        f"Circle size reflects cluster spread. Color encodes impact score."
        f"</span></div>"
    )


def _cluster_radius_px(spread_deg: float) -> float:
    meters = spread_deg * 111000
    px = meters / (156543.03 * (2 ** -12))
    return max(5.0, min(px, 45.0))


def _build_popup(row: pd.Series, lang: str, full: bool) -> str:
    score = float(row["impact_score"])
    junction = row.get("junction_name") or "Unnamed junction"
    station = row.get("police_station") or "Unknown"
    sc = int(row.get("station_count", 1))
    station_html = (
        f"{station} <i style='color:#f0a;'>({t('spans_multiple_stations', lang)})</i>"
        if sc > 1 else station
    )
    base = (
        f"<b>Hotspot #{int(row['hotspot_id'])}</b><br>"
        f"Junction: {junction}<br>"
        f"Station: {station_html}<br>"
        f"Impact score: <b>{score:.3f}</b><br>"
        f"Violations: {int(row['violation_count']):,}<br>"
        f"Peak shift: {row.get('peak_shift', 'morning')}"
    )
    if not full:
        return base
    sb = row.get("shift_breakdown", {})
    shift_html = "".join(
        f"<br>{s.capitalize()}: {sb[s]['violation_count']:,} "
        f"({sb[s]['pct']*100:.0f}%) -> {sb[s]['recommended_officers']} officers"
        for s in ["morning", "afternoon", "night"] if s in sb
    )
    top_j = row.get("top_junctions", [])
    junc_html = "".join(f"<br>  {j['name'][:35]} ({j['count']:,})" for j in top_j[:3])
    return (
        base
        + (f"<br><b>Shift deployment:</b>{shift_html}" if shift_html else "")
        + (f"<br><b>Top junctions:</b>{junc_html}" if junc_html else "")
    )


@st.cache_data
def build_heatmap_points(hotspots_path: str) -> list:
    with open(hotspots_path) as f:
        records = json.load(f)
    return [
        [float(r["lat"]), float(r["lon"]), min(r.get("violation_count", 1) / 1000.0, 1.0)]
        for r in records
    ]


def _build_map(df: pd.DataFrame, lang: str, raw_points: list,
               sim_result: pd.DataFrame = None) -> folium.Map:
    BLR_BOUNDS = [[12.75, 77.35], [13.20, 77.85]]
    m = folium.Map(
        location=BANGALORE_CENTER,
        zoom_start=12,
        tiles="CartoDB dark_matter",
        min_zoom=11,
        max_zoom=17,
        max_bounds=True,
    )
    m.fit_bounds(BLR_BOUNDS)

    if raw_points and sim_result is None:
        HeatMap(
            raw_points, radius=18, blur=25, min_opacity=0.4,
            gradient={0.2: "#1a1aff", 0.5: "#ff8800", 0.8: "#ff2200", 1.0: "#ffffff"},
        ).add_to(m)

    top20_ids = set(df.head(20)["hotspot_id"].tolist())
    sim_status = {}
    if sim_result is not None:
        sim_status = dict(zip(sim_result["hotspot_id"], sim_result["status"]))

    for _, row in df.iterrows():
        hid = int(row["hotspot_id"])
        score = float(row["impact_score"])
        is_top = hid in top20_ids
        junction = row.get("junction_name") or "Unnamed junction"
        spread_deg = max(float(row.get("lat_spread", 0.003)), float(row.get("lon_spread", 0.003)))
        radius = _cluster_radius_px(spread_deg) if is_top else max(5.0, _cluster_radius_px(spread_deg) * 0.6)

        if sim_result is not None:
            status = sim_status.get(hid, "Uncovered")
            color = _sim_color(status)
            popup_html = (
                f"<b>Hotspot #{hid}</b><br>"
                f"Junction: {junction}<br>"
                f"Status: <b>{status}</b><br>"
                f"Impact score: {score:.3f}<br>"
                f"Violations: {int(row['violation_count']):,}"
            )
        else:
            color = _score_color(score)
            popup_html = _build_popup(row, lang, full=is_top)

        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=radius,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.75 if is_top else 0.5,
            weight=1.5 if is_top else 1.0,
            tooltip=f"#{hid} {junction} | {score:.2f} | {int(row['violation_count']):,} violations",
            popup=folium.Popup(popup_html, max_width=300),
        ).add_to(m)

    return m


def page_map(df: pd.DataFrame, lang: str) -> None:
    st.header(t("map_header", lang))
    st.caption(
        "120 enforcement zones detected via DBSCAN clustering on 115,400 approved records "
        "(Nov 2023 - Mar 2024). Heatmap shows raw violation density. "
        "Top 20 hotspots show full shift-based deployment detail on click."
    )
    col_a, col_b, col_c = st.columns(3)
    col_a.metric(t("hotspots_detected", lang), len(df))
    col_b.metric(t("top_hotspot_score", lang), f"{df['impact_score'].max():.3f}")
    col_c.metric(t("total_violations_mapped", lang), f"{df['violation_count'].sum():,}")
    st.markdown("&nbsp;", unsafe_allow_html=True)
    raw_pts = build_heatmap_points(HOTSPOTS_PATH)
    m = _build_map(df, lang, raw_pts)
    st_folium(m, use_container_width=True, height=580, returned_objects=[])
    st.markdown(_legend_html(lang), unsafe_allow_html=True)


def page_insights(lang: str) -> None:
    st.header("City-wide Parking Intelligence")
    st.caption(
        "Aggregate analysis across all 115,400 approved violation records "
        "(Nov 2023 - Mar 2024). All numbers are observed data, no estimates."
    )

    with st.spinner("Loading city-wide data..."):
        stats = load_city_stats()

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total violations", f"{stats['total']:,}")
    c2.metric("Worst station", stats["peak_station"].split()[-1] if stats["peak_station"] else "N/A")
    c3.metric("Peak hour (IST)", f"{stats['peak_hour']}:00")
    c4.metric("Peak day", stats["peak_dow"])

    st.divider()

    col_left, col_right = st.columns(2)

    with col_left:
        st.subheader("Violations by hour (IST)")
        hour_df = pd.DataFrame({
            "Hour": list(range(24)),
            "Violations": [stats["hour_dist"].get(h, 0) for h in range(24)],
            "Rush": [7 <= h <= 11 for h in range(24)],
        })
        fig_h = px.bar(
            hour_df, x="Hour", y="Violations",
            color="Rush",
            color_discrete_map={True: "#e8a830", False: "#6688aa"},
            height=280,
        )
        fig_h.update_layout(showlegend=False, margin=dict(t=10, b=10))
        st.plotly_chart(fig_h, use_container_width=True)
        st.caption("Evening hours sparse -- enforcement is morning-concentrated.")

    with col_right:
        st.subheader("Violations by day of week")
        dow_df = pd.DataFrame({
            "Day": DOW_ORDER,
            "Violations": [stats["dow_dist"].get(d, 0) for d in DOW_ORDER],
            "Peak": [d == stats["peak_dow"] for d in DOW_ORDER],
        })
        fig_d = px.bar(
            dow_df, x="Day", y="Violations",
            color="Peak",
            color_discrete_map={True: "#e80000", False: "#6688aa"},
            height=280,
        )
        fig_d.update_layout(showlegend=False, margin=dict(t=10, b=10))
        st.plotly_chart(fig_d, use_container_width=True)

    st.divider()
    st.subheader("Day x Hour violation density matrix")
    st.caption(
        "Each cell shows total violations for that day-hour combination. "
        "Darker = more violations. Enforcement is concentrated 8-12 IST on weekdays."
    )

    hours = stats["matrix_hours"]
    z = [stats["matrix_rows"].get(day, [0]*len(hours)) for day in DOW_ORDER]

    fig_mat = go.Figure(data=go.Heatmap(
        z=z,
        x=[f"{h}:00" for h in hours],
        y=DOW_ORDER,
        colorscale=[[0, "#0d1117"], [0.3, "#1a3a6b"], [0.6, "#e87820"], [1.0, "#e80000"]],
        showscale=True,
        hovertemplate="Day: %{y}<br>Hour: %{x}<br>Violations: %{z}<extra></extra>",
    ))
    fig_mat.update_layout(
        height=300,
        margin=dict(t=10, b=10, l=80, r=20),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#cccccc"),
        xaxis=dict(tickangle=-45),
    )
    st.plotly_chart(fig_mat, use_container_width=True)

    st.divider()

    col_l2, col_r2 = st.columns(2)

    with col_l2:
        st.subheader("Top 10 junctions by violations")
        junc_df = pd.DataFrame({
            "Junction": list(stats["worst_junction"].keys()),
            "Violations": list(stats["worst_junction"].values()),
        }).sort_values("Violations", ascending=True)
        junc_df["Junction"] = junc_df["Junction"].str.replace(r"^BTP\d+ - ", "", regex=True)
        fig_j = px.bar(
            junc_df, x="Violations", y="Junction",
            orientation="h", height=360,
            color="Violations",
            color_continuous_scale=[[0, "#6688aa"], [1, "#e80000"]],
        )
        fig_j.update_layout(showlegend=False, margin=dict(t=10, b=10), coloraxis_showscale=False)
        st.plotly_chart(fig_j, use_container_width=True)

    with col_r2:
        st.subheader("Violation type breakdown")
        vt_df = pd.DataFrame({
            "Type": list(stats["vt_counts"].keys()),
            "Count": list(stats["vt_counts"].values()),
        }).sort_values("Count", ascending=True)
        fig_vt = px.bar(
            vt_df, x="Count", y="Type",
            orientation="h", height=360,
            color="Count",
            color_continuous_scale=[[0, "#6688aa"], [1, "#e87820"]],
        )
        fig_vt.update_layout(showlegend=False, margin=dict(t=10, b=10), coloraxis_showscale=False)
        st.plotly_chart(fig_vt, use_container_width=True)

    st.divider()

    col_l3, col_r3 = st.columns(2)

    with col_l3:
        st.subheader("Top police stations")
        st_df = pd.DataFrame({
            "Station": list(stats["worst_station"].keys()),
            "Violations": list(stats["worst_station"].values()),
        }).sort_values("Violations", ascending=True)
        fig_st = px.bar(
            st_df, x="Violations", y="Station",
            orientation="h", height=280,
            color="Violations",
            color_continuous_scale=[[0, "#6688aa"], [1, "#e80000"]],
        )
        fig_st.update_layout(showlegend=False, margin=dict(t=10, b=10), coloraxis_showscale=False)
        st.plotly_chart(fig_st, use_container_width=True)

    with col_r3:
        st.subheader("Vehicle type breakdown")
        veh_df = pd.DataFrame({
            "Vehicle": list(stats["vehicle_counts"].keys()),
            "Count": list(stats["vehicle_counts"].values()),
        }).sort_values("Count", ascending=True)
        fig_veh = px.bar(
            veh_df, x="Count", y="Vehicle",
            orientation="h", height=280,
            color="Count",
            color_continuous_scale=[[0, "#6688aa"], [1, "#e87820"]],
        )
        fig_veh.update_layout(showlegend=False, margin=dict(t=10, b=10), coloraxis_showscale=False)
        st.plotly_chart(fig_veh, use_container_width=True)


def page_priority_list(df: pd.DataFrame, lang: str) -> None:
    st.header(t("priority_list_header", lang))
    st.caption(
        "Zones ranked by parking-induced traffic disruption score "
        "(0.5 x count_norm + 0.3 x rush_frac + 0.2 x severity_norm). "
        "Rush-hour signal is morning-dominant (IST 7-12); evening data is sparse."
    )

    impact_col = t("col_impact_score", lang)
    viol_col = t("col_violations", lang)
    rec_col = t("col_officers_rec", lang)
    dom_veh_col = t("col_dominant_vehicle", lang)
    dom_viol_col = t("col_dominant_violation", lang)

    display = df[[
        "hotspot_id", "junction_name", "police_station", "station_count",
        "dominant_vehicle_type", "dominant_violation_type",
        "impact_score", "violation_count", "count_norm", "rush_frac",
        "severity_norm", "violations_per_hour", "recommended_officers", "peak_shift",
    ]].copy()

    display["police_station"] = display.apply(
        lambda r: f"{r['police_station']} ({t('spans_multiple_stations', lang)})"
        if int(r["station_count"]) > 1 else r["police_station"], axis=1,
    )
    display = display.drop(columns=["station_count"])
    display.index = range(1, len(display) + 1)
    display.index.name = "rank"
    display = display.rename(columns={
        "hotspot_id": "Hotspot ID", "junction_name": "Junction",
        "police_station": "Police Station",
        "dominant_vehicle_type": dom_veh_col, "dominant_violation_type": dom_viol_col,
        "impact_score": impact_col, "violation_count": viol_col,
        "count_norm": "Count Norm", "rush_frac": "Rush-Hr Frac",
        "severity_norm": "Sev Norm", "violations_per_hour": "Viol/Hr",
        "recommended_officers": rec_col, "peak_shift": "Peak Shift",
    })

    styled = (
        display.style
        .format({
            impact_col: "{:.4f}", viol_col: "{:,.0f}",
            "Count Norm": "{:.3f}", "Rush-Hr Frac": "{:.3f}",
            "Sev Norm": "{:.3f}", "Viol/Hr": "{:.2f}", rec_col: "{:.0f}",
        })
        .background_gradient(subset=[impact_col], cmap="YlOrRd")
    )
    st.dataframe(styled, use_container_width=True, height=500)
    st.caption(
        "Count Norm: log-normalized violation volume. Rush-Hr Frac: share during IST 7-11 or 17-20. "
        "Sev Norm: avg vehicle weight normalized (HGV=1.0, Scooter=0.2). "
        f"{rec_col}: morning shift officers. Throughput of 4 vph is an assumption."
    )

    st.subheader("Hotspot detail")
    options = [
        f"#{int(r['hotspot_id'])} - {r['junction_name']} (rank {i+1})"
        for i, (_, r) in enumerate(df.iterrows())
    ]
    sel = st.selectbox("Select hotspot", range(len(options)), format_func=lambda i: options[i])
    row = df.iloc[sel]
    hid = int(row["hotspot_id"])

    c1, c2, c3 = st.columns(3)
    with c1:
        with st.expander(f"Shift deployment -- #{hid}", expanded=True):
            sb = row.get("shift_breakdown", {})
            if sb:
                shift_rows = []
                for shift in ["morning", "afternoon", "night"]:
                    if shift in sb:
                        s = sb[shift]
                        shift_rows.append({
                            "Shift": shift.capitalize(),
                            "Violations": s["violation_count"],
                            "Share": f"{s['pct']*100:.0f}%",
                            "Rate (viol/hr)": round(s["rate_per_hour"], 2),
                            "Officers": s["recommended_officers"],
                        })
                st.dataframe(pd.DataFrame(shift_rows).set_index("Shift"), use_container_width=True)
                st.caption("Throughput: 4 vph assumed.")

    with c2:
        with st.expander(f"Violation types -- #{hid}", expanded=True):
            vt = row.get("violation_type_breakdown", {})
            if vt:
                bd_df = pd.DataFrame([
                    {"Type": k, "Count": v["count"], "Share": f"{v['pct']*100:.1f}%"}
                    for k, v in sorted(vt.items(), key=lambda x: -x[1]["count"])
                ]).set_index("Type")
                st.dataframe(bd_df, use_container_width=True)
            else:
                st.caption("No breakdown available.")

    with c3:
        with st.expander(f"Top junctions -- #{hid}", expanded=True):
            top_j = row.get("top_junctions", [])
            if isinstance(top_j, str):
                top_j = json.loads(top_j)
            if top_j:
                jdf = pd.DataFrame([
                    {"Junction": j["name"], "Violations": j["count"], "Share": f"{j['pct']*100:.1f}%"}
                    for j in top_j
                ]).set_index("Junction")
                st.dataframe(jdf, use_container_width=True)
            else:
                st.caption("No named junctions.")


def _display_sim(raw: pd.DataFrame, lang: str) -> pd.DataFrame:
    impact_col = t("col_impact_score", lang)
    viol_col = t("col_violations", lang)
    return (
        raw.rename(columns={
            "rank": "Rank", "hotspot_id": "Hotspot ID",
            "impact_score": impact_col, "violation_count": viol_col,
            "officers_needed": "Officers Needed", "officers_assigned": "Officers Assigned",
            "tow_truck": "Tow Truck", "status": "Status",
        })
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
        "Allocate officers top-down by impact score. "
        "Tow trucks assigned only to hotspots where heavy vehicles exceed 20% of violations. "
        "No estimated improvement percentages -- coverage and gaps only."
    )

    col_left, col_right = st.columns([1, 3])
    with col_left:
        st.subheader("Resources")
        officers = st.number_input(t("officers_available", lang), min_value=1, max_value=500, value=30, step=1)
        trucks = st.number_input(t("tow_trucks_available", lang), min_value=0, max_value=100, value=5, step=1)
        shift_select = st.selectbox("Deployment shift", ["morning", "afternoon", "night"], index=0)
        st.caption("Officers allocated greedily from rank 1 downward.")
        st.info(f"Throughput: 1 officer = {OFFICER_THROUGHPUT} vph (assumption).")

    shift_df = df.copy()
    shift_df["recommended_officers"] = shift_df["shift_breakdown"].apply(
        lambda sb: sb.get(shift_select, {}).get("recommended_officers", 1)
        if isinstance(sb, dict) else 1
    )

    remaining_officers = int(officers)
    remaining_trucks = int(trucks)
    rows = []
    for rank, (_, row) in enumerate(shift_df.iterrows(), start=1):
        needed = int(row["recommended_officers"])
        if remaining_officers >= needed:
            assigned = needed; remaining_officers -= needed; status = "Covered"
        elif remaining_officers > 0:
            assigned = remaining_officers; remaining_officers = 0; status = "Partial"
        else:
            assigned = 0; status = "Uncovered"

        needs_tow = bool(row.get("needs_tow", False))
        truck = needs_tow and remaining_trucks > 0 and status != "Uncovered"
        if truck:
            remaining_trucks -= 1

        rows.append({
            "rank": rank, "hotspot_id": int(row["hotspot_id"]),
            "impact_score": float(row["impact_score"]),
            "violation_count": int(row["violation_count"]),
            "officers_needed": needed, "officers_assigned": assigned,
            "tow_truck": truck, "status": status,
        })

    result = pd.DataFrame(rows)
    covered = result[result["status"] == "Covered"]
    partial = result[result["status"] == "Partial"]
    uncovered = result[result["status"] == "Uncovered"]
    deployed = int(result["officers_assigned"].sum())

    with col_right:
        s1, s2, s3, s4 = st.columns(4)
        s1.metric(t("covered", lang), len(covered))
        s2.metric(t("partial", lang), len(partial))
        s3.metric(t("uncovered", lang), len(uncovered))
        s4.metric("Officers deployed", deployed, delta=f"{int(officers) - deployed} unused")

        st.subheader("Coverage map")
        sim_map = _build_map(df, lang, [], sim_result=result)
        st_folium(sim_map, use_container_width=True, height=420, returned_objects=[])
        st.caption(
            "Green: covered | Orange: partial | Red: uncovered. "
            "Tow trucks assigned only where heavy vehicles (HGV/Bus/Lorry/Tanker) exceed 20% of violations."
        )

        if not covered.empty:
            st.subheader("Covered")
            st.dataframe(_fmt_sim(_display_sim(covered, lang), lang), use_container_width=True)
        if not partial.empty:
            st.subheader("Partial")
            st.dataframe(_fmt_sim(_display_sim(partial, lang), lang), use_container_width=True)
        if not uncovered.empty:
            st.subheader("Uncovered")
            uncov = _display_sim(uncovered, lang)[
                ["Hotspot ID", t("col_impact_score", lang), t("col_violations", lang), "Officers Needed"]
            ]
            st.dataframe(_fmt_sim(uncov, lang), use_container_width=True)


def page_temporal(df: pd.DataFrame, lang: str) -> None:
    st.header(t("temporal_header", lang))
    st.caption("Observed violation patterns per hotspot. No forecasting or predictive claims.")

    options = [
        f"#{int(r['hotspot_id'])} -- {r['junction_name']} (rank {i+1})"
        for i, (_, r) in enumerate(df.iterrows())
    ]
    selected_idx = st.selectbox(t("select_hotspot", lang), range(len(options)), format_func=lambda i: options[i])
    row = df.iloc[selected_idx]

    def _parse(field: str) -> dict:
        val = row.get(field, {})
        return json.loads(val) if isinstance(val, str) else (val if isinstance(val, dict) else {})

    dow_dist = _parse("day_of_week_distribution")
    hour_dist = _parse("hour_distribution")
    monthly = _parse("monthly_trend")
    shift_breakdown = _parse("shift_breakdown")
    peak_day = str(row.get("peak_day", "Unknown"))
    peak_hour = int(row.get("peak_hour", 0))
    peak_shift = str(row.get("peak_shift", "morning"))

    m1, m2, m3, m4 = st.columns(4)
    m1.metric(t("peak_day_label", lang), peak_day)
    m2.metric(t("peak_hour_label", lang), f"{peak_hour}:00 IST")
    m3.metric("Peak shift", peak_shift.capitalize())
    m4.metric(t("col_violations", lang), f"{int(row['violation_count']):,}")

    st.divider()

    if shift_breakdown:
        st.subheader("Shift-based deployment")
        shift_rows = []
        for shift in ["morning", "afternoon", "night"]:
            if shift in shift_breakdown:
                s = shift_breakdown[shift]
                shift_rows.append({
                    "Shift": shift.capitalize(),
                    "Violations": f"{s['violation_count']:,}",
                    "Share": f"{s['pct']*100:.0f}%",
                    "Rate (viol/hr)": round(s["rate_per_hour"], 2),
                    "Officers needed": s["recommended_officers"],
                })
        st.dataframe(pd.DataFrame(shift_rows).set_index("Shift"), use_container_width=True)
        st.caption("Officer throughput assumption: 4 violations per officer per hour.")
        st.divider()

    top_j = row.get("top_junctions", [])
    if isinstance(top_j, str):
        top_j = json.loads(top_j)
    if top_j:
        st.subheader("Top junctions in this zone")
        jdf = pd.DataFrame([
            {"Junction": j["name"], "Violations": j["count"], "Share": f"{j['pct']*100:.1f}%"}
            for j in top_j
        ]).set_index("Junction")
        st.dataframe(jdf, use_container_width=True)
        st.divider()

    col_l, col_r = st.columns(2)

    with col_l:
        st.subheader(t("day_chart_title", lang))
        dow_df = pd.DataFrame({
            "Day": DOW_ORDER,
            "Violations": [dow_dist.get(d, 0) for d in DOW_ORDER],
            "Peak": [d == peak_day for d in DOW_ORDER],
        })
        fig_dow = px.bar(dow_df, x="Day", y="Violations", color="Peak",
                         color_discrete_map={True: "#e80000", False: "#6688aa"}, height=280)
        fig_dow.update_layout(showlegend=False, margin=dict(t=10, b=10))
        st.plotly_chart(fig_dow, use_container_width=True)

    with col_r:
        st.subheader(t("hour_chart_title", lang))
        hour_df = pd.DataFrame({
            "Hour (IST)": list(range(24)),
            "Violations": [hour_dist.get(str(h), 0) for h in range(24)],
            "Rush": [7 <= h <= 11 for h in range(24)],
        })
        fig_hour = px.bar(hour_df, x="Hour (IST)", y="Violations", color="Rush",
                          color_discrete_map={True: "#e8a830", False: "#6688aa"}, height=280)
        fig_hour.update_layout(margin=dict(t=10, b=10), showlegend=False)
        st.plotly_chart(fig_hour, use_container_width=True)

    st.caption("Evening hours (17-20 IST) sparse -- enforcement is morning-concentrated.")
    st.divider()

    st.subheader(t("month_chart_title", lang))
    month_keys = sorted(monthly.keys())
    month_df = pd.DataFrame({
        "Month": [f"{m}*" if m in PARTIAL_MONTHS else m for m in month_keys],
        "Violations": [monthly[m] for m in month_keys],
        "Partial": [m in PARTIAL_MONTHS for m in month_keys],
    })
    fig_month = px.bar(month_df, x="Month", y="Violations", color="Partial",
                       color_discrete_map={True: "#888888", False: "#e86020"}, height=260)
    fig_month.update_layout(margin=dict(t=10, b=10), showlegend=False)
    st.plotly_chart(fig_month, use_container_width=True)
    st.caption(
        "* Nov 2023 and Mar 2024 are partial months. "
        "Feb-Mar 2024 sparse data is a reporting gap, not a real decline."
    )


def _sidebar_methodology(lang: str) -> None:
    with st.sidebar.expander(t("about_data_title", lang)):
        st.markdown(
            """
**Dataset:** 298,450 raw records, filtered to 115,400 approved.
Period: Nov 2023 - Mar 2024.

**Clustering:** DBSCAN eps=0.003, min_samples=50.
Downtown giant cluster sub-clustered at eps=0.0015 into 20 zones.
Final: 120 hotspots, 4.9% noise discarded.

**Impact score:** 0.5 x count_norm + 0.3 x rush_frac + 0.2 x severity_norm.
Severity weights are assumptions (HGV=1.0, Scooter=0.2).

**Shift deployment:** officer needs per shift (morning 6-12, afternoon 12-18, night 18-6)
using real violation counts divided by shift hours over dataset span.
Throughput of 4 vph is an assumption.

**Tow truck logic:** assigned only where heavy vehicles (HGV/Bus/Lorry/Tanker)
exceed 20% of violations in a hotspot.
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

    nav_keys = ["nav_map", "nav_priority_list", "nav_simulator", "nav_temporal"]
    nav_labels = {
        "nav_map": t("nav_map", lang),
        "nav_priority_list": t("nav_priority_list", lang),
        "nav_simulator": t("nav_simulator", lang),
        "nav_temporal": t("nav_temporal", lang),
        "nav_insights": "City Insights",
    }
    all_nav = nav_keys + ["nav_insights"]
    page_key = st.sidebar.radio(
        "Navigate", all_nav, format_func=lambda k: nav_labels.get(k, k)
    )

    st.sidebar.divider()

    stations = sorted(df["police_station"].unique().tolist())
    all_label = t("all_stations", lang)
    selected_station = st.sidebar.selectbox(t("station_filter", lang), [all_label] + stations)
    filtered_df = (
        df if selected_station == all_label
        else df[df["police_station"] == selected_station].reset_index(drop=True)
    )

    st.sidebar.divider()
    st.sidebar.caption(
        "Data: 115,400 approved violations\n"
        "Period: Nov 2023 - Mar 2024\n"
        "Hotspots: 120 (DBSCAN + sub-clustering)\n"
        "Rush-hour signal: morning IST 7-12"
    )
    _sidebar_methodology(lang)

    if page_key == "nav_map":
        page_map(filtered_df, lang)
    elif page_key == "nav_priority_list":
        page_priority_list(filtered_df, lang)
    elif page_key == "nav_simulator":
        page_simulator(filtered_df, lang)
    elif page_key == "nav_insights":
        page_insights(lang)
    else:
        page_temporal(filtered_df, lang)


main()