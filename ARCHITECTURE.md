# Architecture & System Design
## KL CommuteMind

---

## 1. High-Level System Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║                        USER DEVICES                                  ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │              React PWA (Vite + TypeScript)                      │ ║
║  │                                                                  │ ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │ ║
║  │  │ MapLibre │  │ Route UI │  │  AI Card │  │ Service Worker│  │ ║
║  │  │  GL Map  │  │ Planner  │  │ (Leave?) │  │ Push Notifs   │  │ ║
║  │  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │ ║
║  │                                                                  │ ║
║  │  ┌──────────────────────┐  ┌───────────────────────────────┐   │ ║
║  │  │  Zustand State Store │  │  IndexedDB (local ML prefs)   │   │ ║
║  │  └──────────────────────┘  └───────────────────────────────┘   │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════╤═══════════════════════════════════════════╝
                           │ REST / WebSocket
   ┌───────────────────────┼────────────────────────┐
   │                       │                        │
   ▼                       ▼                        ▼
╔══════════════╗  ╔═════════════════╗  ╔═══════════════════╗
║  FastAPI     ║  ║    Supabase     ║  ║   Claude API      ║
║  ML Backend  ║  ║   PostgreSQL    ║  ║  (NL parsing)     ║
║              ║  ║   + Realtime    ║  ╚═══════════════════╝
║  ┌─────────┐ ║  ║                 ║
║  │XGBoost  │ ║  ║  delay_reports  ║
║  │Disrupt. │ ║  ║  disruptions    ║
║  │ Model   │ ║  ║  saved_commutes ║
║  └─────────┘ ║  ║  crowd_scores   ║
║              ║  ╚════════╤════════╝
║  ┌─────────┐ ║           │
║  │ GTFS    │ ║           │
║  │ Graph   │ ║  ╔════════▼═══════════════╗
║  │ Engine  │ ║  ║  GTFS Worker (Python)  ║
║  └─────────┘ ║  ║                        ║
╚══════════════╝  ║  Polls api.data.gov.my ║
                  ║  every 30 seconds      ║
                  ║  Anomaly detection     ║
                  ╚════════════════════════╝
```

---

## 2. GTFS Data Pipeline

```
api.data.gov.my
      │
      │  ZIP download (on startup + daily refresh)
      ▼
┌─────────────────────────────────────┐
│         GTFS Static Parser          │
│                                     │
│  stops.txt ──────────► stop nodes   │
│  routes.txt ─────────► route meta   │
│  trips.txt ──────────► trip IDs     │
│  stop_times.txt ─────► edge weights │
│  shapes.txt ─────────► polylines    │
└──────────────────┬──────────────────┘
                   │
                   ▼
         NetworkX DiGraph
         ┌───────────────┐
         │  Nodes: stops │
         │  Edges: legs  │
         │  Weight: time │
         └───────┬───────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
  Dijkstra   Transfer    Walking
  Routing    Penalty     Overlay
  Engine     (+3 min)   (ORS API)

      │
      ▼ (every 30s)
┌─────────────────────────────────────┐
│      GTFS Realtime Poller           │
│                                     │
│  vehicle_positions (protobuf)       │
│  → decode → match to stop sequence  │
│  → compute delay vs schedule        │
│  → update edge weights in graph     │
│  → run anomaly detection            │
└──────────────────┬──────────────────┘
                   │
          anomaly detected?
                   │
          ┌────────▼────────┐
          │  Supabase write │
          │  disruption_    │
          │  events table   │
          └─────────────────┘
```

---

## 3. Trip Planning Flow

```
User inputs origin + destination
              │
              ▼
     ┌─────────────────┐
     │ Is it NL query? │ ──yes──► Claude API → parse intent
     └────────┬────────┘               │
              │ no                     │ structured {origin, dest, constraints}
              └───────────────────────►│
                                       ▼
                            Geocode via Nominatim
                                       │
                                       ▼
                          Snap to nearest GTFS stop
                                       │
                                       ▼
                     ┌─────────────────────────────┐
                     │     Routing Engine           │
                     │                              │
                     │  1. Run Dijkstra (fastest)   │
                     │  2. Run Dijkstra (fewest Δ)  │
                     │  3. Run Dijkstra (min walk)  │
                     └──────────────┬──────────────┘
                                    │ 3 candidate routes
                                    ▼
                     ┌──────────────────────────────┐
                     │   Enrichment Layer            │
                     │                              │
                     │  + ML disruption probability  │
                     │  + Crowd scores per station   │
                     │  + Weather walking adjustment │
                     │  + ORS walking legs           │
                     │  + Fare estimation            │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                         Ranked route results
                         displayed to user
