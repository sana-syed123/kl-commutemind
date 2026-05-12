# ML & AI Models Specification
## KL CommuteMind

---

## Overview

CommuteMind uses a layered AI/ML approach — each model has a specific, scoped job. No single model tries to do everything.

```
┌──────────────────────────────────────────────────────────┐
│              AI/ML Layer Summary                          │
│                                                          │
│  1. XGBoost Disruption Classifier  →  Will this route    │
│                                        be disrupted?     │
│  2. XGBoost Delay Regressor        →  By how many min?  │
│  3. Exponential Smoothing +         →  How crowded is    │
│     Bayesian Update                    this station?     │
│  4. Statistical Anomaly Detector   →  Is something      │
│                                        wrong right now?  │
│  5. Decision Engine (rule-based ML)→  Should I leave?   │
│  6. Claude API (LLM)               →  What did the      │
│                                        user mean?        │
│  7. Collaborative Filter (client)  →  Route preferences  │
└──────────────────────────────────────────────────────────┘
```

---

## Model 1 & 2: Disruption Prediction

### Problem
Predict, at any given moment, whether a specific route segment will experience a delay, and estimate its magnitude.

### Training Data
- Source: Greater KL Mobilities dataset (krinstitute.org) — 12+ months of GTFS Realtime vehicle position pings, sampled every 15 seconds
- Volume: ~40M rows after preprocessing
- Labels: `is_delayed` (bool) derived when observed travel time > scheduled * 1.25

### Feature Engineering

```python
features = {
    # Temporal
    "hour_of_day": int,           # 0-23
    "minute_bin": int,            # 0,15,30,45 (15-min bins)
    "day_of_week": int,           # 0=Mon, 6=Sun
    "is_peak_hour": bool,         # 7-9am, 5-8pm
    "is_public_holiday": bool,    # Malaysia public holiday calendar

    # Network state
    "vehicle_bunching_score": float,  # 0-1, % vehicles bunched on route
    "gap_minutes": float,             # minutes since last vehicle seen on route
    "avg_speed_ratio": float,         # current avg speed / historical baseline
    "headway_deviation": float,       # actual headway - scheduled headway

    # External
    "rain_intensity_mm_hr": float,    # from Open-Meteo API
    "rain_duration_minutes": float,   # continuous rain duration

    # Historical
    "historical_delay_rate_h": float, # % of trips delayed at this hour (30-day rolling)
    "ewma_delay_15min": float,        # exponentially weighted moving avg of last 15min delays

    # Crowdsource (real-time)
    "report_count_15min": int,        # crowdsource reports in last 15 min for this route
    "report_severity_avg": float,     # avg severity of recent reports
}
```

### Model Architecture

```python
import xgboost as xgb
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Classifier: is disrupted?
clf = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=3,   # class imbalance: disruptions ~25% of data
    eval_metric='logloss',
    early_stopping_rounds=20,
)

# Regressor: how many minutes delay?
reg = xgb.XGBRegressor(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.08,
    objective='reg:squarederror',
)
```

### Evaluation Targets

| Metric | Target |
|---|---|
| Disruption classifier AUC-ROC | > 0.82 |
| Precision at threshold=0.5 | > 0.70 |
| Delay regressor RMSE | < 4 minutes |
| Inference latency | < 100ms per route |

### Training Script (Outline)

```python
# train_disruption_model.py
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit

df = pd.read_parquet("data/gklmob_bus_positions_2024.parquet")
df = engineer_features(df)

# Time-series aware split (never use future to predict past)
tscv = TimeSeriesSplit(n_splits=5)

X = df[FEATURE_COLS]
y_clf = df["is_delayed"]
y_reg = df[df["is_delayed"]]["delay_minutes"]

# Train with early stopping on validation fold
clf.fit(X_train, y_clf_train,
        eval_set=[(X_val, y_clf_val)],
        verbose=50)

# Save
clf.save_model("models/disruption_clf.ubj")
reg.save_model("models/disruption_reg.ubj")
```

---

## Model 3: Crowd Density Estimation

### Approach: Bayesian Exponential Smoothing

No labelled crowd data exists for KL stations, so we use a prior + update approach:

```python
class CrowdEstimator:
    def __init__(self, stop_id: str):
        # Historical prior from data.gov.my ridership stats
        # hour_of_day → expected crowd score (0-100)
        self.prior = HISTORICAL_CROWD_BY_HOUR[stop_id]
        self.current = self.prior[current_hour()]
        self.last_updated = datetime.now()

    def update(self, report: CrowdReport):
        # Bayesian update weighted by report trust score
        alpha = report.trust_score * 0.3   # learning rate
        self.current = (1 - alpha) * self.current + alpha * report.crowd_score
        self.last_updated = datetime.now()

    def get_score(self) -> float:
        # Decay toward prior if no recent updates
        decay_minutes = (datetime.now() - self.last_updated).seconds / 60
        half_life = 10  # minutes
        decay_factor = 0.5 ** (decay_minutes / half_life)
        prior_now = self.prior[current_hour()]
        return decay_factor * self.current + (1 - decay_factor) * prior_now
```

---

## Model 4: Anomaly Detector

### Vehicle Bunching Detection

```python
def compute_bunching_score(vehicles: list[VehiclePosition], route_id: str) -> float:
    """
    Returns 0.0 (no bunching) to 1.0 (severe bunching).
    Bunching = 3+ vehicles within 500m of each other on same route.
    """
    positions = [v.position for v in vehicles if v.route_id == route_id]
    if len(positions) < 3:
        return 0.0

    clusters = dbscan_cluster(positions, eps_meters=500, min_samples=3)
    bunched_count = sum(1 for c in clusters if c.size >= 3)
    return min(bunched_count / len(positions), 1.0)
```

