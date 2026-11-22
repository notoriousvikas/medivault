import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Activity,
  ShieldAlert,
  MapPin,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  Check,
  X,
  Stethoscope,
  ChevronRight,
  Sparkles,
  Radio,
} from 'lucide-react';
import { healthRiskApi } from '../../api/healthRisk';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AreaHealthMonitoringView({ onOpenAiChat }) {
  const { user } = useAuth();
  const toast = useToast();

  const [alerts, setAlerts] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Filters
  const [selectedWindow, setSelectedWindow] = useState('7d'); // '24h' | '7d' | '30d'
  const [selectedSeverity, setSelectedSeverity] = useState('all'); // 'all' | 'critical' | 'elevated' | 'watch'
  const [searchQuery, setSearchQuery] = useState('');

  // Review modal state
  const [reviewingAlert, setReviewingAlert] = useState(null);
  const [reviewAction, setReviewAction] = useState('under_review');
  const [reviewNotes, setReviewNotes] = useState('');
  const [updatingReview, setUpdatingReview] = useState(false);

  const isMedicalStaff = user?.role === 'doctor' || user?.role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, overviewRes] = await Promise.allSettled([
        healthRiskApi.getAlerts({
          timeWindow: selectedWindow,
          severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        }),
        healthRiskApi.getOverview(),
      ]);

      if (alertsRes.status === 'fulfilled' && alertsRes.value?.data) {
        setAlerts(alertsRes.value.data);
      }
      if (overviewRes.status === 'fulfilled' && overviewRes.value?.data) {
        setOverview(overviewRes.value.data);
      }
    } catch (err) {
      console.warn('Could not load area health alerts:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedWindow, selectedSeverity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      await healthRiskApi.triggerScan(selectedWindow);
      toast.success('Cluster Scan Complete', 'Neighborhood health reports re-analyzed.');
      await fetchData();
    } catch (err) {
      toast.error('Scan Failed', err.message || 'Could not run cluster analysis.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingAlert) return;

    setUpdatingReview(true);
    try {
      await healthRiskApi.updateAlertStatus(
        reviewingAlert._id,
        reviewAction,
        reviewNotes
      );
      toast.success(
        'Alert Updated',
        `Cluster for ${reviewingAlert.areaName} marked as ${reviewAction}.`
      );
      setReviewingAlert(null);
      setReviewNotes('');
      await fetchData();
    } catch (err) {
      toast.error('Update Failed', err.message || 'Could not update alert.');
    } finally {
      setUpdatingReview(false);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      alert.areaName?.toLowerCase().includes(q) ||
      alert.city?.toLowerCase().includes(q) ||
      alert.postalCode?.toLowerCase().includes(q) ||
      alert.primarySymptomCategories?.some((s) => s.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards Banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Active Clusters */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Clusters
            </span>
            <div className="w-8 h-8 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-900 tracking-tight">
            {overview?.activeAlertsCount ?? alerts.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Localities monitored in {selectedWindow}
          </p>
        </div>

        {/* Critical Signals */}
        <div className="bg-white border border-rose-200/80 rounded-3xl p-4 sm:p-5 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Critical Clusters
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {overview?.criticalCount ??
              alerts.filter((a) => a.severity === 'critical').length}
          </div>
          <p className="text-[11px] text-rose-500/80 mt-0.5 font-medium">
            Urgent human review flagged
          </p>
        </div>

        {/* Elevated Signals */}
        <div className="bg-white border border-amber-200/80 rounded-3xl p-4 sm:p-5 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Elevated Activity
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {overview?.elevatedCount ??
              alerts.filter((a) => a.severity === 'elevated').length}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-0.5 font-medium">
            Unusual concentration of reports
          </p>
        </div>

        {/* Monitored Zones */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Monitored Localities
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-900 tracking-tight">
            {overview?.monitoredLocalitiesCount ??
              new Set(alerts.map((a) => a.areaKey)).size}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Postal codes & subdistricts
          </p>
        </div>
      </div>

      {/* ── Action Header & Controls ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Area Health Risk Detection</span>
            </h3>
            <p className="text-xs text-slate-500">
              Inferred passively from live Aarogya AI conversational speech & chat across localities
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
                onClick={handleTriggerScan}
                disabled={scanning}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                title="Re-run cluster scan on server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Scan Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Time Window Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
            {[
              { id: '24h', label: '24 Hours' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWindow(w.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedWindow === w.id
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-500 hover:text-navy-900'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Severity & Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-trust-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="elevated">Elevated</option>
              <option value="watch">Watch</option>
            </select>

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search locality, city, symptoms..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-trust-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerts Grid / List ── */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
          <div className="w-8 h-8 border-3 border-trust-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Analyzing neighborhood symptom data...
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-navy-900">
              No Anomalous Clusters Detected
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Health reports across all monitored localities in the {selectedWindow} window remain within expected baselines.
            </p>
          </div>
          {onOpenAiChat && (
            <button
              onClick={onOpenAiChat}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Discuss Health with Aarogya AI</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isElevated = alert.severity === 'elevated';

            return (
              <div
                key={alert._id}
                className={`bg-white border rounded-3xl p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between space-y-4 ${
                  isCritical
                    ? 'border-rose-300 ring-1 ring-rose-300/40'
                    : isElevated
                    ? 'border-amber-300 ring-1 ring-amber-300/30'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Card Top: Area Name & Severity Pill */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-trust-600 shrink-0" />
                        <h4 className="text-base font-extrabold text-navy-900">
                          {alert.areaName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium pl-6">
                        {[alert.city, alert.state, alert.postalCode ? `PIN ${alert.postalCode}` : '']
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isElevated
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-sky-100 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {alert.severity} Risk ({alert.riskScore}/100)
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize font-medium">
                        Status: <strong className="text-slate-600">{alert.status.replace('_', ' ')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Warning Callout Box */}
                  <div
                    className={`mt-4 p-3.5 rounded-2xl border text-xs leading-relaxed ${
                      isCritical
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                        : isElevated
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-sky-50/60 border-sky-200 text-sky-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isCritical ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                      <div>
                        <span className="font-extrabold">
                          {isCritical
                            ? 'Potential Health Cluster Detected'
                            : 'Elevated Symptom Concentration'}
                        </span>
                        <p className="mt-0.5 opacity-90">{alert.summaryNote}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Unique Users
                      </span>
                      <span className="text-sm font-extrabold text-navy-900">
                        {alert.uniqueUserCount}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Total Reports
                      </span>
                      <span className="text-sm font-extrabold text-navy-900">
                        {alert.totalReportCount}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Trend Growth
                      </span>
                      <span
                        className={`text-sm font-extrabold flex items-center justify-center gap-0.5 ${
                          alert.growthRate > 0
                            ? 'text-rose-600'
                            : alert.growthRate < 0
                            ? 'text-emerald-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {alert.growthRate > 0 && <TrendingUp className="w-3 h-3" />}
                        {alert.growthRate < 0 && <TrendingDown className="w-3 h-3" />}
                        {alert.growthRate > 0 ? `+${alert.growthRate}%` : `${alert.growthRate}%`}
                      </span>
                    </div>
                  </div>

                  {/* Primary Symptoms Breakdown */}
                  {alert.primarySymptomCategories?.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Commonly Reported Symptoms
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {alert.primarySymptomCategories.map((sym, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-navy-900 text-[11px] font-bold border border-slate-200"
                          >
                            <span>{sym.category}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white text-slate-500 font-extrabold shadow-2xs">
                              {sym.percentage}% ({sym.count})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Review status & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      Updated{' '}
                      {new Date(alert.lastEvaluatedAt || alert.updatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {isMedicalStaff && (
                    <button
                      onClick={() => {
                        setReviewingAlert(alert);
                        setReviewAction(
                          alert.status === 'active' ? 'under_review' : alert.status
                        );
                        setReviewNotes('');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl font-bold transition flex items-center gap-1"
                    >
                      <Stethoscope className="w-3 h-3 text-trust-600" />
                      <span>Review Action</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Review Action Modal for Medical Officers ── */}
      {reviewingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-navy-900">
                    Review Alert: {reviewingAlert.areaName}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Official clinical action log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingAlert(null)}
                className="p-1.5 text-slate-400 hover:text-navy-900 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">
                  Action Status
                </label>
                <select
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-trust-500"
                >
                  <option value="under_review">Mark Under Investigation</option>
                  <option value="resolved">Mark Resolved / Verified Safe</option>
                  <option value="dismissed">Dismiss (False Alarm / Spurious)</option>
                  <option value="active">Keep Active</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">
                  Investigation Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Primary health center notified. Seasonal viral pattern suspected..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-trust-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingAlert(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingReview || !reviewNotes.trim()}
                  className="px-5 py-2 bg-trust-600 hover:bg-trust-700 text-white text-xs font-extrabold rounded-xl transition disabled:opacity-50"
                >
                  {updatingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