```

---

## 4. ML Disruption Prediction Pipeline

```
TRAINING (offline, pre-built model)
─────────────────────────────────────────────────────────
Historical GTFS-RT data (12 months)         Public holidays
from krinstitute.org/gklmob                 calendar (Malaysia)
         │                                        │
         └────────────────┬───────────────────────┘
                          │
                          ▼
              Feature Engineering
              ┌────────────────────────────┐
              │ hour_of_day                │
              │ day_of_week                │
              │ is_public_holiday          │
              │ vehicle_bunching_score     │
              │ gap_minutes_on_route       │
              │ historical_delay_rate      │
              │ rain_intensity             │
              └────────────────────────────┘
                          │
                          ▼
              XGBoost Classifier
              (binary: disrupted / not)
              + XGBoost Regressor
              (magnitude: delay minutes)
                          │
                          ▼
              Saved as model.pkl
              Loaded by FastAPI on startup

INFERENCE (every route request)
─────────────────────────────────────────────────────────
Current time + route_id
         │
         ▼
  Fetch live features:
  - GTFS-RT vehicle positions → compute bunching score
  - Open-Meteo → rain intensity
  - Supabase → recent report count (last 15 min)
         │
         ▼
  model.predict(features)
         │
         ▼
  { probability: 0.73, delay_minutes: 8.2, confidence: "high" }
         │
         ▼
  Attached to route response → shown in UI
```

---

## 5. Push Notification Architecture

```
User saves commute "Home → Office"
              │
              ▼
   Service Worker registered
   Push subscription stored
   in Supabase (anonymous UUID)
              │
              │ (background, every 5 minutes)
              ▼
   ┌─────────────────────────────┐
   │   FastAPI Monitoring Job    │
   │                             │
   │  For each saved commute:    │
   │  → Compute disruption score │
   │  → Compare to user threshold│
   │  → If exceeded: push alert  │
   └─────────────┬───────────────┘
                 │
                 ▼
   Web Push Notification sent
   to Service Worker
                 │
                 ▼
   "⚠️ Kelana Jaya line running
    8 min late. Leave 10 min early
    or tap to see alternatives."
```

---

## 6. Database Schema

```sql
-- Crowdsourced delay/crowd reports
CREATE TABLE delay_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id    TEXT NOT NULL,
  stop_id     TEXT,
  report_type TEXT CHECK (report_type IN ('delay','crowd','lift_broken','other')),
  severity    INT CHECK (severity BETWEEN 1 AND 5),
  trust_score FLOAT DEFAULT 1.0,   -- updated by anomaly filter
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ           -- set to created_at + 30 minutes
);

-- ML + anomaly detected disruptions
CREATE TABLE disruption_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id        TEXT NOT NULL,
  disruption_type TEXT CHECK (disruption_type IN ('bunching','gap','speed','reported')),
  severity        FLOAT,            -- 0.0 to 1.0
  delay_estimate  FLOAT,            -- minutes
  source          TEXT,             -- 'ml_model' | 'anomaly_detector' | 'crowdsource'
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- User saved commutes (no PII, anonymous UUID)
CREATE TABLE saved_commutes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_token       TEXT NOT NULL,   -- client-generated anonymous UUID
  name             TEXT,            -- "Home → Office"
  origin_stop_id   TEXT NOT NULL,
  dest_stop_id     TEXT NOT NULL,
  route_json       JSONB,           -- serialised preferred route
  alert_threshold  INT DEFAULT 10,  -- minutes
  push_endpoint    TEXT,            -- Web Push subscription
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Per-station crowd scores (materialised, updated every 2 min)
CREATE TABLE crowd_scores (
  stop_id       TEXT PRIMARY KEY,
  score         FLOAT,             -- 0 (empty) to 100 (packed)
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Key Technical Decisions & Trade-offs

| Decision | Choice | Alternative | Reason |
|---|---|---|---|
| Routing algorithm | Custom Dijkstra on GTFS graph | OpenTripPlanner | Full control over delay overlay; OTP is heavy to self-host in 5 days |
| ML serving | FastAPI + XGBoost | Vertex AI / SageMaker | Free, fast setup; sufficient for demo scale |
| Real-time state | React Query polling | WebSocket | Simpler; 30s refresh is acceptable for transit context |
| Map renderer | MapLibre GL | Google Maps | Zero licensing cost; identical rendering quality |
| Push notifications | Web Push API | Firebase FCM | No vendor dependency; works natively in browsers |
| NL parsing | Claude API | Fine-tuned local model | Quality >> latency for this use case; 1 API call per search |
| User identity | Anonymous UUID (localStorage) | Auth system | Challenge spec says auth not required; reduces friction |
