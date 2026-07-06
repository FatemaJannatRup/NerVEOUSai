import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import geojsonData from "../data/bd-districts.geo.json";
import districtsMeta from "../data/districts.json";
import { riskColorForScore } from "../utils/riskStyle.js";
import { sfx } from "../utils/sound.js";

const BD_CENTER = [23.85, 90.35];
const BD_ZOOM = 7;

// Districts whose labels should always show, regardless of zoom (major/well-known ones).
const ALWAYS_LABELED = new Set(["Dhaka", "Cox's Bazar"]);

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function featureArea(feature) {
  const geom = feature.geometry;
  if (!geom) return 0;
  if (geom.type === "Polygon") return ringArea(geom.coordinates[0]);
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.reduce((acc, poly) => acc + ringArea(poly[0]), 0);
  }
  return 0;
}

// How many of the largest districts get a permanent label at a given zoom level.
// Fewer labels when zoomed out (avoids clutter), everything shown once zoomed in.
function labelBudgetForZoom(zoom) {
  if (zoom <= 6) return 8;
  if (zoom === 7) return 16;
  if (zoom === 8) return 32;
  return Infinity;
}

function FitToCountry() {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(geojsonData);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [14, 14] });
  }, [map]);
  return null;
}

function MapControls() {
  const map = useMap();
  return (
    <div style={{ position: "absolute", top: 14, right: 14, zIndex: 500, display: "flex", flexDirection: "column", gap: 6 }}>
      <button className="map-zoom-btn" onClick={() => { sfx.click(); map.zoomIn(); }}>+</button>
      <button className="map-zoom-btn" onClick={() => { sfx.click(); map.zoomOut(); }}>−</button>
      <button className="map-zoom-btn" style={{ fontSize: 14 }} onClick={() => { sfx.click(); map.setView(BD_CENTER, BD_ZOOM); }}>⌂</button>
    </div>
  );
}

function ZoomWatcher({ onZoom }) {
  useMapEvents({
    zoomend: (e) => onZoom(e.target.getZoom()),
  });
  return null;
}

