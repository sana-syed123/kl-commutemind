# API Reference
## KL CommuteMind — FastAPI Backend

Base URL: `https://kl-commutemind-api.railway.app`

---

## Endpoints

### POST /api/routes/plan
Plan a multi-modal route between two points.

**Request:**
```json
{
  "origin": { "lat": 3.1478, "lng": 101.6953 },
  "destination": { "lat": 3.1580, "lng": 101.7107 },
  "preferences": {
    "avoid_lines": [],
    "prefer": "fastest",
    "arrive_by": null,
    "depart_at": "2026-05-17T08:30:00"
  }
}
```

**Response:**
```json
{
  "routes": [
    {
      "id": "route_abc123",
      "label": "fastest",
      "total_duration_minutes": 24,
      "total_walking_meters": 420,
      "transfers": 1,
      "fare_estimate_myr": 2.10,
      "co2_saved_vs_car_grams": 1240,
      "disruption": {
        "probability": 0.18,
        "expected_delay_minutes": 0,
        "confidence": "high"
      },
      "legs": [
        {
          "type": "walk",
          "from": "Current Location",
          "to": "KLCC Station",
          "duration_minutes": 6,
          "distance_meters": 420,
          "geometry": { "type": "LineString", "coordinates": [[...]] }
        },
        {
          "type": "transit",
          "line": "MRT Putrajaya Line",
          "line_color": "#9B59B6",
          "from_stop": "KLCC",
          "to_stop": "Bukit Bintang",
          "departure_time": "08:36",
          "arrival_time": "08:39",
          "stops_count": 1,
          "crowd_score": 72,
          "realtime_delay_minutes": 0,
          "geometry": { "type": "LineString", "coordinates": [[...]] }
        }
      ]
    }
  ],
  "ai_recommendation": "GREEN",
  "ai_message": "Route looks clear. Good time to leave.",
  "generated_at": "2026-05-17T08:22:00Z"
}
```

---

### GET /api/disruptions/active
Get all currently active disruptions.

**Response:**
```json
{
  "disruptions": [
    {
      "id": "dis_xyz789",
      "route_id": "rapid-rail-kl-KJ",
      "route_name": "LRT Kelana Jaya Line",
      "type": "gap",
      "severity": 0.75,
      "delay_estimate_minutes": 12,
      "source": "anomaly_detector",
      "started_at": "2026-05-17T08:10:00Z",
      "affected_stops": ["KJ10", "KJ11", "KJ12"],
      "message": "No vehicles detected on KJ line between Taman Jaya and Masjid Jamek for 12 minutes."
    }
  ]
}
```

---

### GET /api/stations/{stop_id}/crowd
Get crowd score for a specific station.

**Response:**
```json
{
  "stop_id": "KJ15",
  "stop_name": "KLCC",
  "crowd_score": 68,
  "crowd_label": "Busy",
  "updated_at": "2026-05-17T08:20:00Z",
  "trend": "increasing"
}
```

---

### POST /api/reports/submit
Submit a crowdsourced delay or crowd report.

**Request:**
```json
{
  "route_id": "rapid-rail-kl-KJ",
  "stop_id": "KJ15",
  "report_type": "delay",
  "severity": 3,
  "user_token": "anon_uuid_here"
}
```

**Response:**
```json
{
  "accepted": true,
  "trust_score": 1.0,
  "message": "Report received. Thank you."
}
```

---

### POST /api/nl/parse
Parse a natural language query into structured route intent.

**Request:**
```json
{
  "query": "nak pergi Midvalley dari Chow Kit elak LRT"
}
```

**Response:**
```json
{
  "origin": "Chow Kit",
  "destination": "Mid Valley",
  "avoid_lines": ["LRT Kelana Jaya"],
  "prefer": "fastest",
  "arrive_by": null,
  "depart_at": null,
  "confidence": "high"
}
```

---

### GET /api/predict/disruption
Get disruption prediction for a route at a given time.

**Query params:** `route_id`, `datetime` (ISO 8601)

**Response:**
```json
{
  "route_id": "rapid-rail-kl-KJ",
  "datetime": "2026-05-17T08:30:00",
  "disruption_probability": 0.62,
  "expected_delay_minutes": 7.4,
  "confidence": "medium",
  "contributing_factors": [
    "Peak hour (high historical delay rate)",
    "2 crowd reports in last 15 minutes",
    "Vehicle bunching detected at KJ12"
  ]
}
```

---

### POST /api/commutes/save
Save a commute for monitoring and push alerts.

**Request:**
```json
{
  "user_token": "anon_uuid",
  "name": "Home to Office",
  "origin_stop_id": "KJ2",
  "dest_stop_id": "KJ15",
  "route_json": { "...": "..." },
  "alert_threshold_minutes": 10,
  "push_subscription": { "endpoint": "...", "keys": { "...": "..." } }
}
```

---

## External APIs Used

| API | Endpoint | Auth | Cost |
|---|---|---|---|
| GTFS Static | api.data.gov.my/gtfs-static/* | None | Free |
| GTFS Realtime | api.data.gov.my/gtfs-realtime/* | None | Free |
| OpenRouteService | api.openrouteservice.org/v2/directions | API key (free) | Free |
| Nominatim | nominatim.openstreetmap.org/search | None | Free |
| Open-Meteo | api.open-meteo.com/v1/forecast | None | Free |
| Claude API | api.anthropic.com/v1/messages | API key | ~RM0.01/query |
| MapTiler tiles | api.maptiler.com/tiles | API key (free) | Free tier |
