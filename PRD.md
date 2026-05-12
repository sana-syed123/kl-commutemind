# Product Requirements Document (PRD)
## KL CommuteMind — AI-Powered Multi-Modal Transit Optimizer for Klang Valley

**Version:** 1.0  
**Author:** [Your Name]  
**Date:** May 2026  
**Status:** Ready for Development

---

## 1. Executive Summary

KL CommuteMind is a real-time, AI-powered commute intelligence platform built for the 8 million daily transit users in Greater Kuala Lumpur. It goes far beyond a traditional trip planner — it learns your routine, predicts disruptions before they happen, and dynamically reroutes you in real time. The app solves a deeply felt daily problem: KL's multi-operator transit network (LRT, MRT, Monorail, KTM, Rapid Bus) is fragmented, unreliable at peak hours, and has no unified intelligence layer. CommuteMind is that intelligence layer.

---

## 2. Problem Statement

### 2.1 Real-World Pain Points

| Pain Point | Current Reality |
|---|---|
| Fragmented data | Separate apps for RapidKL, KTM, buses — no unified view |
| No predictive alerts | Users find out about delays only after arriving at station |
| Last-mile gap | No intelligent first/last mile walking guidance with real conditions |
| No learning | Apps treat every trip identically; no personalisation |
| Crowd blindness | No real-time carriage or station crowd level data |
| Poor rerouting | No dynamic alternatives when a line goes down |

### 2.2 Target Users

- **Daily commuters** (primary): Office workers traveling 6–9 AM and 5–8 PM
- **Occasional riders**: Tourists, students, infrequent users needing route discovery
- **Accessibility users**: Commuters who need lift-aware routing and step-free paths

---

## 3. Product Goals

1. Provide a unified, real-time multi-modal trip planner covering MRT, LRT, Monorail, KTM, and Rapid Bus KL
2. Predict disruptions 15–30 minutes ahead using ML on historical and live GTFS data
3. Learn each user's commute patterns and proactively surface "should I leave now?" recommendations
4. Enable crowdsourced crowd reporting with AI noise filtering
5. Deliver walking-aware first/last mile routing with live pedestrian conditions
6. Be deployable and fully functional within the challenge timeline

---

## 4. Features

### 4.1 Core Features (MVP)

#### F1 — Unified Multi-Modal Trip Planner
- Input: origin + destination (text or GPS)
- Output: ranked journey options combining MRT/LRT/KTM/Bus + walking segments
- Shows: fare estimate, total time, transfers, walking distance, real-time delays
- Routing engine: custom Dijkstra/A* over GTFS graph with live delay overlay

#### F2 — Real-Time Journey Monitoring
- Live tracking of user's active journey
- Detects if a leg is running late and auto-triggers rerouting suggestions
- Pushes silent background alerts via Service Worker

#### F3 — Crowdsourced Delay Reporting
- One-tap in-app crowd reports: "Train delayed", "Station overcrowded", "Lift broken"
- AI trust scoring filters out false reports (outlier detection)
- Reports decay over time using exponential smoothing

#### F4 — Saved Commutes & Smart Alerts
- Save frequently used routes (e.g., "Home → Office")
- System monitors saved routes and sends push alerts if disruption likely
- Alert threshold configurable by user (5 min / 10 min / 15 min delay sensitivity)

#### F5 — Station & Crowd Heatmap
- Visual heatmap on map showing current crowd density at each station
- Derived from: GTFS vehicle positions + crowdsource reports + ML crowd model
- Updates every 2 minutes

### 4.2 AI/ML Features

#### F6 — Predictive Disruption Engine (ML)
- Model: Gradient Boosted Trees (XGBoost) trained on 12+ months of GTFS realtime delay data
- Inputs: time of day, day of week, weather, recent delay reports, vehicle position anomalies
- Output: probability score + estimated delay magnitude per line segment
- Served via FastAPI endpoint; frontend fetches scores on route load

