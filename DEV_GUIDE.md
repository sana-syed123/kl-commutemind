# Development Guide & Implementation Roadmap
## KL CommuteMind

---

## Repository Structure

```
kl-commutemind/
├── frontend/                    # React PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── TransitMap.tsx        # MapLibre map container
│   │   │   │   ├── RoutePolyline.tsx     # Draw route on map
│   │   │   │   ├── StationMarker.tsx     # Stop markers w/ crowd score
│   │   │   │   └── CrowdHeatmap.tsx      # Station heatmap overlay
│   │   │   ├── Planner/
│   │   │   │   ├── RouteSearch.tsx       # Origin/dest input + NL
│   │   │   │   ├── RouteCard.tsx         # Single route option display
│   │   │   │   ├── LegTimeline.tsx       # Leg-by-leg breakdown
│   │   │   │   └── DisruptionBadge.tsx   # ML prediction badge
│   │   │   ├── HomeScreen/
│   │   │   │   ├── SavedCommutCard.tsx   # "Should I leave?" card
│   │   │   │   ├── AIVerdict.tsx         # GREEN/YELLOW/RED display
│   │   │   │   └── DisruptionFeed.tsx    # Active disruptions list
│   │   │   └── Report/
│   │   │       └── QuickReport.tsx       # One-tap crowd report
│   │   ├── hooks/
│   │   │   ├── useGTFSRealtime.ts        # Polls GTFS RT via React Query
│   │   │   ├── useDisruptionPrediction.ts
│   │   │   ├── useRouteSearch.ts
│   │   │   └── useCommuteLearner.ts      # Client-side preference ML
│   │   ├── services/
│   │   │   ├── api.ts                    # FastAPI client
│   │   │   ├── nlParser.ts              # Claude API calls
│   │   │   ├── pushNotifications.ts     # Web Push setup
│   │   │   └── storage.ts               # IndexedDB wrapper
│   │   ├── store/
│   │   │   └── useAppStore.ts            # Zustand store
│   │   └── types/
│   │       ├── gtfs.ts                   # GTFS type definitions
│   │       ├── route.ts                  # Route/leg types
│   │       └── ml.ts                     # ML response types
│   ├── public/
│   │   └── sw.js                         # Service Worker
│   └── vite.config.ts
│
├── backend/                     # FastAPI + ML
│   ├── app/
│   │   ├── main.py               # FastAPI app entry
│   │   ├── routers/
│   │   │   ├── routes.py         # /api/routes/*
│   │   │   ├── disruptions.py    # /api/disruptions/*
│   │   │   ├── stations.py       # /api/stations/*
│   │   │   ├── reports.py        # /api/reports/*
│   │   │   └── nl.py             # /api/nl/*
│   │   ├── services/
│   │   │   ├── gtfs_graph.py     # NetworkX graph builder
│   │   │   ├── routing_engine.py # Dijkstra + A* implementation
│   │   │   ├── disruption_ml.py  # XGBoost inference
│   │   │   ├── anomaly_detector.py
│   │   │   ├── crowd_estimator.py
│   │   │   ├── leave_now_engine.py
│   │   │   └── claude_parser.py  # NL → JSON via Claude
│   │   └── workers/
│   │       ├── gtfs_poller.py    # 30s GTFS RT polling
│   │       └── monitor_job.py    # Push alert monitoring
│   ├── models/
│   │   ├── disruption_clf.ubj    # Trained XGBoost classifier
│   │   └── disruption_reg.ubj    # Trained XGBoost regressor
│   ├── data/
│   │   └── gtfs/                 # Downloaded GTFS ZIPs (gitignored)
│   ├── training/
│   │   └── train_disruption_model.py
│   └── requirements.txt
│
└── docs/                        # This documentation folder
```

---

## Day-by-Day Build Plan

### Day 1 — Data Pipeline & Routing Core

**Tasks:**
- [ ] Download all GTFS Static ZIPs from api.data.gov.my (Prasarana rail, Prasarana bus KL, KTMB)
- [ ] Write GTFS parser: `stops.txt` → nodes, `stop_times.txt` → edges with time weights
- [ ] Build NetworkX DiGraph, implement Dijkstra with transfer penalty
- [ ] Test routing: KLCC → Bukit Bintang, Kepong → Mid Valley
- [ ] Set up FastAPI skeleton with `/api/routes/plan` endpoint
- [ ] Verify Supabase connection + create tables

**Checkpoint:** Can return a valid 3-leg route with correct timings via API call.

---

### Day 2 — ML Training + Realtime Integration

**Tasks:**
- [ ] Download Greater KL Mobilities Parquet dataset from krinstitute.org
- [ ] Run feature engineering pipeline (`train_disruption_model.py`)
- [ ] Train XGBoost classifier + regressor, evaluate on held-out time slice
- [ ] Save models to `models/` directory
- [ ] Write GTFS Realtime poller — parse protobuf, extract vehicle positions
- [ ] Implement anomaly detector (bunching, gap, speed)
- [ ] Wire ML inference into route response (`disruption` field)

