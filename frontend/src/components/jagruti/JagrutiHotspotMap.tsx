import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Plus,
  Minus,
  LocateFixed,
  Layers,
  MapPin,
  Database,
  ShieldCheck,
} from 'lucide-react';
import HotspotLegend from './HotspotLegend';
import HotspotDetailsCard, { HotspotItem } from './HotspotDetailsCard';

const SEVERITY_COLORS = {
  high: '#EF4444',
  moderate: '#F97316',
  low: '#EAB308',
  insufficient_data: '#94A3B8',
};

interface RegionPreset {
  label: string;
  center: [number, number];
  zoom: number;
}

const REGION_PRESETS: RegionPreset[] = [
  { label: 'All India', center: [78.9629, 22.5937], zoom: 4.5 },
  { label: 'Jammu', center: [74.857, 32.7266], zoom: 10.5 },
  { label: 'Delhi NCR', center: [77.209, 28.6139], zoom: 9.8 },
  { label: 'Mumbai', center: [72.8777, 19.076], zoom: 10.5 },
  { label: 'Bengaluru', center: [77.5946, 12.9716], zoom: 10.5 },
  { label: 'Hyderabad', center: [78.4867, 17.385], zoom: 10.5 },
];

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface JagrutiHotspotMapProps {
  hotspots?: HotspotItem[];
  loading?: boolean;
  viewMode?: 'hotspot' | 'area' | string;
  onViewModeChange?: (mode: 'hotspot' | 'area') => void;
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  selectedArea?: string;
  onSelectArea?: (area: string) => void;
  userLocation?: { latitude?: number; longitude?: number } | null;
  canSeedSample?: boolean;
  onSeedSample?: () => void;
  seedingSample?: boolean;
}

