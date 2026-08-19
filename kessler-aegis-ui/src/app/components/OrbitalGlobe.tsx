"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";

// ── Types ──────────────────────────────────────────────────────────────────
export interface DebrisObject {
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

interface OrbitalGlobeProps {
  selectedTarget: DebrisObject | null;
  onDebrisClick: (debris: DebrisObject) => void;
}

// ── Geometry cache ─────────────────────────────────────────────────────────
// Pre-built once so globe.gl never re-allocates geometry on every tick
const GEO_CRITICAL = new THREE.SphereGeometry(1.5, 10, 10);
const GEO_HIGH     = new THREE.SphereGeometry(1.0, 8,  8);
const GEO_LOW      = new THREE.SphereGeometry(0.6, 6,  6);
const GEO_SELECTED = new THREE.SphereGeometry(2.4, 14, 14);

// ── Material factory + cache ────────────────────────────────────────────────
function makeMaterial(color: string, emissive: string, intensity: number) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.4,
  });
}

const MAT: Record<string, THREE.Material> = {
  selected: makeMaterial("#ffffff", "#00e5ff", 1.6),
  critical:  makeMaterial("#ff1a1a", "#ff0000", 1.2),
  high:      makeMaterial("#ff8800", "#ff5500", 0.9),
  low:       makeMaterial("#1c3d6b", "#0055cc", 0.4),
};

// ── KENYA-SAT-1 orbit (ISS-altitude, 51.6° inc) ───────────────────────────
const KENYA_ORBIT = [{
  path: Array.from({ length: 145 }, (_, i) => {
    const deg = i * 2.5;
    return {
      lat: Math.sin((deg + 90) * (Math.PI / 180)) * 51.6,
      lng: deg - 180,
      alt: 0.086,   // ~550 km normalised
    };
  }),
}];