#### F7 — Personal Commute AI ("CommuteMind Assistant")
- Learns user's departure times, preferred routes, tolerance for walking
- Uses lightweight on-device collaborative filtering to rank route options
- After 5+ trips, surfaces "Your usual Masjid Jamek → Bukit Bintang takes 18 min today. Leave in 4 min."
- No PII sent to server — all preference learning happens client-side (IndexedDB)

#### F8 — "Should I Leave Now?" Engine
- Powered by combining: current delay probability, historical travel time distributions, user's destination deadline
- Returns: GREEN (leave now), YELLOW (wait 8 min — congestion clearing), RED (take alternative route)
- Shown as a prominent card on the home screen for saved commutes

#### F9 — Natural Language Route Search
- User types: "fastest way to KLCC avoiding Kelana Jaya line"
- LLM (Claude API) parses intent → extracts origin, destination, constraints → passes to routing engine
- Supports Malay + English mixed queries ("nak pergi Midvalley dari Chow Kit")

#### F10 — Anomaly-Based Early Warning
- Background job polls GTFS realtime vehicle positions every 30s
- Detects anomalies: bunching (3+ buses same location), gaps (no vehicle on route for 10+ min), speed drops
- Triggers preemptive disruption flag before any official announcement

### 4.3 Advanced Features

#### F11 — Accessibility-Aware Routing
- Toggle "lift-required" routing — avoids stations with broken lifts (sourced from crowdsource + Prasarana feed)
- Step-count estimation per walking segment
- Option for shaded/sheltered walking paths only (critical for KL weather)

#### F12 — Weather-Integrated Journey Adjustments
- Pulls Open-Meteo API (free) for real-time KL weather
- If rain detected: deprioritise long outdoor walks, suggest covered alternatives, add 5-min buffer to walking estimates

#### F13 — Carbon & Cost Tracker
- Calculates CO2 saved vs driving equivalent per trip
- Tracks total weekly transit spend vs estimated Grab/MyTeksi cost
- Shown in personal stats dashboard

---

## 5. User Flows

### 5.1 First-Time User
1. Open app → onboarding (3 screens: location permission, notification permission, save a commute)
2. Search origin → destination → view route options
3. Tap "Save this commute" → system begins monitoring

### 5.2 Daily Commuter (Returning User)
1. Open app → home screen shows saved commute card with CommuteMind AI verdict
2. "Leave in 6 min — Kelana Jaya line slightly delayed, but clears by the time you arrive"
3. Tap to start journey → live monitoring activates
4. Mid-journey disruption → app vibrates + shows modal with 2 alternative routes

### 5.3 Ad-hoc Trip
1. Tap "Plan a trip" → type destination
2. View 3 ranked options (fastest, fewest transfers, least walking)
3. Tap option → see full breakdown per leg
4. Start navigation → real-time monitoring begins

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Route calculation time | < 2 seconds for 95th percentile |
| GTFS realtime refresh | Every 30 seconds |
| ML prediction latency | < 500ms per route |
| Offline capability | Last-known schedule data cached via Service Worker |
| Mobile performance | Lighthouse score > 85 on mid-range Android |
| Accessibility | WCAG 2.1 AA compliant |
| Data privacy | All personal travel history stored client-side only |

---

## 7. Out of Scope (v1)

- Ticketing / payment integration
- E-hailing (Grab) integration
- In-app navigation (turn-by-turn walking)
- Penang / JB transit networks (KL-only for v1)

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Route accuracy vs Google Maps | Within 2 minutes for 90% of trips |
| Disruption prediction accuracy | > 70% precision at 15-minute horizon |
| User saves a commute | > 60% of new users within first session |
| Notification opt-in rate | > 50% |
| Demo evaluator NPS | "Would use this daily" feedback |

---

## 9. Timeline

| Milestone | Date |
|---|---|
| GTFS data pipeline + routing engine | Day 1–2 |
| Core trip planner UI | Day 2–3 |
| ML disruption model (offline training) | Day 2–3 |
| AI features (F7, F8, F9) | Day 3–4 |
| Crowdsource + push notifications | Day 4 |
| Polish, deploy to Vercel | Day 5 |
| Demo video + documentation | Day 6 |
| **Submission deadline** | **17 May, 11:59 PM** |
