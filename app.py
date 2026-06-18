import streamlit as st
import folium
from streamlit_folium import st_folium

st.set_page_config(
    page_title="ParkPulse AI",
    page_icon="P",
    layout="wide",
)

st.title("PARKPULSE AI")
st.caption("Decision Support System for Parking-Induced Traffic Congestion -- Bangalore")

st.info(
    "Phase 1 skeleton. Real hotspot detection, impact scoring, and officer allocation coming in Phase 3-5.",
    icon="i",
)

BANGALORE = [12.9716, 77.5946]
m = folium.Map(location=BANGALORE, zoom_start=12, tiles="CartoDB dark_matter")
folium.Marker(BANGALORE, tooltip="Bangalore city center").add_to(m)

st_folium(m, use_container_width=True, height=500)