export default function JagrutiHotspotMap({
  hotspots = [],
  loading = false,
  viewMode = 'hotspot',
  onViewModeChange,
  onBoundsChange,
  selectedArea,
  onSelectArea,
  userLocation,
  canSeedSample = false,
  onSeedSample,
  seedingSample = false,
}: JagrutiHotspotMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hotspotsRef = useRef<HotspotItem[]>(hotspots);
  hotspotsRef.current = hotspots;

  const [mapReady, setMapReady] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null);

  const initialCenter = useMemo<[number, number]>(() => {
    if (userLocation?.longitude && userLocation?.latitude) {
      return [Number(userLocation.longitude), Number(userLocation.latitude)];
    }
    return [78.9629, 22.5937];
  }, [userLocation?.longitude, userLocation?.latitude]);

  const initialZoom = userLocation?.longitude && userLocation?.latitude ? 10 : 4.5;

  // Build GeoJSON FeatureCollections for hex polygons and area centroids
  const hexGeoJson = useMemo<any>(
    () => ({
      type: 'FeatureCollection',
      features: hotspots
        .filter((h) => h.hexBoundary?.coordinates)
        .map((h) => ({
          type: 'Feature' as const,
          id: h.id,
          properties: {
            id: h.id,
            severity: h.severity || 'insufficient_data',
            disease: h.disease,
            approximateAreaName: h.approximateAreaName,
            caseCountRange: h.caseCountRange,
          },
          geometry: h.hexBoundary,
        })),
    }),
    [hotspots]
  );

  const areaGeoJson = useMemo<any>(
    () => ({
      type: 'FeatureCollection',
      features: hotspots
        .filter((h) => h.centroid?.coordinates)
        .map((h) => ({
          type: 'Feature' as const,
          id: h.id,
          properties: {
            id: h.id,
            severity: h.severity || 'insufficient_data',
            disease: h.disease,
            approximateAreaName: h.approximateAreaName,
            label: `${h.city || h.approximateAreaName} (${h.caseCountRange})`,
          },
          geometry: h.centroid,
        })),
    }),
    [hotspots]
  );

  // Initialize MapLibre GL JS instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: { compact: true },
    });

    map.on('style.load', () => {
      if (map.getSource('jagruti-hexes')) return;

      map.addSource('jagruti-hexes', {
        type: 'geojson',
        data: hexGeoJson,
      });

      map.addSource('jagruti-areas', {
        type: 'geojson',
        data: areaGeoJson,
      });

      // Low-zoom visibility halo so res-7 H3 hexes are clearly visible at country/state zoom
      map.addLayer({
        id: 'jagruti-hex-halo',
        type: 'circle',
        source: 'jagruti-areas',
        layout: {
          visibility: viewMode === 'hotspot' ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 10, 6, 16, 9, 22, 11, 8],
          'circle-color': [
            'match',
            ['get', 'severity'],
            'high',
            SEVERITY_COLORS.high,
            'moderate',
            SEVERITY_COLORS.moderate,
            'low',
            SEVERITY_COLORS.low,
            SEVERITY_COLORS.insufficient_data,
          ],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.72, 9, 0.45, 10.5, 0],
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 4, 2, 10.5, 0],
          'circle-stroke-color': '#ffffff',
        },
      });

      // Hex Fill Layer
      map.addLayer({
        id: 'jagruti-hex-fill',
        type: 'fill',
        source: 'jagruti-hexes',
        paint: {
          'fill-color': [
            'match',
            ['get', 'severity'],
            'high',
            SEVERITY_COLORS.high,
            'moderate',
            SEVERITY_COLORS.moderate,
            'low',
            SEVERITY_COLORS.low,
            SEVERITY_COLORS.insufficient_data,
          ],
          'fill-opacity': 0.52,
        },
      });

      // Hex Outline Layer
      map.addLayer({
        id: 'jagruti-hex-outline',
        type: 'line',
        source: 'jagruti-hexes',
        paint: {
          'line-color': [
            'match',
            ['get', 'severity'],
            'high',
            '#B91C1C',
            'moderate',
            '#C2410C',
            'low',
            '#A16207',
            '#475569',
          ],
          'line-width': 1.8,
          'line-opacity': 0.85,
        },
      });

      // Blurred Area-Level Heat Circle Layer (used in 'area' viewMode)
      map.addLayer({
        id: 'jagruti-area-heat',
        type: 'circle',
        source: 'jagruti-areas',
        layout: {
          visibility: viewMode === 'area' ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 18, 10, 42, 13, 68],
          'circle-color': [
            'match',
            ['get', 'severity'],
            'high',
            SEVERITY_COLORS.high,
            'moderate',
            SEVERITY_COLORS.moderate,
            'low',
            SEVERITY_COLORS.low,
            SEVERITY_COLORS.insufficient_data,
          ],
          'circle-blur': 0.65,
          'circle-opacity': 0.65,
        },
      });

      // Pointer & Click handlers
      const handleSelectFeature = (e: any) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const clickedId = feature.properties?.id;
        const found = hotspotsRef.current.find((h) => h.id === clickedId);
        if (found) {
          setSelectedHotspot(found);
        }
      };

      map.on('click', 'jagruti-hex-fill', handleSelectFeature);
      map.on('click', 'jagruti-hex-halo', handleSelectFeature);
      map.on('click', 'jagruti-area-heat', handleSelectFeature);

      ['jagruti-hex-fill', 'jagruti-hex-halo', 'jagruti-area-heat'].forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });

      setMapReady(true);
    });

    map.on('moveend', () => {
      if (!onBoundsChange) return;
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      boundsTimerRef.current = setTimeout(() => {
        const b = map.getBounds();
        onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }, 300);
    });

    mapRef.current = map;

    return () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON sources when hotspots change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const hexSrc = mapRef.current.getSource('jagruti-hexes') as maplibregl.GeoJSONSource | undefined;
    const areaSrc = mapRef.current.getSource('jagruti-areas') as maplibregl.GeoJSONSource | undefined;
    if (hexSrc) hexSrc.setData(hexGeoJson);
    if (areaSrc) areaSrc.setData(areaGeoJson);

    // Keep selectedHotspot in sync if refreshed
    if (selectedHotspot) {
      const updated = hotspots.find((h) => h.id === selectedHotspot.id);
      if (updated) setSelectedHotspot(updated);
    }
  }, [mapReady, hexGeoJson, areaGeoJson, hotspots, selectedHotspot]);

  // Toggle layer visibility when viewMode switches
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const isHex = viewMode === 'hotspot';
    mapRef.current.setLayoutProperty(
      'jagruti-hex-fill',
      'visibility',
      isHex ? 'visible' : 'none'
    );
    mapRef.current.setLayoutProperty(
      'jagruti-hex-outline',
      'visibility',
      isHex ? 'visible' : 'none'
    );
    if (mapRef.current.getLayer('jagruti-hex-halo')) {
      mapRef.current.setLayoutProperty(
        'jagruti-hex-halo',
        'visibility',
        isHex ? 'visible' : 'none'
      );
    }
    mapRef.current.setLayoutProperty(
      'jagruti-area-heat',
      'visibility',
      isHex ? 'none' : 'visible'
    );
  }, [mapReady, viewMode]);

  const handleFlyToPreset = (preset: RegionPreset) => {
    if (onSelectArea) {
      onSelectArea(preset.label === 'All India' ? '' : preset.label);
    }
    if (mapRef.current) {
      mapRef.current.flyTo({ center: preset.center, zoom: preset.zoom, duration: 900 });
    }
  };

  const handleRecenterUser = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: initialCenter,
      zoom: userLocation?.longitude ? 10.5 : 4.5,
      duration: 800,
    });
  };

  return (
    <div className="space-y-3">
      {/* Quick Region Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <MapPin className="w-3.5 h-3.5 text-trust-600" />
            Region:
          </span>
          {REGION_PRESETS.map((preset) => {
            const isActive =
              (preset.label === 'All India' && !selectedArea) ||
              selectedArea?.toLowerCase() === preset.label.toLowerCase();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleFlyToPreset(preset)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-trust-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle: Hotspot View vs Area-Level View */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onViewModeChange?.('hotspot')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              viewMode === 'hotspot'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hotspot View</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.('area')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === 'area'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            Area-Level View
          </button>
        </div>
      </div>

      {/* Main Map + Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div
          className={`relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-soft-md bg-slate-100 min-h-[420px] sm:min-h-[500px] ${
            selectedHotspot ? 'lg:col-span-8' : 'lg:col-span-12'
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px] sm:min-h-[500px]" />

          {/* Top-Left Privacy Pill */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm text-[11px] font-bold text-navy-900">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>H3 k-Anonymous Zones (No Patient Locations)</span>
            </div>
          </div>

          {/* Top-Right Custom Map Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="Zoom in"
              className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-navy-900 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="Zoom out"
              className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-navy-900 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRecenterUser}
              aria-label="Recenter map"
              title="Recenter to my area"
              className="w-9 h-9 rounded-xl bg-white/95 hover:bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-trust-600 transition"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom-Left Legend (Desktop/Tablet) */}
          <div className="hidden sm:block absolute bottom-4 left-3 z-10 max-w-[260px]">
            <HotspotLegend compact />
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute top-14 left-3 z-10 px-3 py-1.5 rounded-full bg-navy-900/85 text-white text-[11px] font-bold flex items-center gap-2 shadow-md">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Updating hotspots...</span>
            </div>
          )}

          {/* Empty State Overlay */}
          {!loading && hotspots.length === 0 && (
            <div className="absolute inset-x-4 bottom-4 sm:inset-x-auto sm:right-4 sm:bottom-4 z-10 max-w-sm bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-soft-lg">
              <h5 className="text-xs font-black text-navy-900">
                Insufficient Data in Visible Region
              </h5>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                No H3 zones currently meet the minimum k-anonymity privacy threshold (k ≥ 5) for
                the selected filters. Insufficient data does not indicate a disease-free area.
              </p>
              {canSeedSample && onSeedSample && (
                <button
                  type="button"
                  disabled={seedingSample}
                  onClick={onSeedSample}
                  className="mt-2.5 w-full px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {seedingSample ? 'Loading Sample Data...' : 'Load Dev Sample Hotspots'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Side Panel for Selected Hotspot Details */}
        {selectedHotspot && (
          <div className="lg:col-span-4">
            <HotspotDetailsCard
              hotspot={selectedHotspot}
              onClose={() => setSelectedHotspot(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile Legend */}
      <div className="sm:hidden">
        <HotspotLegend compact />
      </div>
    </div>
  );
}
