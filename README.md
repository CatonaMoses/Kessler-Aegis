# 🛡️ Kessler Aegis — Orbital Debris Threat Mitigation System

> **IBM August Challenge 2026 — Advance Space Exploration with AI**
> Theme: *Space debris tracking and collision avoidance systems*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-green.svg)](https://python.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![IBM Watsonx](https://img.shields.io/badge/IBM-Watsonx%20AI-0062ff.svg)](https://ibm.com/watsonx)

---

## 📌 Problem Statement

The **Kessler Syndrome** is a catastrophic scenario in which the density of objects in low Earth orbit (LEO) becomes high enough that collisions between objects generate debris that causes further collisions in a cascade effect — potentially rendering all orbital altitudes permanently unusable for satellites, space stations, and future missions.

The **2009 Iridium–COSMOS collision** generated over 2,000 trackable debris fragments. Today, more than **27,000 objects** larger than 10 cm orbit Earth at speeds exceeding 28,000 km/h. A single collision can destroy a $500M satellite in milliseconds.

Current Space Situational Awareness (SSA) systems:
- Generate massive volumes of raw orbital data that humans cannot rapidly interpret
- Require expert Flight Dynamics Officers to manually calculate avoidance maneuvers
- Lack real-time AI-assisted decision support that bridges data → insight → action

**Kessler Aegis solves this** by combining real-time orbital propagation with IBM Watsonx AI to transform raw debris tracking data into immediate, actionable collision avoidance maneuvers — making SSA accessible and fast.

---

## 💡 Solution Description

Kessler Aegis is a full-stack Space Situational Awareness platform that:

1. **Fetches live TLE (Two-Line Element) data** from [Celestrak.org](https://celestrak.org) for the COSMOS-2251 debris cloud — the most dangerous fragment field in LEO
2. **Propagates every object to the current UTC epoch** using NASA/NORAD's SGP4 algorithm, converting Keplerian orbital elements to real-time latitude, longitude, and altitude positions
3. **Renders 500+ tracked objects** on an interactive 3D globe (NASA Blue Marble texture, bump mapping, star-field background, atmospheric glow) — as if viewed from the ISS
4. **Classifies each object** by threat score based on proximity to the ~780 km COSMOS debris shell
5. **Invokes IBM Watsonx AI (Llama-3-3-70B)** with a structured aerospace prompt when an operator selects a target — generating a complete collision avoidance maneuver plan including Δv, burn duration, fuel cost, and optimal burn window
6. **Provides a full operator HUD** with live telemetry, scenario controls, and a wired AUTHORIZE MANEUVER workflow

### Key Features

| Feature | Details |
|---|---|
| Real orbital positions | SGP4 via `sgp4.omm` — 592 real COSMOS-2251 debris objects |
| 3D Visualization | `react-globe.gl` + Three.js — NASA Blue Marble, graticule grid, atmosphere |
| AI Maneuver Planning | IBM Watsonx Llama-3-3-70B with structured JSON output |
| Threat Scoring | Deviation from 780 km shell → 0–100 score with color coding |
| Hover Tooltips | NORAD ID, altitude, inclination, eccentricity, threat score |
| Threat List | Top-20 ranked objects, clickable to trigger instant analysis |
| Live Clock | Real UTC time displayed in header |
| Responsive UI | Desktop + tablet + mobile with collapsible sidebar |
| Maneuver Authorization | Full button state machine: Analyze → Authorize → Confirmed |

---

## 🤖 AI Approach and Architecture

```
┌──────────────────┐     HTTPS      ┌─────────────────────┐
│   Celestrak.org  │ ──────────────▶│  FastAPI Backend    │
│  (Live TLE CSV)  │                │  (main.py)          │
└──────────────────┘                │                     │
                                    │  sgp4.omm.parse_csv │
┌──────────────────┐                │  Satrec propagation │
│  space_data.csv  │ ──(fallback)──▶│  → lat/lng/alt      │
│  (Local backup)  │                │  → threat scoring   │
└──────────────────┘                └──────────┬──────────┘
                                               │ REST API
                                    ┌──────────▼──────────┐
                                    │  Next.js Frontend   │
                                    │  (React 19)         │
                                    │                     │
                                    │  react-globe.gl     │
                                    │  Three.js (PBR)     │
                                    │  Lucide icons       │
                                    └──────────┬──────────┘
                                               │ Operator
                                               │ selects target
                                    ┌──────────▼──────────┐
                                    │  FastAPI Copilot    │
                                    │  /api/copilot/      │
                                    │  analyze            │
                                    └──────────┬──────────┘
                                               │ IBM SDK
                                    ┌──────────▼──────────┐
                                    │  IBM Watsonx AI     │
                                    │  Llama-3-3-70B      │
                                    │  Instruct           │
                                    │                     │
                                    │  Structured JSON    │
                                    │  maneuver output    │
                                    └─────────────────────┘
```

### AI Prompt Engineering

The Watsonx model receives a precisely engineered prompt that includes:
- Real orbital parameters (altitude, inclination, NORAD ID)
- Computed miss distance and relative velocity
- Threat score context

And is instructed to respond **only** in a strict JSON schema with:
- `probability_of_collision` (float)
- `risk_classification` (CRITICAL | HIGH | MEDIUM | LOW)
- `delta_v_maneuver` (string — e.g., "+1.4 m/s prograde")
- `burn_duration_seconds` (int)
- `fuel_consumption_kg` (float)
- `optimal_burn_window` (string)
- `post_maneuver_miss_distance_km` (float)
- `maneuver_phases` (array of steps)
- `actionable_directive` (one-sentence summary)

Markdown fence stripping and a deterministic fallback payload ensure the UI never crashes from malformed LLM output.

---

## 🎯 Selected Challenge Theme

**Space debris tracking and collision avoidance systems**

Kessler Aegis directly addresses the challenge prompt:
> *"How can AI improve mission safety and reliability?"*  
> *"How can AI make space data more usable and accessible?"*

By taking raw TLE orbital mechanics data — which requires expert knowledge to interpret — and transforming it into clear, visual, AI-generated action plans accessible to non-specialists.

---

## 🔧 How IBM Bob Was Used

IBM Bob was the **primary development tool** throughout the entire project lifecycle:

1. **Architecture design** — Bob analyzed the project concept and produced a scored gap analysis with a prioritized improvement roadmap
2. **SGP4 integration** — Bob identified that `sgp4.omm.parse_csv` + `omm.initialize` was the correct API (not `sgp4init`), validated it against the live Celestrak feed, and confirmed 592/592 objects propagated successfully
3. **TypeScript type fixes** — Bob diagnosed the `objectColor` does not exist on `GlobeProps` type error and replaced the objects layer with the correctly-typed points layer
4. **Three.js rendering** — Bob upgraded from `MeshBasicMaterial` (white dots problem) to `MeshStandardMaterial` with PBR emissive properties, adding a proper sun/fill/rim light rig
5. **Full UI overhaul** — Bob designed and implemented the complete responsive layout: stat cards, legend, telemetry grid, AI result panels, threat list, authorize workflow, mobile hamburger sidebar
6. **Code cleanup** — Bob removed the `random` import, fixed deprecated `datetime.utcnow()`, increased token limits, added markdown fence stripping, wired the AUTHORIZE button, and created all GitHub files

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| AI Model | IBM Watsonx — `meta-llama/llama-3-3-70b-instruct` |
| Backend | FastAPI (Python), sgp4, httpx |
| Frontend | Next.js 16, React 19, TypeScript |
| 3D Globe | react-globe.gl, Three.js |
| Orbital Data | Celestrak GP CSV + local space_data.csv fallback |
| Styling | Tailwind CSS v4, custom CSS, Orbitron + Rajdhani fonts |
| Icons | Lucide React |

---

## ⚡ Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- IBM Cloud account with Watsonx project

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/kessler-aegis.git
cd kessler-aegis
```

### 2. Set up the Python backend
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your IBM Cloud API key, Project ID, and regional URL
```

### 4. Start the FastAPI backend
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Test it: `http://localhost:8000/api/satellites`

### 5. Start the Next.js frontend
```bash
cd kessler-aegis-ui
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📡 API Reference

### `GET /api/satellites`
Returns all COSMOS-2251 debris objects propagated to the current epoch.

```json
{
  "satellites": [
    {
      "name": "COSMOS 2251 DEB",
      "norad_id": 33761,
      "object_id": "1993-036J",
      "lat": -55.96,
      "lng": 123.72,
      "altitude_km": 786.2,
      "altitude_index": 0.0786,
      "inclination": 74.04,
      "eccentricity": 0.002308,
      "mean_motion": 14.431,
      "threat_score": 99,
      "radar_cross_section": 1.34,
      "threat_color": "#ff1111",
      "epoch": "2026-08-19T04:37:42"
    }
  ],
  "count": 592,
  "source": "celestrak_live"
}
```

### `POST /api/copilot/analyze`
Invokes Watsonx AI to compute a collision avoidance maneuver.

**Request body:**
```json
{
  "primary_object": "KENYA-SAT-1",
  "secondary_object": "COSMOS 2251 DEB",
  "norad_id": 33761,
  "altitude_km": 786.2,
  "inclination": 74.04,
  "miss_distance_km": 0.12,
  "relative_velocity_km_s": 14.5,
  "threat_score": 99
}
```

**Response:**
```json
{
  "status": "success",
  "analysis": {
    "probability_of_collision": 0.0921,
    "risk_classification": "CRITICAL",
    "delta_v_maneuver": "+1.4 m/s prograde",
    "burn_duration_seconds": 14,
    "fuel_consumption_kg": 4.8,
    "optimal_burn_window": "T-6h before conjunction node",
    "post_maneuver_miss_distance_km": 9.2,
    "maneuver_phases": ["...", "...", "..."],
    "actionable_directive": "Execute prograde burn at next apogee pass."
  }
}
```

---

## 📁 Project Structure

```
kessler-aegis/
├── main.py                          # FastAPI backend — SGP4 + Watsonx AI
├── space_data.csv                   # Local COSMOS-2251 TLE backup data
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variable template
└── kessler-aegis-ui/
    ├── src/app/
    │   ├── page.tsx                 # Main operator HUD (React)
    │   ├── layout.tsx               # Root layout + fonts
    │   ├── globals.css              # All custom CSS classes
    │   └── components/
    │       └── OrbitalGlobe.tsx     # 3D globe + Three.js rendering
    ├── package.json
    └── tsconfig.json
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---


Built for the **IBM August Challenge 2026 — Advance Space Exploration with AI**

*Developed entirely using IBM Bob as the primary AI development tool.*
