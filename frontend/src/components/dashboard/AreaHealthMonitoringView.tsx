import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, Radio } from 'lucide-react';
import { jagrutiApi } from '../../api/jagruti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import JagrutiHotspotMap from '../jagruti/JagrutiHotspotMap';
import HotspotSummary from '../jagruti/HotspotSummary';
import DiseaseFilter from '../jagruti/DiseaseFilter';
import TimeRangeFilter from '../jagruti/TimeRangeFilter';
import NearbyHealthAlerts from '../jagruti/NearbyHealthAlerts';
import { HotspotItem } from '../jagruti/HotspotDetailsCard';

interface AreaHealthMonitoringViewProps {
  onOpenAiChat?: () => void;
}

export default function AreaHealthMonitoringView({ onOpenAiChat }: AreaHealthMonitoringViewProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [hotspotSummary, setHotspotSummary] = useState<any>(null);
  const [hotspotLoading, setHotspotLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seedingSample, setSeedingSample] = useState(false);

  // Filters
  const [hotspotWindow, setHotspotWindow] = useState('7d'); // '7d' | '30d' | '90d'
  const [selectedDisease, setSelectedDisease] = useState('all');
  const [selectedArea, setSelectedArea] = useState('');
  const [viewMode, setViewMode] = useState<'hotspot' | 'area'>('hotspot');
  const [mapBbox, setMapBbox] = useState<[number, number, number, number] | null>(null);

  const isMedicalStaff = user?.role === 'doctor' || user?.role === 'admin';

  const fetchHotspotData = useCallback(async () => {
    setHotspotLoading(true);
    try {
      const params: Record<string, any> = {
        timeWindow: hotspotWindow,
        disease: selectedDisease,
        viewMode,
      };
      if (selectedArea) params.area = selectedArea;
      if (mapBbox && !selectedArea) params.bbox = mapBbox.join(',');

      const [hotspotsRes, summaryRes] = await Promise.allSettled([
        jagrutiApi.getHotspots(params),
        jagrutiApi.getHotspotSummary({
          timeWindow: hotspotWindow,
          disease: selectedDisease,
          ...(selectedArea ? { area: selectedArea } : {}),
        }),
      ]);

      if (hotspotsRes.status === 'fulfilled' && hotspotsRes.value?.data) {
        setHotspots(hotspotsRes.value.data);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setHotspotSummary(summaryRes.value.data);
      }
    } catch (err: any) {
      console.warn('Could not load H3 hotspots:', err.message);
    } finally {
      setHotspotLoading(false);
    }
  }, [hotspotWindow, selectedDisease, selectedArea, viewMode, mapBbox]);

  useEffect(() => {
    fetchHotspotData();
  }, [fetchHotspotData]);

  const handleRefreshHotspots = async () => {
    setRefreshing(true);
    try {
      await jagrutiApi.refreshHotspots(hotspotWindow);
      toast.success('Hotspots Refreshed', 'H3 regional disease aggregation updated.');
      await fetchHotspotData();
    } catch (err: any) {
      toast.error('Refresh Failed', err.message || 'Could not refresh H3 hotspots.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSeedSample = async () => {
    setSeedingSample(true);
    try {
      await jagrutiApi.seedSampleHotspots();
      toast.success(
        'Sample Hotspots Loaded',
        'Clearly marked development sample data is now displayed.'
      );
      await fetchHotspotData();
    } catch (err: any) {
      toast.error('Seed Failed', err.message || 'Could not load sample hotspots.');
    } finally {
      setSeedingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Jagruti Header & Actions ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>AyuRaksha – Jagruti Disease Hotspot Map</span>
          </h3>
          <p className="text-xs text-slate-500">
            Privacy-preserving H3 regional disease activity &amp; public-health advisories
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenAiChat && (
            <button
              onClick={onOpenAiChat}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-trust-600 to-indigo-600 hover:from-trust-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20"
              title="Talk to Aarogya AI about symptoms"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Talk to Aarogya AI</span>
            </button>
          )}

          {isMedicalStaff && (
            <button
              onClick={handleRefreshHotspots}
              disabled={refreshing}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              title="Re-run H3 hotspot aggregation on server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Hotspots</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Regional Summary Metrics ── */}
      <HotspotSummary summary={hotspotSummary} loading={hotspotLoading} />

      {/* ── Map Filters Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <TimeRangeFilter value={hotspotWindow} onChange={setHotspotWindow} />
        <DiseaseFilter
          value={selectedDisease}
          onChange={setSelectedDisease}
          className="w-full md:w-64"
        />
      </div>

      {/* ── Interactive MapLibre H3 Hotspot Map ── */}
      <JagrutiHotspotMap
        hotspots={hotspots}
        loading={hotspotLoading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBoundsChange={setMapBbox}
        selectedArea={selectedArea}
        onSelectArea={setSelectedArea}
        userLocation={user?.location}
        canSeedSample={isMedicalStaff || import.meta.env.DEV}
        onSeedSample={handleSeedSample}
        seedingSample={seedingSample}
      />

      {/* ── Smart Area-Level Advisories & Notification Preferences ── */}
      <NearbyHealthAlerts selectedArea={selectedArea || user?.location?.city} />
    </div>
  );
}
