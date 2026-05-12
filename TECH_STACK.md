# Tech Stack
## KL CommuteMind — Technology Decisions & Rationale

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React PWA)                       │
│  MapLibre GL  │  Zustand  │  React Query  │  Service Worker    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
   │  FastAPI    │  │  Supabase   │  │  Claude API     │
   │  (Python)   │  │  (Postgres) │  │  (NL parsing)   │
   │  ML serving │  │  + Realtime │  └─────────────────┘
   └──────┬──────┘  └──────┬──────┘
          │                │
   ┌──────▼──────┐  ┌──────▼──────────────────────────┐
   │  ML Models  │  │  GTFS Pipeline (Python worker)  │
   │  (XGBoost)  │  │  Polls api.data.gov.my every 30s│
   └─────────────┘  └─────────────────────────────────┘
```

---

## Frontend

### React 18 + Vite
**Why:** Fast HMR, excellent PWA plugin support, TypeScript out of the box. Vite builds are significantly smaller than CRA for map-heavy apps.

### TypeScript
**Why:** Mandatory for a complex app with GTFS data structures, ML response types, and multi-modal route objects. Prevents entire classes of bugs at compile time.

### MapLibre GL JS
**Why:** Open-source fork of Mapbox GL JS — identical API, zero licensing cost. Renders WebGL-accelerated vector maps. Supports custom layers for heatmaps and route polylines.  
**Tile source:** MapTiler free tier (50k views/month) or OpenFreeMap (unlimited, free)

### Zustand
**Why:** Lightweight global state for active journey, user preferences, and cached routes. Avoids Redux boilerplate for a 5-day build.

### React Query (TanStack Query)
**Why:** Handles GTFS realtime polling (30s intervals), automatic background refetch, and stale-while-revalidate caching — critical for a real-time app.

### Tailwind CSS
**Why:** Rapid UI development. Utility classes mean no context-switching between CSS files during a tight build window.

---

## Data Sources (All Free)

### Malaysia Open API — GTFS Static
```
GET https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl
GET https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl
GET https://api.data.gov.my/gtfs-static/ktmb
```
**What it gives:** All stops, routes, trips, stop_times, shapes for MRT/LRT/Monorail/KTM/Rapid Bus KL. Downloaded as ZIP, parsed into a local graph.  
**License:** Open government data, free to use.

### Malaysia Open API — GTFS Realtime
```
GET https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl
GET https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-mrtfeeder
```
**What it gives:** Live GPS positions of buses updated every 30s in protobuf format.  
**Note:** Rail realtime positions not yet stable — compensate with ML-predicted delay scores.

### OpenRouteService — Walking Directions
```
POST https://api.openrouteservice.org/v2/directions/foot-walking
```
**Free tier:** 2,000 requests/day, 40/min. Sufficient for demo + production light use.  
**Used for:** First-mile (origin → first station) and last-mile (final station → destination) walking legs.

### Nominatim — Geocoding
```
GET https://nominatim.openstreetmap.org/search?q=KLCC&format=json
```
**Free:** No key needed for light usage.  
**Used for:** Converting text place names to coordinates.

### Open-Meteo — Weather
```
GET https://api.open-meteo.com/v1/forecast?latitude=3.14&longitude=101.69&current=rain
```
**Free:** Unlimited calls, no key.  
**Used for:** Rain detection → adjust walking time estimates.

---

## Backend

### Python + FastAPI
**Why:** Fast to write, excellent ML library ecosystem (scikit-learn, XGBoost, pandas). FastAPI's automatic OpenAPI docs make it easy to present to evaluators.  
**Deployed on:** Railway.app free tier or Render.com free tier.

### GTFS Pipeline Worker
A Python script that:
1. Downloads GTFS Static ZIPs on startup
2. Parses `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt` into a NetworkX graph
3. Polls GTFS Realtime every 30s and updates vehicle position store
4. Runs anomaly detection (bunching, gaps) on each poll cycle
5. Persists disruption events to Supabase

### Supabase (PostgreSQL + Realtime)
**Why:** Free tier (500MB), built-in REST API, Realtime subscriptions for crowdsource reports, and Row-Level Security for user data.  
**Tables:**
```sql
delay_reports      -- crowdsourced delay submissions
disruption_events  -- ML + anomaly detected disruptions  
saved_commutes     -- user saved routes (anonymous UUID)
crowd_scores       -- per-station crowd density scores
```

---

## AI / ML Stack

### Routing Engine — Custom Graph Algorithm
- Build adjacency graph from GTFS Static data using **NetworkX**
- Edge weights = scheduled travel time + live delay overlay
- Algorithm: **Modified Dijkstra with transfer penalty** (penalises each line change by 3 minutes equivalent)
- Multi-criteria output: fastest / fewest transfers / least walking (3 Pareto-optimal routes returned)

### Disruption Prediction — XGBoost Classifier
```python
Features:
  - hour_of_day (0-23)
  - day_of_week (0-6)  
  - is_public_holiday (bool)
  - rain_intensity (float)
  - recent_report_count_15min (int)
  - vehicle_bunching_score (float)  # derived from GTFS-RT
  - historical_delay_rate_this_hour (float)  # from training data