**Checkpoint:** Route response includes disruption probability from live model.

---

### Day 3 — AI Features

**Tasks:**
- [ ] Implement "Should I Leave Now?" engine with GREEN/YELLOW/RED logic
- [ ] Integrate Claude API for NL route parsing
- [ ] Implement crowd estimator with Bayesian update
- [ ] Implement push notification monitoring job
- [ ] Set up weather integration (Open-Meteo → walking time adjustment)
- [ ] Add walking legs via OpenRouteService API

**Checkpoint:** End-to-end: type "nak pergi KLCC" → get routed → see AI verdict.

---

### Day 4 — Frontend

**Tasks:**
- [ ] Set up React + Vite + TypeScript + Tailwind + MapLibre
- [ ] Build TransitMap with route polylines and station markers
- [ ] Build RouteSearch with NL support
- [ ] Build RouteCard with leg timeline and disruption badge
- [ ] Build SavedCommuteCard with AIVerdict component
- [ ] Implement QuickReport (crowdsource reporting)
- [ ] Set up Service Worker for push notifications
- [ ] Implement client-side preference learner (IndexedDB)

**Checkpoint:** Full user flow working in browser — plan, view route, save, get alert.

---

### Day 5 — Polish, Accessibility, Deploy

**Tasks:**
- [ ] Add accessibility toggle (lift-required routing)
- [ ] Add carbon tracker + cost comparison display
- [ ] Implement offline mode (cache last-known schedule in Service Worker)
- [ ] Lighthouse audit — target score > 85
- [ ] Deploy backend to Railway.app
- [ ] Deploy frontend to Vercel
- [ ] Write environment variable docs

**Checkpoint:** App live at `https://kl-commutemind.vercel.app`.

---

### Day 6 — Demo Video + Documentation

**Tasks:**
- [ ] Record demo: home screen → NL search → route options → save → AI alert
- [ ] Show technical explainer: disruption prediction, anomaly detector, leave-now engine
- [ ] Finalize PROJECT_DOCUMENTATION.md (1–2 pages for submission)
- [ ] Submit via Google Form before 17 May 11:59 PM

---

## Environment Variables

### Frontend (.env)
```bash
VITE_API_BASE_URL=https://kl-commutemind-api.railway.app
VITE_MAPTILER_KEY=your_maptiler_api_key_here   # free at maptiler.com
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here  # for client-side NL parsing
```

### Backend (.env)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key
ORS_API_KEY=your_openrouteservice_key   # free at openrouteservice.org
OPEN_METEO_BASE=https://api.open-meteo.com
```

---

## Key Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "maplibre-gl": "^4.4.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.40.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite-plugin-pwa": "^0.20.0"
  }
}
```

### Backend (requirements.txt)
```
fastapi==0.111.0
uvicorn==0.30.0
xgboost==2.0.3
scikit-learn==1.5.0
networkx==3.3
pandas==2.2.2
numpy==1.26.4
gtfs-realtime-bindings==1.0.0
httpx==0.27.0
supabase==2.5.0
apscheduler==3.10.4         # for background polling jobs
pywebpush==2.0.0             # for Web Push notifications
python-dotenv==1.0.1
```

---

## Testing

### Routing Engine Tests (Vitest)
```typescript
// Test that Dijkstra returns correct route
test("KLCC to Bukit Bintang via MRT Putrajaya", () => {
  const route = routingEngine.plan("KJ15", "PY22", { prefer: "fastest" });
  expect(route.legs[0].type).toBe("transit");
  expect(route.legs[0].line).toContain("Putrajaya");
  expect(route.total_duration_minutes).toBeLessThan(15);
});
```

### ML Model Tests (pytest)
```python
def test_disruption_prediction_peak_hour():
    features = build_features("rapid-rail-kl-KJ", datetime(2026, 5, 12, 8, 30))
    prob = clf.predict_proba([features])[0][1]
    # Peak hour should have higher disruption probability
    assert prob > 0.3

def test_no_disruption_off_peak():
    features = build_features("rapid-rail-kl-KJ", datetime(2026, 5, 12, 14, 0))
    prob = clf.predict_proba([features])[0][1]
    assert prob < 0.5
```

---

## Demo Script (2-min elevator pitch flow)

1. **Open home screen** → Show saved commute "Kepong → KLCC" with GREEN verdict ("Leave in 6 min")
2. **Trigger disruption** (manually set high probability in demo mode) → Card flips to RED with alternative route
3. **NL search** → Type "fastest way to Midvalley from Bangsar elak monorail" → Show it parses correctly
4. **Route result** → Show 3 options, tap fastest, walk through leg timeline + crowd score + fare estimate
5. **Quick report** → Tap "Report delay" → show it updates disruption feed in real time
6. **Technical slide** → Show architecture diagram, ML pipeline, prediction feature importances chart

**Time target:** 2 minutes exactly.
