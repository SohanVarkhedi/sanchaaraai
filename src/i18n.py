# Kannada strings are a first draft, confirm with a native speaker before relying on them in front of judges.

translations = {
    "app_title": {"en": "PARKPULSE AI", "kn": "PARKPULSE AI"},
    "app_subtitle": {
        "en": "Decision Support System for Parking-Induced Traffic Congestion -- Bangalore",
        "kn": "ಪಾರ್ಕಿಂಗ್ ಸಮಸ್ಯೆಯಿಂದ ಉಂಟಾಗುವ ಸಂಚಾರ ದಟ್ಟಣೆಗಾಗಿ ನಿರ್ಣಯ ಬೆಂಬಲ ವ್ಯವಸ್ಥೆ -- ಬೆಂಗಳೂರು",
    },
    "nav_map": {"en": "Map", "kn": "ನಕ್ಷೆ"},
    "nav_priority_list": {"en": "Priority List", "kn": "ಆದ್ಯತಾ ಪಟ್ಟಿ"},
    "nav_simulator": {"en": "Simulator", "kn": "ಸಿಮ್ಯುಲೇಟರ್"},
    "map_header": {"en": "Hotspot Map", "kn": "ಹಾಟ್‌ಸ್ಪಾಟ್ ನಕ್ಷೆ"},
    "hotspots_detected": {"en": "Hotspots detected", "kn": "ಪತ್ತೆಯಾದ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು"},
    "top_hotspot_score": {"en": "Top hotspot score", "kn": "ಅತಿ ಹೆಚ್ಚು ಸ್ಕೋರ್"},
    "total_violations_mapped": {"en": "Total violations mapped", "kn": "ಒಟ್ಟು ಉಲ್ಲಂಘನೆಗಳು"},
    "priority_list_header": {"en": "Priority List", "kn": "ಆದ್ಯತಾ ಪಟ್ಟಿ"},
    "simulator_header": {"en": "Simulator", "kn": "ಸಿಮ್ಯುಲೇಟರ್"},
    "officers_available": {"en": "Officers available", "kn": "ಲಭ್ಯ ಅಧಿಕಾರಿಗಳು"},
    "tow_trucks_available": {"en": "Tow trucks available", "kn": "ಲಭ್ಯ ಟೋ ಟ್ರಕ್‌ಗಳು"},
    "recommended_officers": {"en": "Recommended officers", "kn": "ಶಿಫಾರಸು ಮಾಡಲಾದ ಅಧಿಕಾರಿಗಳು"},
    "covered": {"en": "Covered", "kn": "ಪೂರ್ಣ ವ್ಯಾಪ್ತಿ"},
    "partial": {"en": "Partial", "kn": "ಭಾಗಶಃ ವ್ಯಾಪ್ತಿ"},
    "uncovered": {"en": "Uncovered", "kn": "ವ್ಯಾಪ್ತಿಯಿಲ್ಲ"},
    "language_toggle": {"en": "Language", "kn": "ಭಾಷೆ"},
    "legend_low": {"en": "Low impact", "kn": "ಕಡಿಮೆ ಪ್ರಭಾವ"},
    "legend_high": {"en": "High impact", "kn": "ಹೆಚ್ಚು ಪ್ರಭಾವ"},
    "about_data_title": {"en": "About this data", "kn": "ಈ ದತ್ತಾಂಶದ ಬಗ್ಗೆ"},
    "col_impact_score": {"en": "Impact Score", "kn": "ಪ್ರಭಾವ ಅಂಕ"},
    "col_violations": {"en": "Violations", "kn": "ಉಲ್ಲಂಘನೆಗಳು"},
    "col_officers_rec": {"en": "Officers Rec.", "kn": "ಶಿಫಾರಸು ಅಧಿಕಾರಿಗಳು"},
    "station_filter": {"en": "Filter by police station", "kn": "ಪೊಲೀಸ್ ಠಾಣೆಯಿಂದ ಫಿಲ್ಟರ್ ಮಾಡಿ"},
    "all_stations": {"en": "All stations", "kn": "ಎಲ್ಲ ಠಾಣೆಗಳು"},
    "spans_multiple_stations": {"en": "Spans multiple stations", "kn": "ಬಹು ಠಾಣೆಗಳನ್ನು ಒಳಗೊಂಡಿದೆ"},
    "col_dominant_vehicle": {"en": "Top Vehicle", "kn": "ಪ್ರಮುಖ ವಾಹನ"},
}


def t(key: str, lang: str) -> str:
    return translations.get(key, {}).get(lang) or translations.get(key, {}).get("en") or key