Output:
  - disruption_probability (0.0 - 1.0)
  - expected_delay_minutes (float)
  - confidence (low/medium/high)
```
**Training data:** 12+ months of GTFS Realtime bus position data from Greater KL Mobilities dataset (krinstitute.org) — freely available as Parquet files.

### Crowd Density Model — Exponential Smoothing + Bayesian Update
- Base prior: historical ridership by hour from data.gov.my public transport dashboard
- Updates: crowdsource reports trigger Bayesian update to posterior crowd estimate
- Decay: each report's weight decays with half-life of 10 minutes
- Output: crowd score 0–100 per station, updated every 2 minutes

### "Should I Leave Now?" Decision Engine
```python
def should_leave_now(saved_commute, current_time, user_deadline):
    p_disruption = ml_model.predict(saved_commute.route, current_time)
    travel_time_dist = historical_travel_times[saved_commute.route][current_time.hour]
    p99_travel_time = np.percentile(travel_time_dist, 99)
    buffer = user_deadline - current_time - timedelta(minutes=p99_travel_time)
    
    if p_disruption < 0.2 and buffer > 10:   return "GREEN"
    if p_disruption < 0.5 and buffer > 5:    return "YELLOW"
    return "RED"
```

### Natural Language Route Search — Claude API
```python
system_prompt = """
You are a transit assistant for Kuala Lumpur.
Extract: origin, destination, constraints from user query.
Return JSON only: {"origin": str, "destination": str, "avoid": [str], "prefer": str}
Supports Malay and English mixed input.
"""
```
The extracted JSON is passed directly to the routing engine. No LLM is involved in routing — it only handles intent parsing.

### Anomaly Detection — Statistical Process Control
- Monitors vehicle position data stream
- Flags **bunching**: 3+ vehicles on same route within 500m radius
- Flags **ghost gap**: no vehicle detected on a route for > 12 minutes during service hours
- Flags **speed anomaly**: average segment speed < 30% of historical baseline
- Each flag triggers a disruption event with severity score

---

## Deployment

| Service | Platform | Cost |
|---|---|---|
| Frontend PWA | Vercel (free) | RM 0 |
| FastAPI backend | Railway.app (free) | RM 0 |
| Database | Supabase (free) | RM 0 |
| ML model hosting | Bundled with FastAPI | RM 0 |
| Map tiles | OpenFreeMap / MapTiler free | RM 0 |
| Transit data | api.data.gov.my | RM 0 |
| Weather | Open-Meteo | RM 0 |
| **Total** | | **RM 0** |

---

## Developer Tooling

| Tool | Purpose |
|---|---|
| pnpm | Fast package management |
| ESLint + Prettier | Code style |
| Vitest | Unit tests for routing logic |
| Playwright | E2E tests for core user flows |
| GitHub Actions | CI/CD to Vercel on push |
| Sentry (free) | Error monitoring in production |
