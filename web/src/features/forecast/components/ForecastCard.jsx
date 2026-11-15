import React, { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Flame, Compass, Info, ChevronRight } from 'lucide-react';

export function ForecastCard({ selectedWilaya, forecasts, forecastMetrics, t }) {
  const [showFullYear, setShowFullYear] = useState(false);

  const regionForecasts = forecasts?.[selectedWilaya] || [];
  const metrics = forecastMetrics?.[selectedWilaya] || null;

  if (!regionForecasts || regionForecasts.length === 0) return null;

  const nextMonth = regionForecasts[0]; // 2026-12
  const nextMonthName = t.months[nextMonth.month - 1];

  const riskConfig = {
    extreme: {
      badge: 'bg-red-600 text-white border-red-700',
      banner: 'bg-red-50/70 border-red-200',
      text: 'text-red-700',
      label: t.statusExtreme,
      icon: Flame,
      action: 'Heightened surveillance required. Critical fire weather vigilance.'
    },
    high: {
      badge: 'bg-amber-500 text-white border-amber-600',
      banner: 'bg-amber-50/70 border-amber-200',
      text: 'text-amber-700',
      label: t.statusHigh,
      icon: AlertTriangle,
      action: 'Elevated preparedness. Monitor afternoon dry winds and agricultural burns.'
    },
    normal: {
      badge: 'bg-emerald-600 text-white border-emerald-700',
      banner: 'bg-emerald-50/50 border-emerald-200',
      text: 'text-emerald-700',
      label: t.statusNormal,
      icon: ShieldCheck,
      action: 'Typical seasonal fire activity expected. Maintain standard response readiness.'
    },
    low: {
      badge: 'bg-slate-600 text-white border-slate-700',
      banner: 'bg-slate-50 border-slate-200',
      text: 'text-slate-700',
      label: t.statusLow,
      icon: ShieldCheck,
      action: 'Winter baseline conditions. Low probability of vegetation fire spread.'
    }
  };

  const cfg = riskConfig[nextMonth.risk_class] || riskConfig.normal;
  const RiskIcon = cfg.icon;

  return (
    <div className={`mt-4 rounded-xl border p-4 shadow-xs transition-all ${cfg.banner}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-amber-600">
            <Compass size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Next Month Operational Hazard Outlook</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                {nextMonthName} {nextMonth.year}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Autonomous Machine Learning projection trained on 25 years of harmonized multi-satellite data.
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-2xs ${cfg.badge}`}>
          <RiskIcon size={13} />
          <span>{cfg.label} RISK</span>
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3">
        
        {/* Predicted Count */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Forecasted Activity</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {nextMonth.predicted_count.toFixed(1)} <span className="text-xs font-normal text-slate-500">hotspots</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Multi-year median: {nextMonth.baseline_median} hotspots
          </span>
        </div>

        {/* Burned Footprint Estimate */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">Estimated Burn Footprint</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {nextMonth.ha_min} – {nextMonth.ha_max} <span className="text-xs font-normal text-slate-500">ha</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Calibrated range (EFFIS / JRC Algeria model)
          </span>
        </div>

        {/* Operational Guidance */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Field Action Protocol</span>
            <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-tight">
              {cfg.action}
            </p>
          </div>
          {metrics && (
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Model LOOCV MAE: &plusmn;{metrics.loocv_mae} hotspots
            </span>
          )}
        </div>

      </div>

      {/* 2027 Full Horizon Toggle */}
      <div className="pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
        <button
          type="button"
          onClick={() => setShowFullYear(!showFullYear)}
          className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
        >
          <span>{showFullYear ? 'Hide 2027 Seasonal Horizon' : 'View 12-Month 2027 Horizon Outlook'}</span>
          <ChevronRight size={13} className={`transition-transform ${showFullYear ? 'rotate-90' : ''}`} />
        </button>

        <span className="text-[10px] text-slate-400">
          * Autonomous prediction; serves as decision aid alongside daily operational fire weather.
        </span>
      </div>

      {/* Expanded 12-Month Horizon Table */}
      {showFullYear && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 overflow-x-auto">
          <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200 overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Horizon</th>
                <th className="py-2 px-3">Predicted Hotspots</th>
                <th className="py-2 px-3">Estimated Footprint (ha)</th>
                <th className="py-2 px-3">Historical Median</th>
                <th className="py-2 px-3">Projected Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {regionForecasts.slice(0, 12).map((fc, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-800">
                    {t.monthsShort[fc.month - 1]} {fc.year}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-slate-900">
                    {fc.predicted_count.toFixed(1)}
                  </td>
                  <td className="py-1.5 px-3 text-slate-700">
                    {fc.ha_min} – {fc.ha_max} ha
                  </td>
                  <td className="py-1.5 px-3 text-slate-500">
                    {fc.baseline_median}
                  </td>
                  <td className="py-1.5 px-3 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      fc.risk_class === 'extreme' ? 'bg-red-100 text-red-800' :
                      fc.risk_class === 'high' ? 'bg-amber-100 text-amber-800' :
                      fc.risk_class === 'low' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {fc.risk_class}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