export default function RiskMap({ riskByDistrict, selectedDistrict, onSelectDistrict, loading }) {
  const geoJsonLayerRef = useRef(null);
  const [hoveredName, setHoveredName] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [zoom, setZoom] = useState(BD_ZOOM);

  // Rank districts largest-to-smallest so we know which labels to show first when culling.
  const labelPriority = useMemo(() => {
    const ranked = geojsonData.features
      .map((f) => ({ name: f.properties.ADM2_EN, area: featureArea(f) }))
      .sort((a, b) => b.area - a.area);
    const rankByName = new Map();
    ranked.forEach((d, i) => rankByName.set(d.name, i));
    return rankByName;
  }, []);

  const shouldShowLabel = useCallback(
    (name) => {
      if (ALWAYS_LABELED.has(name)) return true;
      const budget = labelBudgetForZoom(zoom);
      const rank = labelPriority.get(name);
      return rank != null && rank < budget;
    },
    [zoom, labelPriority]
  );

  const getStyle = useCallback(
    (feature) => {
      const name = feature.properties.ADM2_EN;
      const risk = riskByDistrict[name];
      const score = risk?.overallRisk;
      const isSelected = selectedDistrict === name;
      const isHovered = hoveredName === name;

      return {
        fillColor: score != null ? riskColorForScore(score) : "#2b3a24",
        fillOpacity: score != null ? (isSelected ? 0.92 : isHovered ? 0.85 : 0.68) : 0.4,
        color: isSelected ? "#ffffff" : isHovered ? "var(--diamond)" : "rgba(255,255,255,0.35)",
        weight: isSelected ? 3 : isHovered ? 2 : 1,
        className: isSelected ? "district-path district-path-selected" : "district-path",
      };
    },
    [riskByDistrict, selectedDistrict, hoveredName]
  );

  useEffect(() => {
    const gj = geoJsonLayerRef.current;
    if (!gj) return;
    gj.eachLayer((layer) => {
      layer.setStyle(getStyle(layer.feature));
      if (selectedDistrict === layer.feature.properties.ADM2_EN) layer.bringToFront();
    });
  }, [getStyle, selectedDistrict]);

  useEffect(() => {
    const gj = geoJsonLayerRef.current;
    if (!gj) return;
    gj.eachLayer((layer) => {
      const name = layer.feature.properties.ADM2_EN;
      const tooltip = layer.getTooltip && layer.getTooltip();
      if (!tooltip) return;
      tooltip.setOpacity(shouldShowLabel(name) ? 0.85 : 0);
    });
  }, [shouldShowLabel]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const name = feature.properties.ADM2_EN;

      layer.bindTooltip(name, {
        permanent: true,
        direction: "center",
        className: "district-label",
        opacity: shouldShowLabel(name) ? 0.85 : 0,
      });

      layer.on({
        mouseover: (e) => {
          setHoveredName(name);
          e.target.bringToFront();
        },
        mouseout: () => setHoveredName(null),
        mousemove: (e) => setTooltipPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY }),
        click: () => {
          sfx.place();
          onSelectDistrict(name);
        },
      });
    },
    [onSelectDistrict]
  );

  const hoveredMeta = hoveredName ? districtsMeta[hoveredName] : null;
  const hoveredRisk = hoveredName ? riskByDistrict[hoveredName] : null;
  const hasData = useMemo(() => Object.keys(riskByDistrict).length > 0, [riskByDistrict]);

  return (
    <div
      data-tour="map"
      className="mc-panel"
      style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #000" }}>
        <div className="font-pixel" style={{ fontSize: 11, color: "var(--diamond)" }}>⛰ RISK MAP — LIVE</div>
        <div className="mono" style={{ fontSize: 14, color: "var(--text-tertiary)" }}>
          {loading ? "recalculating every district..." : "click any district"}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,8,16,0.55)" }}>
            <div className="mc-spinner" />
          </div>
        )}
        <MapContainer
          center={BD_CENTER}
          zoom={BD_ZOOM}
          minZoom={6}
          maxZoom={11}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
          preferCanvas={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" className="map-tiles" />
          <GeoJSON
            ref={geoJsonLayerRef}
            data={geojsonData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
          <FitToCountry />
          <MapControls />
          <ZoomWatcher onZoom={setZoom} />
        </MapContainer>
      </div>

      {hoveredMeta && tooltipPos && (
        <div
          className="map-tooltip"
          style={{ left: Math.min(tooltipPos.x + 16, window.innerWidth - 190), top: Math.max(tooltipPos.y - 60, 70) }}
        >
          <div className="map-tooltip-name">{hoveredName}</div>
          <div className="map-tooltip-sub">
            {hoveredMeta.division} Division{hoveredMeta.coastal ? " · Coastal" : ""}
          </div>
          {hoveredRisk && (
            <div className="map-tooltip-sub" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8, height: 8, display: "inline-block",
                  background: riskColorForScore(hoveredRisk.overallRisk),
                  boxShadow: `0 0 6px ${riskColorForScore(hoveredRisk.overallRisk)}`,
                }}
              />
              Risk: <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{hoveredRisk.overallRisk}/100</span>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "8px 14px", borderTop: "3px solid #000", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ fontSize: 13, color: "var(--text-tertiary)" }}>risk:</span>
        <div style={{ width: 140, height: 10, background: "linear-gradient(90deg, #3ddc84, #f6c445, #ff953b, #ff4b4b, #b21818)", border: "2px solid #000" }} />
        <span className="mono" style={{ fontSize: 13, color: "var(--text-tertiary)" }}>0 → 100</span>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-tertiary)" }}>
          {hasData ? "updates live as sliders move" : "scroll to zoom · drag to pan"}
        </span>
      </div>
    </div>
  );
}
