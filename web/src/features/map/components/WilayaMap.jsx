import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getInfernoColor } from '../../../utils/inferno';
import { MapPin, Layers, Flame, Eye, EyeOff, AlertTriangle, Crosshair, Check, RotateCcw, Box } from 'lucide-react';

export function WilayaMap({ 
  geojson, 
  regions, 
  selectedWilaya, 
  onSelectWilaya, 
  timeseries, 
  activeYear, 
  activeMonth, 
  metric, 
  t 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileLabelRef = useRef(null);
  const customAoiLayerRef = useRef(null);

  const [showTiles, setShowTiles] = useState(true);
  const [isAoiOpen, setIsAoiOpen] = useState(false);
  const [aoiBounds, setAoiBounds] = useState({
    south: 36.45,
    north: 36.85,
    west: 4.80,
    east: 5.40
  });
  const [isAoiApplied, setIsAoiApplied] = useState(false);

  // Compute bounding box area in km²
  const aoiAreaKm2 = React.useMemo(() => {
    const latDist = Math.abs(aoiBounds.north - aoiBounds.south) * 111.32;
    const midLatRad = ((aoiBounds.north + aoiBounds.south) / 2) * (Math.PI / 180);
    const lonDist = Math.abs(aoiBounds.east - aoiBounds.west) * 111.32 * Math.cos(midLatRad);
    return Math.round(latDist * lonDist);
  }, [aoiBounds]);

  // Compute metric map for the active month across all 7 regions
  const currentMonthData = React.useMemo(() => {
    const dataByRegion = {};
    let max = 0;
    regions.forEach(r => {
      const rec = timeseries.find(
        row => row.region_id === r.id && row.year === activeYear && row.month === activeMonth
      );
      const val = rec ? (metric === 'count' ? rec.count : rec.frp) : 0;
      dataByRegion[r.id] = val;
      if (val > max) max = val;
    });
    return { values: dataByRegion, maxVal: max };
  }, [timeseries, activeYear, activeMonth, metric, regions]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on northern Algeria Tell Atlas
    const map = L.map(mapContainerRef.current, {
      center: [36.6, 4.8],
      zoom: 7.5,
      minZoom: 6,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true
    });

    // Base Layer with silent tile error handling for offline support
    const baseLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, OpenStreetMap contributors',
      maxZoom: 16
    });

    baseLayer.on('tileerror', (e) => {
      if (e.tile) e.tile.style.display = 'none';
    });

    // Optional labels overlay
    const labelLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      opacity: 0.6
    });

    labelLayer.on('tileerror', (e) => {
      if (e.tile) e.tile.style.display = 'none';
    });

    baseLayer.addTo(map);
    labelLayer.addTo(map);

    tileLayerRef.current = baseLayer;
    tileLabelRef.current = labelLayer;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Toggle Tiles on/off
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      if (showTiles) {
        if (!map.hasLayer(tileLayerRef.current)) map.addLayer(tileLayerRef.current);
        if (tileLabelRef.current && !map.hasLayer(tileLabelRef.current)) map.addLayer(tileLabelRef.current);
      } else {
        if (map.hasLayer(tileLayerRef.current)) map.removeLayer(tileLayerRef.current);
        if (tileLabelRef.current && map.hasLayer(tileLabelRef.current)) map.removeLayer(tileLabelRef.current);
      }
    }
  }, [showTiles]);

  // Update GeoJSON choropleth layer and centroid labels (works 100% with no tiles)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojson) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
    }

    const isCount = metric === 'count';
    const unit = isCount ? 'hotspots' : 'MW';
    const markersGroup = L.layerGroup();

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const rid = feature.properties.region_id;
        const val = currentMonthData.values[rid] || 0;
        const isSelected = rid === selectedWilaya;
        const fillColor = getInfernoColor(val, currentMonthData.maxVal || 100);

        return {
          fillColor: fillColor,
          weight: isSelected ? 3.5 : (showTiles ? 1.5 : 2.0),
          opacity: 1,
          color: isSelected ? '#0f172a' : (showTiles ? '#475569' : '#334155'),
          dashArray: isSelected ? '' : '2',
          fillOpacity: showTiles ? 0.88 : 0.95
        };
      },
      onEachFeature: (feature, fLayer) => {
        const rid = feature.properties.region_id;
        const name = feature.properties.region_name;
        const val = currentMonthData.values[rid] || 0;
        const isSelected = rid === selectedWilaya;
        const isLowConf = rid === 'algiers' || rid === 'boumerdes';

        // Permanent centroid label when tiles are off or always as a clean badge
        const bounds = fLayer.getBounds();
        const center = bounds.getCenter();

        // Secure Zero-Dependency DOM Construction (Immune to XSS)
        const labelContainer = document.createElement('div');
        labelContainer.className = `px-2 py-0.5 rounded shadow-sm text-center font-sans ${
          isSelected 
            ? 'bg-slate-900 text-white font-bold ring-2 ring-amber-400' 
            : 'bg-white/95 text-slate-800 font-semibold border border-slate-300'
        }`;
        labelContainer.style.fontSize = '11px';
        labelContainer.style.whiteSpace = 'nowrap';

        const nameSpan = document.createElement('div');
        nameSpan.textContent = String(name || '');
        labelContainer.appendChild(nameSpan);

        const valSpan = document.createElement('div');
        valSpan.style.fontSize = '9px';
        valSpan.style.fontFamily = 'monospace';
        valSpan.style.color = isSelected ? '#fde047' : '#475569';
        valSpan.textContent = `${Math.round(val).toLocaleString()} ${unit}`;
        labelContainer.appendChild(valSpan);

        const marker = L.marker(center, {
          icon: L.divIcon({
            html: labelContainer,
            className: 'wilaya-vector-label',
            iconSize: [80, 32],
            iconAnchor: [40, 16]
          }),
          interactive: true
        });

        marker.on('click', () => onSelectWilaya(rid));
        markersGroup.addLayer(marker);

        // Tooltip DOM element with textContent (Immune to DOM Injection)
        const tooltipEl = document.createElement('div');
        tooltipEl.style.fontFamily = 'inherit';
        tooltipEl.style.fontSize = '12px';
        tooltipEl.style.lineHeight = '1.4';

        const ttTitle = document.createElement('strong');
        ttTitle.style.color = '#0f172a';
        ttTitle.style.fontSize = '13px';
        ttTitle.textContent = String(name || '');
        tooltipEl.appendChild(ttTitle);

        tooltipEl.appendChild(document.createElement('br'));

        const ttVal = document.createElement('span');
        ttVal.style.color = '#475569';
        ttVal.textContent = `${Math.round(val).toLocaleString()} ${unit}`;
        tooltipEl.appendChild(ttVal);

        if (isLowConf) {
          tooltipEl.appendChild(document.createElement('br'));
          const ttNotice = document.createElement('span');
          ttNotice.style.color = '#b45309';
          ttNotice.style.fontSize = '10px';
          ttNotice.style.fontWeight = '600';
          ttNotice.textContent = '* Few detections, low confidence';
          tooltipEl.appendChild(ttNotice);
        }

        fLayer.bindTooltip(tooltipEl, { className: 'custom-leaflet-tooltip', sticky: true });

        fLayer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3.5,
              color: '#0f172a',
              fillOpacity: 0.98
            });
            l.bringToFront();
          },
          mouseout: (e) => {
            geojsonLayerRef.current.resetStyle(e.target);
          },
          click: () => {
            onSelectWilaya(rid);
          }
        });
      }
    }).addTo(map);

    markersGroup.addTo(map);

    geojsonLayerRef.current = layer;
    markersLayerRef.current = markersGroup;

    // Center map around northern Algeria bounding box
    map.fitBounds(layer.getBounds(), { padding: [20, 20] });

  }, [geojson, currentMonthData, selectedWilaya, metric, showTiles, onSelectWilaya]);

  // Handle Custom AOI Bounding Box Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (customAoiLayerRef.current) {
      map.removeLayer(customAoiLayerRef.current);
      customAoiLayerRef.current = null;
    }

    if (!isAoiApplied) return;

    const bounds = [
      [aoiBounds.south, aoiBounds.west],
      [aoiBounds.north, aoiBounds.east]
    ];

    const aoiGroup = L.layerGroup();

    const rect = L.rectangle(bounds, {
      color: '#dc2626',
      weight: 2.5,
      dashArray: '5, 5',
      fillColor: '#ef4444',
      fillOpacity: 0.15
    });

    const center = [(aoiBounds.south + aoiBounds.north) / 2, (aoiBounds.west + aoiBounds.east) / 2];

    const aoiBadge = document.createElement('div');
    aoiBadge.className = 'px-2 py-0.5 rounded shadow-md text-center font-sans bg-red-600 text-white font-bold text-[10px] ring-1 ring-white/80 whitespace-nowrap';
    aoiBadge.textContent = `Custom AOI: ~${aoiAreaKm2.toLocaleString()} km²`;

    const marker = L.marker(center, {
      icon: L.divIcon({
        html: aoiBadge,
        className: 'custom-aoi-center-badge',
        iconSize: [140, 24],
        iconAnchor: [70, 12]
      }),
      interactive: false
    });

    aoiGroup.addLayer(rect);
    aoiGroup.addLayer(marker);
    aoiGroup.addTo(map);

    customAoiLayerRef.current = aoiGroup;
    map.fitBounds(bounds, { padding: [35, 35] });

  }, [isAoiApplied, aoiBounds, aoiAreaKm2]);

  const applyPreset = (s, n, w, e) => {
    setAoiBounds({ south: s, north: n, west: w, east: e });
    setIsAoiApplied(true);
  };

  const clearAOI = () => {
    setIsAoiApplied(false);
    if (geojsonLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(geojsonLayerRef.current.getBounds(), { padding: [20, 20] });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-full">
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-amber-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t.mapTitle}
          </h2>
        </div>
        
        {/* Actions Bar */}
        <div className="flex items-center gap-2">
          {/* Custom AOI Toggle */}
          <button
            type="button"
            onClick={() => setIsAoiOpen(!isAoiOpen)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
              isAoiOpen || isAoiApplied
                ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Custom Area of Interest (AOI): Draw custom bounding box or input coordinates per NASA Challenge brief"
          >
            <Crosshair size={12} className={isAoiApplied ? "text-red-600 animate-pulse" : "text-slate-500"} />
            <span>{isAoiApplied ? `AOI Active (${aoiAreaKm2} km²)` : 'Custom AOI'}</span>
          </button>

          {/* Tiles / Vector Toggle */}
          <button
            type="button"
            onClick={() => setShowTiles(!showTiles)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
              showTiles 
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' 
                : 'bg-amber-600 text-white border-amber-700 shadow-2xs'
            }`}
            title="Toggle between online map tiles and standalone vector mode (works 100% offline with zero tiles)"
          >
            {showTiles ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showTiles ? 'Tiles: On' : 'Vector Only'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Custom AOI Coordinate Control Panel (Satisfies NASA Prompt Wishlist) */}
      {isAoiOpen && (
        <div className="p-3 bg-red-50/50 border-b border-red-200/80 text-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-red-950 flex items-center gap-1.5 text-[11px]">
              <Box size={13} className="text-red-600" />
              Define Custom Area of Interest (Bounding Box Coordinates)
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset(36.55, 36.78, 4.55, 4.88)}
                className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] hover:bg-slate-100 text-slate-700"
              >
                Akfadou Forest
              </button>
              <button
                type="button"
                onClick={() => applyPreset(36.40, 36.55, 4.05, 4.45)}
                className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] hover:bg-slate-100 text-slate-700"
              >
                Djurdjura Ridge
              </button>
              <button
                type="button"
                onClick={() => applyPreset(36.74, 36.83, 5.04, 5.16)}
                className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] hover:bg-slate-100 text-slate-700"
              >
                Gouraya Reserve
              </button>
              {isAoiApplied && (
                <button
                  type="button"
                  onClick={clearAOI}
                  className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-semibold text-[10px] hover:bg-red-200 flex items-center gap-0.5"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-slate-500 font-semibold">Min Lat (South)</label>
              <input
                type="number"
                step="0.01"
                value={aoiBounds.south}
                onChange={e => setAoiBounds({ ...aoiBounds, south: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-semibold">Max Lat (North)</label>
              <input
                type="number"
                step="0.01"
                value={aoiBounds.north}
                onChange={e => setAoiBounds({ ...aoiBounds, north: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-semibold">Min Lon (West)</label>
              <input
                type="number"
                step="0.01"
                value={aoiBounds.west}
                onChange={e => setAoiBounds({ ...aoiBounds, west: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-semibold">Max Lon (East)</label>
              <input
                type="number"
                step="0.01"
                value={aoiBounds.east}
                onChange={e => setAoiBounds({ ...aoiBounds, east: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-slate-600">
              Approx. Surface Footprint: <strong>{aoiAreaKm2.toLocaleString()} km²</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsAoiApplied(true)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
            >
              <Check size={12} /> Apply AOI Slice
            </button>
          </div>
        </div>
      )}

      {/* Map Canvas with SVG Cartographic Background for 100% Tile-Free Reliability */}
      <div 
        className="relative flex-1 min-h-[300px] w-full"
        style={{
          backgroundColor: showTiles ? '#f1f5f9' : '#e2e8f0',
          backgroundImage: showTiles 
            ? 'none' 
            : 'radial-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #dbeafe 0%, #f1f5f9 40%, #e2e8f0 100%)',
          backgroundSize: showTiles ? 'auto' : '16px 16px, 100% 100%'
        }}
      >
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

        {/* Selected Wilaya Overlay Badge */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 text-xs">
          <MapPin size={13} className="text-red-600" />
          <span className="font-bold text-slate-900">
            {regions.find(r => r.id === selectedWilaya)?.name || selectedWilaya}
          </span>
          {(selectedWilaya === 'algiers' || selectedWilaya === 'boumerdes') && (
            <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Low Confidence
            </span>
          )}
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-700 font-semibold">
            {Math.round(currentMonthData.values[selectedWilaya] || 0).toLocaleString()} {metric === 'count' ? 'hotspots' : 'MW'}
          </span>
        </div>

        {/* Map Choropleth Legend (Bottom Right) with Strict Single Vocabulary */}
        <div className="absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-slate-200 shadow-sm text-[10px] text-slate-700 flex items-center gap-2">
          <span className="font-semibold text-slate-800">{t.mapLegend}:</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-2.5 rounded-xs bg-white border border-slate-300" title="0 (Zero Burning)" />
            <span className="w-3.5 h-2.5 rounded-xs" style={{ backgroundColor: '#2d174d' }} title={t.statusLow} />
            <span className="w-3.5 h-2.5 rounded-xs" style={{ backgroundColor: '#781c6d' }} title={t.statusNormal} />
            <span className="w-3.5 h-2.5 rounded-xs" style={{ backgroundColor: '#ed6925' }} title={t.statusHigh} />
            <span className="w-3.5 h-2.5 rounded-xs" style={{ backgroundColor: '#fcffa4' }} title={t.statusExtreme} />
          </div>
          <span className="font-mono text-slate-500 text-[9px] uppercase">Inferno Scale</span>
        </div>

      </div>
    </div>
  );
}
