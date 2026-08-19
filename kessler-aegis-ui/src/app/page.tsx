"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert, Crosshair, Cpu, Rocket, Settings2, Activity,
  AlertTriangle, List, ChevronRight, Globe2, Zap,
  CheckCircle2, XCircle, Info, BarChart3, Clock,
} from "lucide-react";

const OrbitalGlobe = dynamic(() => import("@/app/components/OrbitalGlobe"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────
interface DebrisObject {
  name: string;
  norad_id: number;
  object_id: string;
  lat: number;
  lng: number;
  altitude_km: number;
  altitude_index: number;
  inclination: number;
  eccentricity: number;
  mean_motion: number;
  threat_score: number;
  radar_cross_section: number;
  threat_color: string;
  epoch: string;
}

interface AIAnalysis {
  probability_of_collision: number | string;
  risk_classification: string;
  delta_v_maneuver: string;
  burn_duration_seconds: number;
  fuel_consumption_kg: number;
  optimal_burn_window?: string;
  post_maneuver_miss_distance_km?: number;
  maneuver_phases: string[];
  actionable_directive: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function riskColor(score: number) {
  if (score > 85) return "#ff2222";
  if (score > 60) return "#ff9900";
  return "#2266aa";
}
function riskLabel(score: number) {
  if (score > 85) return "CRITICAL";
  if (score > 60) return "HIGH";
  return "NOMINAL";
}
function riskBg(score: number) {
  if (score > 85) return "rgba(80,0,0,0.5)";
  if (score > 60) return "rgba(80,40,0,0.5)";
  return "rgba(0,20,60,0.5)";
}
function probColor(p: number | string) {
  const v = typeof p === "string" ? parseFloat(p) : p;
  if (v > 0.07) return "#ff2222";
  if (v > 0.02) return "#ff9900";
  return "#22cc77";
}
const API = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000")
  : "http://127.0.0.1:8000";

// ── Main Component ─────────────────────────────────────────────────────────
export default function Home() {
  const [activeTarget, setActiveTarget]   = useState<DebrisObject | null>(null);
  const [aiStatus, setAiStatus]           = useState("Monitoring Orbital Sector…");
  const [aiData, setAiData]               = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [simDistance, setSimDistance]     = useState(0.12);
  const [simVelocity, setSimVelocity]     = useState(14.5);
  const [allDebris, setAllDebris]         = useState<DebrisObject[]>([]);
  const [showThreatList, setShowThreatList] = useState(false);
  const [maneuverDone, setManeuverDone]   = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  // null on first render so server and client produce identical HTML (no hydration mismatch)
  const [now, setNow] = useState<Date | null>(null);

  // Live clock — starts only after mount (client-side only)
  useEffect(() => {
    setNow(new Date());                          // set immediately on mount
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load debris for threat list
  useEffect(() => {
    fetch(`${API}/api/satellites`)
      .then((r) => r.json())
      .then((d) => { if (d.satellites) setAllDebris(d.satellites); })
      .catch(() => {});
  }, []);

  const triggerWatsonxAI = async (obj: DebrisObject) => {
    setActiveTarget(obj);
    setIsAnalyzing(true);
    setAiData(null);
    setManeuverDone(false);
    setAiStatus(`Uplink Secure — Analyzing ${obj.name}…`);
    // Auto-open sidebar on mobile when a target is clicked
    setSidebarOpen(true);

    try {
      const res = await fetch(`${API}/api/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_object:          "KENYA-SAT-1",
          secondary_object:        obj.name,
          norad_id:                obj.norad_id,
          altitude_km:             obj.altitude_km,
          inclination:             obj.inclination,
          miss_distance_km:        simDistance,
          relative_velocity_km_s:  simVelocity,
          threat_score:            obj.threat_score,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAiStatus("WATSONX SOLUTION GENERATED");
        setAiData(data.analysis);
      }
    } catch {
      setAiStatus("ERROR: API CONNECTION FAILED");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const authorizeManeuver = () => {
    if (!aiData) return;
    setManeuverDone(true);
    setAiStatus("✓ MANEUVER AUTHORIZED — BURN SEQUENCE QUEUED");
  };

  const criticalCount = allDebris.filter((d) => d.threat_score > 85).length;
  const highCount     = allDebris.filter((d) => d.threat_score > 60 && d.threat_score <= 85).length;
  const top20         = allDebris.slice(0, 20);

  return (
    <main className="aegis-root">

      {/* ── Top Navigation ──────────────────────────────────────── */}
      <header className="aegis-header">
        <div className="header-left">
          {/* Hamburger for mobile */}
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle panel">
            <span /><span /><span />
          </button>
          <ShieldAlert className="text-blue-400 header-icon" />
          <div>
            <h1 className="font-orbitron header-title">KESSLER AEGIS</h1>
            <p className="font-rajdhani header-sub">Orbital Threat Mitigation System · IBM Watsonx</p>
          </div>
        </div>

        <div className="header-right font-rajdhani">
          <div className="status-pill green">
            <Activity className="w-3 h-3" />
            <span className="hide-sm">SGP4 PROPAGATOR</span> ONLINE
          </div>
          <div className="status-pill blue">
            <span className="pulse-dot cyan" />
            <span className="hide-sm">WATSONX</span> LLAMA-3
          </div>
          {now && (
            <div className="status-pill dim hide-xs">
              <Clock className="w-3 h-3" />
              {now.toUTCString().slice(17, 25)} UTC
            </div>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="aegis-body">

        {/* ── Left Sidebar ──────────────────────────────────────── */}
        <aside className={`aegis-sidebar ${sidebarOpen ? "open" : "closed"} font-rajdhani`}>

          {/* Stats row */}
          <div className="stat-row">
            <div className="stat-card critical">
              <div className="stat-val">{criticalCount}</div>
              <div className="stat-lbl">CRITICAL</div>
            </div>
            <div className="stat-card high">
              <div className="stat-val">{highCount}</div>
              <div className="stat-lbl">HIGH RISK</div>
            </div>
            <div className="stat-card nominal">
              <div className="stat-val">{allDebris.length}</div>
              <div className="stat-lbl">TRACKED</div>
            </div>
          </div>

          {/* Colour Legend */}
          <div className="panel mb-3">
            <div className="panel-title"><Info className="w-3 h-3" /> DEBRIS THREAT LEGEND</div>
            <div className="legend-grid">
              <span className="legend-dot critical" />
              <span className="legend-text">Critical (&gt;85) — Imminent conjunction risk</span>
              <span className="legend-dot high" />
              <span className="legend-text">High (60–85) — Elevated monitoring required</span>
              <span className="legend-dot nominal" />
              <span className="legend-text">Nominal (&lt;60) — Tracked, low risk</span>
              <span className="legend-dot selected" />
              <span className="legend-text">Selected — Active Watsonx analysis target</span>
            </div>
            <div className="legend-orbit-row">
              <span className="legend-orbit-line" />
              <span className="legend-text">KENYA-SAT-1 orbital path (~550 km)</span>
            </div>
          </div>

          {/* Active Target Telemetry */}
          <div className={`panel mb-3 ${activeTarget ? "panel-active" : ""}`}>
            <div className="panel-title flex-between">
              <span className="flex-row-gap2"><Crosshair className="w-3 h-3" /> ACTIVE THREAT LOCK</span>
              <span className={activeTarget ? "badge-critical blink" : "badge-clear"}>
                {activeTarget ? "ENGAGED" : "CLEAR"}
              </span>
            </div>

            {activeTarget ? (
              <>
                <div className="target-name">{activeTarget.name}</div>
                <div className="telemetry-grid">
                  <div className="tele-cell">
                    <span className="tele-lbl">NORAD ID</span>
                    <span className="tele-val">{activeTarget.norad_id}</span>
                  </div>
                  <div className="tele-cell">
                    <span className="tele-lbl">ALTITUDE</span>
                    <span className="tele-val">{activeTarget.altitude_km} km</span>
                  </div>
                  <div className="tele-cell">
                    <span className="tele-lbl">INCLINATION</span>
                    <span className="tele-val">{activeTarget.inclination}°</span>
                  </div>
                  <div className="tele-cell">
                    <span className="tele-lbl">ECCENTRICITY</span>
                    <span className="tele-val">{activeTarget.eccentricity}</span>
                  </div>
                  <div className="tele-cell">
                    <span className="tele-lbl">MEAN MOTION</span>
                    <span className="tele-val">{activeTarget.mean_motion} rev/day</span>
                  </div>
                  <div className="tele-cell">
                    <span className="tele-lbl">RCS</span>
                    <span className="tele-val">{activeTarget.radar_cross_section} m²</span>
                  </div>
                  <div className="tele-cell span2" style={{ background: riskBg(activeTarget.threat_score), borderColor: riskColor(activeTarget.threat_score) }}>
                    <span className="tele-lbl">THREAT SCORE</span>
                    <span className="tele-val" style={{ color: riskColor(activeTarget.threat_score), fontSize: "1.2rem" }}>
                      {activeTarget.threat_score}/100 — {riskLabel(activeTarget.threat_score)}
                    </span>
                    <div className="threat-bar-wrap">
                      <div className="threat-bar" style={{ width: `${activeTarget.threat_score}%`, background: riskColor(activeTarget.threat_score) }} />
                    </div>
                  </div>
                  <div className="tele-cell span2 epoch-cell">
                    <span className="tele-lbl">TLE EPOCH</span>
                    <span className="tele-val epoch-val">{activeTarget.epoch.slice(0, 19)} UTC</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-target">
                <Globe2 className="w-8 h-8 text-blue-900 mx-auto mb-2" />
                <p className="text-center text-gray-600 text-xs">Click any debris object<br/>on the globe to lock target</p>
              </div>
            )}
          </div>

          {/* Scenario Overrides */}
          <div className="panel mb-3">
            <div className="panel-title"><Settings2 className="w-3 h-3" /> CONJUNCTION SCENARIO</div>
            <div className="slider-group">
              <div className="slider-row">
                <span>Predicted Miss Distance</span>
                <span style={{ color: simDistance < 0.3 ? "#ff4444" : "#00ccff" }}>{simDistance.toFixed(2)} km</span>
              </div>
              <input type="range" min="0.01" max="1.00" step="0.01"
                value={simDistance} onChange={(e) => setSimDistance(parseFloat(e.target.value))}
                className="aegis-range" />
              <div className="range-labels"><span>0.01 km</span><span>1.00 km</span></div>
            </div>
            <div className="slider-group">
              <div className="slider-row">
                <span>Relative Velocity</span>
                <span style={{ color: "#00ccff" }}>{simVelocity.toFixed(1)} km/s</span>
              </div>
              <input type="range" min="5.0" max="25.0" step="0.5"
                value={simVelocity} onChange={(e) => setSimVelocity(parseFloat(e.target.value))}
                className="aegis-range" />
              <div className="range-labels"><span>5 km/s</span><span>25 km/s</span></div>
            </div>
          </div>

          {/* Watsonx AI Panel */}
          <div className="panel flex-col-grow">
            <div className="panel-title"><Cpu className="w-3 h-3" /> WATSONX AI COPILOT</div>

            <p className={`ai-status ${isAnalyzing ? "analyzing" : aiData ? "solved" : ""}`}>
              {isAnalyzing && <span className="spinner-inline" />}
              {aiStatus}
            </p>

            {isAnalyzing && (
              <div className="ai-thinking">
                <div className="thinking-bar" /><div className="thinking-bar" /><div className="thinking-bar" />
                <span className="text-xs text-blue-400 mt-2">Llama-3-70B computing maneuver…</span>
              </div>
            )}

            {aiData && !isAnalyzing && (
              <div className="ai-result">
                {/* Probability + Classification */}
                <div className="ai-grid-2">
                  <div className="ai-metric" style={{ borderColor: probColor(aiData.probability_of_collision), background: "rgba(40,0,0,0.4)" }}>
                    <div className="ai-metric-lbl"><AlertTriangle className="w-3 h-3" /> P(COLLISION)</div>
                    <div className="ai-metric-val" style={{ color: probColor(aiData.probability_of_collision) }}>
                      {typeof aiData.probability_of_collision === "number"
                        ? (aiData.probability_of_collision * 100).toFixed(2) + "%"
                        : aiData.probability_of_collision}
                    </div>
                  </div>
                  <div className="ai-metric" style={{ borderColor: riskColor(aiData.risk_classification === "CRITICAL" ? 90 : aiData.risk_classification === "HIGH" ? 70 : 40) }}>
                    <div className="ai-metric-lbl"><BarChart3 className="w-3 h-3" /> RISK CLASS</div>
                    <div className="ai-metric-val" style={{ color: aiData.risk_classification === "CRITICAL" ? "#ff2222" : aiData.risk_classification === "HIGH" ? "#ff9900" : "#22cc77" }}>
                      {aiData.risk_classification}
                    </div>
                  </div>
                </div>

                {/* Delta-V */}
                <div className="ai-deltav">
                  <div className="ai-metric-lbl"><Zap className="w-3 h-3" /> DELTA-V MANEUVER</div>
                  <div className="ai-deltav-val">{aiData.delta_v_maneuver}</div>
                  <div className="ai-deltav-sub">
                    <span>Burn: <b>{aiData.burn_duration_seconds}s</b></span>
                    <span>Fuel: <b>{aiData.fuel_consumption_kg} kg</b></span>
                    {aiData.post_maneuver_miss_distance_km && (
                      <span>Post-burn miss: <b>{aiData.post_maneuver_miss_distance_km} km</b></span>
                    )}
                  </div>
                </div>

                {/* Burn window */}
                {aiData.optimal_burn_window && (
                  <div className="ai-window">
                    <div className="ai-metric-lbl"><Clock className="w-3 h-3" /> OPTIMAL BURN WINDOW</div>
                    <div className="ai-window-val">{aiData.optimal_burn_window}</div>
                  </div>
                )}

                {/* Maneuver sequence */}
                <div className="ai-sequence">
                  <div className="ai-metric-lbl"><List className="w-3 h-3" /> MANEUVER SEQUENCE</div>
                  <ol className="ai-phases">
                    {aiData.maneuver_phases?.map((phase, i) => (
                      <li key={i}><span className="phase-num">{i + 1}</span>{phase}</li>
                    ))}
                  </ol>
                </div>

                {/* Directive */}
                <div className="ai-directive">
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span>{aiData.actionable_directive}</span>
                </div>

                {/* Authorize / Done */}
                {!maneuverDone ? (
                  <button className="btn-authorize" onClick={authorizeManeuver}>
                    <Rocket className="w-4 h-4" /> AUTHORIZE MANEUVER
                  </button>
                ) : (
                  <div className="btn-authorized">
                    <CheckCircle2 className="w-4 h-4" /> MANEUVER AUTHORIZED
                  </div>
                )}
              </div>
            )}

            {!aiData && !isAnalyzing && (
              <div className="ai-idle">
                <Cpu className="w-10 h-10 text-blue-900" />
                <p>Select a debris object on the globe to activate the Watsonx AI collision avoidance engine.</p>
              </div>
            )}
          </div>

          {/* Threat List Toggle */}
          <button className="threat-list-toggle" onClick={() => setShowThreatList(!showThreatList)}>
            <List className="w-3 h-3" />
            {showThreatList ? "HIDE" : "SHOW"} TOP-20 THREAT LIST
          </button>

          {showThreatList && (
            <div className="threat-list">
              {top20.map((obj) => (
                <div key={obj.norad_id}
                  className={`threat-row ${activeTarget?.norad_id === obj.norad_id ? "threat-row-active" : ""}`}
                  onClick={() => triggerWatsonxAI(obj)}>
                  <div className="threat-dot" style={{ background: riskColor(obj.threat_score) }} />
                  <div className="threat-info">
                    <div className="threat-name">{obj.name}</div>
                    <div className="threat-meta">{obj.altitude_km} km · {obj.inclination}°</div>
                  </div>
                  <div className="threat-score-badge" style={{ color: riskColor(obj.threat_score), borderColor: riskColor(obj.threat_score) + "44" }}>
                    {obj.threat_score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Globe ─────────────────────────────────────────────── */}
        <div className="globe-area">
          <OrbitalGlobe selectedTarget={activeTarget} onDebrisClick={triggerWatsonxAI} />

          {/* Globe legend overlay */}
          <div className="globe-legend">
            <div className="gl-item"><span className="gl-dot critical" />CRITICAL</div>
            <div className="gl-item"><span className="gl-dot high" />HIGH</div>
            <div className="gl-item"><span className="gl-dot nominal" />NOMINAL</div>
            <div className="gl-item"><span className="gl-line" />KENYA-SAT-1</div>
          </div>

          {/* "no target" hint */}
          {!activeTarget && allDebris.length > 0 && (
            <div className="globe-hint">
              Click any glowing object to run Watsonx AI analysis
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