// ── Component ──────────────────────────────────────────────────────────────
export default function OrbitalGlobe({ selectedTarget, onDebrisClick }: OrbitalGlobeProps) {
  const [debris,   setDebris]   = useState<DebrisObject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [objCount, setObjCount] = useState(0);
  const globeRef = useRef<any>(null);

  // ── Fetch real SGP4-propagated debris ─────────────────────────────────
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
    fetch(`${api}/api/satellites`)
      .then((r) => r.json())
      .then((d) => {
        if (d.satellites) {
          setDebris(d.satellites);
          setObjCount(d.count ?? d.satellites.length);
        }
      })
      .catch((e) => console.error("API error:", e))
      .finally(() => setLoading(false));
  }, []);

  // ── Camera pan to selected target ────────────────────────────────────
  useEffect(() => {
    if (selectedTarget && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: selectedTarget.lat, lng: selectedTarget.lng, altitude: 1.6 },
        1400,
      );
    }
  }, [selectedTarget]);

  // ── Scene setup: lights that give realistic Phong/PBR rendering ──────
  const onGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const scene: THREE.Scene = globeRef.current.scene();

    // Remove globe.gl's default flat lighting
    scene.children
      .filter((c) => c instanceof THREE.AmbientLight || c instanceof THREE.DirectionalLight)
      .forEach((l) => scene.remove(l));

    // Very dim deep-space ambient (space is not completely dark)
    scene.add(new THREE.AmbientLight(0x0a0a22, 3.0));

    // Primary "sun" — warm white, coming from upper-right
    const sun = new THREE.DirectionalLight(0xfff5e0, 4.5);
    sun.position.set(400, 250, 300);
    scene.add(sun);

    // Soft Earth-glow fill from below
    const earthFill = new THREE.DirectionalLight(0x1a66ff, 0.8);
    earthFill.position.set(-300, -200, -200);
    scene.add(earthFill);

    // Subtle back-rim light (atmospheric scatter effect)
    const rim = new THREE.DirectionalLight(0x003399, 0.5);
    rim.position.set(0, 0, -500);
    scene.add(rim);
  }, []);

  // ── Build Three.js mesh per debris object ────────────────────────────
  const buildObject = useCallback(
    (d: object) => {
      const obj = d as DebrisObject;
      const sel = selectedTarget?.name === obj.name;
      const geo = sel ? GEO_SELECTED
        : obj.threat_score > 85 ? GEO_CRITICAL
        : obj.threat_score > 60 ? GEO_HIGH
        : GEO_LOW;
      const mat = sel ? MAT.selected
        : obj.threat_score > 85 ? MAT.critical
        : obj.threat_score > 60 ? MAT.high
        : MAT.low;
      return new THREE.Mesh(geo, mat);
    },
    [selectedTarget],
  );

  // ── Hover tooltip ────────────────────────────────────────────────────
  const buildLabel = useCallback((d: object) => {
    const obj = d as DebrisObject;
    const c = obj.threat_score > 85 ? "#ff3333"
            : obj.threat_score > 60 ? "#ff8800"
            : "#3399cc";
    return `<div style="
        background:rgba(0,3,18,0.95);border:1px solid ${c};border-radius:7px;
        padding:9px 13px;font-family:'Rajdhani',sans-serif;color:#ddeeff;
        font-size:12px;min-width:190px;box-shadow:0 0 16px ${c}55;
        line-height:1.55;">
      <div style="font-weight:700;font-size:14px;color:${c};margin-bottom:5px;
                  letter-spacing:0.04em">${obj.name}</div>
      <div>NORAD: <b>${obj.norad_id}</b>&nbsp;&nbsp;|&nbsp;&nbsp;
           Alt: <b>${obj.altitude_km} km</b></div>
      <div>Incl: <b>${obj.inclination}°</b>&nbsp;&nbsp;|&nbsp;&nbsp;
           Ecc: <b>${obj.eccentricity}</b></div>
      <div style="margin-top:4px">
        Threat: <b style="color:${c};font-size:13px">${obj.threat_score}/100</b>
        &nbsp;·&nbsp; RCS: <b>${obj.radar_cross_section} m²</b>
      </div>
      <div style="margin-top:6px;font-size:10px;color:#4477aa;
                  letter-spacing:0.06em">▶ CLICK TO RUN WATSONX ANALYSIS</div>
    </div>`;
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>

      {/* ── Loading spinner ── */}
      {loading && (
        <div style={{
          position:"absolute", inset:0, zIndex:10,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,12,0.9)",
          fontFamily:"'Orbitron',sans-serif", color:"#3388ff", gap:14,
        }}>
          <div style={{
            width:44, height:44,
            border:"3px solid #3388ff", borderTopColor:"transparent",
            borderRadius:"50%", animation:"aegis-spin 0.85s linear infinite",
          }} />
          <div style={{ fontSize:12, letterSpacing:"0.15em" }}>
            FETCHING ORBITAL DATA
          </div>
          <div style={{ fontSize:10, color:"#225588", letterSpacing:"0.1em" }}>
            SGP4 PROPAGATION IN PROGRESS…
          </div>
        </div>
      )}

      {/* ── Tracked-objects badge ── */}
      {!loading && objCount > 0 && (
        <div style={{
          position:"absolute", bottom:52, right:14, zIndex:10,
          background:"rgba(0,4,18,0.82)",
          border:"1px solid rgba(30,70,140,0.6)",
          borderRadius:5, padding:"4px 11px",
          fontFamily:"'Rajdhani',sans-serif",
          fontSize:11, color:"#3a7acc", letterSpacing:"0.09em",
        }}>
          {objCount} OBJECTS · LIVE SGP4
        </div>
      )}

      {/* ── Globe ── */}
      <Globe
        ref={globeRef}
        onGlobeReady={onGlobeReady}

        /* NASA Blue Marble day texture — rich, photorealistic land/ocean colours */
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        /* Topographic bump map adds visible mountain relief */
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        /* Star-field background */
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="rgba(0,0,0,0)"

        /* Blue atmospheric glow — matches the ISS / astronaut view */
        showAtmosphere
        atmosphereColor="#4488ff"
        atmosphereAltitude={0.22}

        /* Lat/lng graticule grid — gives the "mission control" look */
        showGraticules

        /* ── Debris cloud ── */
        objectsData={debris}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="altitude_index"
        objectThreeObject={buildObject}
        objectLabel={buildLabel}
        onObjectClick={(obj) => onDebrisClick(obj as DebrisObject)}

        /* ── KENYA-SAT-1 animated dashed orbit ── */
        pathsData={KENYA_ORBIT}
        pathPoints="path"
        pathPointLat="lat"
        pathPointLng="lng"
        pathPointAlt="alt"
        pathColor={() => ["rgba(0,210,255,0.0)","rgba(0,210,255,0.9)","rgba(0,210,255,0.0)"]}
        pathDashLength={0.06}
        pathDashGap={0.03}
        pathDashAnimateTime={4500}
        pathStroke={1.4}

        /* ── Pulsing red danger ring on selected object ── */
        ringsData={selectedTarget ? [selectedTarget] : []}
        ringLat="lat"
        ringLng="lng"
        ringAltitude="altitude_index"
        ringColor={() => ["rgba(255,20,20,0)","rgba(255,20,20,0.9)","rgba(255,20,20,0)"]}
        ringMaxRadius={7}
        ringPropagationSpeed={3}
        ringRepeatPeriod={650}
      />

      <style>{`@keyframes aegis-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