### Service Gap Detection

```python
def detect_gap(vehicles: list[VehiclePosition], route_id: str, 
               scheduled_headway_minutes: float) -> GapAlert | None:
    route_vehicles = [v for v in vehicles if v.route_id == route_id]
    
    if not route_vehicles:
        return GapAlert(severity="critical", gap_minutes=float('inf'))
    
    last_seen = max(v.timestamp for v in route_vehicles)
    gap = (datetime.now() - last_seen).seconds / 60
    
    if gap > scheduled_headway_minutes * 2:
        return GapAlert(severity="high", gap_minutes=gap)
    return None
```

### Speed Anomaly Detection

```python
def detect_speed_anomaly(segment_speed: float, route_id: str, 
                          stop_pair: tuple[str, str]) -> bool:
    baseline = HISTORICAL_SPEED_BASELINE[route_id][stop_pair]
    # Flag if current speed < 30% of historical average
    return segment_speed < baseline * 0.30
```

---

## Model 5: "Should I Leave Now?" Decision Engine

```python
from scipy import stats
import numpy as np

def should_leave_now(commute: SavedCommute, user_deadline: datetime | None) -> Recommendation:
    now = datetime.now()

    # Get ML disruption prediction for this route
    features = build_features(commute.route_id, now)
    p_disruption = clf.predict_proba([features])[0][1]
    expected_delay = reg.predict([features])[0] if p_disruption > 0.3 else 0

    # Get historical travel time distribution for this route at this hour
    # (precomputed from GTFS data — P50, P90, P99)
    travel_dist = TRAVEL_TIME_DISTRIBUTIONS[commute.route_id][now.hour]
    p90_time = np.percentile(travel_dist, 90)
    p50_time = np.percentile(travel_dist, 50)

    adjusted_time = p50_time + expected_delay

    # Decision logic
    if user_deadline:
        buffer_minutes = (user_deadline - now).seconds / 60 - adjusted_time
        urgency = "urgent" if buffer_minutes < 10 else "comfortable"
    else:
        urgency = "comfortable"

    if p_disruption < 0.20:
        return Recommendation(
            verdict="GREEN",
            message=f"Good time to leave. Route looks clear.",
            suggested_departure=now
        )
    elif p_disruption < 0.50:
        wait_minutes = max(0, expected_delay - 3)
        return Recommendation(
            verdict="YELLOW",
            message=f"Minor disruption likely ({expected_delay:.0f} min delay). "
                    f"{'Leave now to buffer it.' if urgency == 'urgent' else f'Consider waiting {wait_minutes} min.'}",
            suggested_departure=now + timedelta(minutes=wait_minutes)
        )
    else:
        return Recommendation(
            verdict="RED",
            message=f"Significant disruption detected. Alternative route recommended.",
            suggested_departure=now,
            show_alternatives=True
        )
```

---

## Model 6: Natural Language Intent Parser (Claude API)

### System Prompt

```
You are a transit route parser for Kuala Lumpur's public transport network.
Extract structured routing intent from natural language queries.
Users may write in English, Malay, or a mix of both.

Return ONLY valid JSON in this exact format:
{
  "origin": "<place name or stop name>",
  "destination": "<place name or stop name>",
  "avoid_lines": ["<line name>", ...],  // empty array if none
  "prefer": "fastest|least_walking|fewest_transfers",
  "arrive_by": "<HH:MM or null>",
  "depart_at": "<HH:MM or null>"
}

Examples:
- "fastest way to KLCC" → {"origin": null, "destination": "KLCC", ...}
- "nak pergi Midvalley dari Chow Kit elak LRT" → {"origin": "Chow Kit", "destination": "Mid Valley", "avoid_lines": ["LRT Kelana Jaya"], ...}
- "need to reach Bangsar by 9am from Kepong" → {"origin": "Kepong", "destination": "Bangsar", "arrive_by": "09:00", ...}
```

### Usage in App

```typescript
async function parseNaturalLanguageQuery(query: string): Promise<RouteIntent> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: TRANSIT_PARSER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }]
    })
  });
  const data = await response.json();
  return JSON.parse(data.content[0].text) as RouteIntent;
}
```

---

## Model 7: Client-Side Preference Learning

Stored entirely in IndexedDB — no server calls, no PII.

```typescript
interface TripRecord {
  routeId: string;
  timestamp: number;
  chosenOption: "fastest" | "least_walk" | "fewest_transfers";
  walkingDistance: number;
  transfers: number;
  duration: number;
}

class CommuteLearner {
  // After 5+ trips, compute user's revealed preference weights
  computeWeights(history: TripRecord[]): RouteWeights {
    if (history.length < 5) return DEFAULT_WEIGHTS;
    
    const walkAvg = mean(history.map(t => t.walkingDistance));
    const transferAvg = mean(history.map(t => t.transfers));
    
    // Users who consistently choose routes with fewer transfers
    // get a higher transfer_penalty weight
    const transferSensitivity = std(history.map(t => t.transfers)) < 0.5 ? 1.5 : 1.0;
    const walkSensitivity = walkAvg < 300 ? 1.3 : 1.0;  // prefers short walks
    
    return {
      time_weight: 1.0,
      walk_weight: walkSensitivity,
      transfer_weight: transferSensitivity,
    };
  }
}
```
