import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  SlidersHorizontal,
  ShieldAlert,
  TrendingUp,
  Check,
  MapPin,
} from 'lucide-react';
import { jagrutiApi } from '../../api/jagruti';
import { useToast } from '../../context/ToastContext';

export default function NearbyHealthAlerts({ selectedArea }) {
  const toast = useToast();
  const [advisories, setAdvisories] = useState([]);
  const [preferences, setPreferences] = useState({
    enabled: true,
    minSeverity: 'moderate',
    diseases: [],
    radiusKm: 25,
  });
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jagrutiApi.getNearbyAlerts(
        selectedArea ? { city: selectedArea } : {}
      );
      if (res?.data) setAdvisories(res.data);
      if (res?.preferences) setPreferences(res.preferences);
    } catch (err) {
      console.warn('Could not load nearby health alerts:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedArea]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSavePrefs = async (nextPrefs) => {
    setSavingPrefs(true);
    try {
      const res = await jagrutiApi.updatePreferences(nextPrefs);
      if (res?.data) setPreferences(res.data);
      toast.success('Preferences Saved', 'Your Jagruti alert preferences are updated.');
      setShowPrefs(false);
      await fetchAlerts();
    } catch (err) {
      toast.error('Save Failed', err.message || 'Could not update alert preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            {preferences.enabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-black text-navy-900">
              Nearby Smart Health Advisories
            </h4>
            <p className="text-[11px] text-slate-500">
              Area-level public-health notifications (never triggered by single reports)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPrefs((prev) => !prev)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Notification Preferences</span>
        </button>
      </div>

      {/* Preferences Panel */}
      {showPrefs && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-navy-900">
              Enable Area-Level Health Advisories
            </label>
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, enabled: e.target.checked }))
              }
              className="w-4 h-4 accent-trust-600 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Minimum Activity Severity
              </label>
              <select
                value={preferences.minSeverity}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, minSeverity: e.target.value }))
                }
                className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
              >
                <option value="low">Low &amp; Above</option>
                <option value="moderate">Moderate &amp; High</option>
                <option value="high">High Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Monitoring Radius ({preferences.radiusKm} km)
              </label>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={preferences.radiusKm}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, radiusKm: Number(e.target.value) }))
                }
                className="w-full accent-trust-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPrefs(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingPrefs}
              onClick={() => handleSavePrefs(preferences)}
              className="px-3.5 py-1.5 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingPrefs ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Advisories List */}
      {!preferences.enabled ? (
        <div className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-4 text-center">
          Nearby health advisories are paused. Enable notifications above to receive regional alerts.
        </div>
      ) : loading ? (
        <div className="text-xs text-slate-400 py-4 text-center">
          Checking regional advisories...
        </div>
      ) : advisories.length === 0 ? (
        <div className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-4 text-center">
          No active elevated advisories matching your preferences in this region.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {advisories.map((adv) => (
            <div
              key={adv.id}
              className={`rounded-2xl p-3.5 border transition ${
                adv.severity === 'high'
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-navy-900">
                  {adv.severity === 'high' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  {adv.disease}
                </span>
                <div className="flex items-center gap-1.5">
                  {adv.isSampleData && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                      Sample
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                    {adv.caseCountRange} cases
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{adv.message}</p>

              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>{adv.approximateAreaName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
