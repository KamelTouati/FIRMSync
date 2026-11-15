import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Flame, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Satellite, 
  Clock, 
  TrendingUp, 
  BarChart2,
  AlertOctagon
} from 'lucide-react';

export function StatusIndicator({ 
  currentRecord, 
  metric, 
  t, 
  baselines 
}) {
  const [showAnalystDetails, setShowAnalystDetails] = useState(false);

  if (!currentRecord) return null;

  const isCount = metric === 'count';
  const val = isCount ? currentRecord.count : currentRecord.frp;
  const rawVal = isCount ? currentRecord.count_raw : currentRecord.frp_raw;
  const unit = isCount ? 'hotspots' : 'MW';
  const status = isCount ? currentRecord.count_status : currentRecord.frp_status;
  const zScore = isCount ? currentRecord.count_z : currentRecord.frp_z;
  const pctRank = currentRecord.count_pct;
  const baseMedian = isCount ? currentRecord.count_base_median : currentRecord.frp_base_median;
  const isPartial = !currentRecord.complete;

  const monthName = t.months[currentRecord.month - 1];
  const monthNameShort = t.monthsShort[currentRecord.month - 1];

  // Specific baseline stats for active month
  const mKey = isCount ? 'count_viirs_eq' : 'frp_sum_viirs_eq_mw';
  const stats = baselines?.[currentRecord.region_id]?.[mKey]?.[currentRecord.month] || null;

  // Visual status config with strict single vocabulary (LOW, NORMAL, HIGH, EXTREME)
  const statusConfig = {
    extreme: {
      badgeBg: 'bg-red-600 text-white border-red-700',
      bannerBg: 'bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-red-300',
      pillBg: 'bg-red-100 text-red-900 border-red-200',
      icon: Flame,
      label: t.statusExtreme,
      accent: 'text-red-700',
    },
    high: {
      badgeBg: 'bg-amber-500 text-white border-amber-600',
      bannerBg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300',
      pillBg: 'bg-amber-100 text-amber-900 border-amber-200',
      icon: AlertTriangle,
      label: t.statusHigh,
      accent: 'text-amber-700',
    },
    normal: {
      badgeBg: 'bg-emerald-600 text-white border-emerald-700',
      bannerBg: 'bg-emerald-50/60 border-emerald-200',
      pillBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      icon: ShieldCheck,
      label: t.statusNormal,
      accent: 'text-emerald-700',
    },
    low: {
      badgeBg: 'bg-slate-600 text-white border-slate-700',
      bannerBg: 'bg-slate-100/70 border-slate-200',
      pillBg: 'bg-slate-200 text-slate-800 border-slate-300',
      icon: Info,
      label: t.statusLow,
      accent: 'text-slate-700',
    }
  };

  const cfg = statusConfig[status] || statusConfig.normal;
  const StatusIcon = cfg.icon;

  const sensorLabel = {
    modis: 'MODIS C6.1 (Calibrated)',
    viirs_snpp: 'VIIRS Suomi-NPP (375m)',
    viirs_noaa20: 'VIIRS NOAA-20 (375m)'
  }[currentRecord.series_used] || currentRecord.series_used;

  return (
    <div className={`rounded-xl border p-4 sm:p-5 shadow-xs transition-all ${cfg.bannerBg}`}>
      
      {/* Header Verdict Line */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <Clock size={13} />
            {t.unusualHeader}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-700">
            {monthName} {currentRecord.year}
          </span>

          {isPartial && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              <AlertOctagon size={12} />
              {t.partialMonthBadge}
            </span>
          )}
        </div>

        {/* Big Alert Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-2xs ${cfg.badgeBg}`}>
          <StatusIcon size={14} />
          <span>{cfg.label}</span>
        </div>
      </div>

      {/* Main Plain-Language Verdict */}
      <div className="py-3">
        <p className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
          {t.verdictSentence(
            currentRecord.region_name,
            monthName,
            currentRecord.year,
            pctRank,
            status,
            isPartial
          )}
        </p>

        {/* Low Confidence Notice for Algiers & Boumerdes */}
        {(currentRecord.region_id === 'algiers' || currentRecord.region_id === 'boumerdes') && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50/90 border border-amber-300 text-xs text-amber-950 flex items-start gap-2 shadow-2xs">
            <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">{t.lowConfidenceNotice}</strong>
            </div>
          </div>
        )}

        {isPartial && (
          <p className="text-xs text-amber-900 font-medium mt-1">
            ⚠️ {t.partialMonthNotice}
          </p>
        )}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        
        {/* Recorded Value */}
        <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">{t.recordedValue}</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {val >= 10 ? Math.round(val).toLocaleString() : val.toFixed(1)} <span className="text-xs font-normal text-slate-500">{unit}</span>
          </div>
          {currentRecord.burned_ha_min !== undefined && currentRecord.count > 0 && (
            <div className="text-[10px] text-amber-800 font-medium mt-0.5" title="Estimated empirical burned footprint based on EFFIS/JRC Mediterranean benchmark calibrations">
              ~{currentRecord.burned_ha_min.toLocaleString()} – {currentRecord.burned_ha_max.toLocaleString()} ha (est.)
            </div>
          )}
          {currentRecord.series_used === 'modis' && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              (Raw MODIS: {rawVal} × {currentRecord.ratio_count} ratio)
            </div>
          )}
        </div>

        {/* 2003-2025 Baseline Median */}
        <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">{t.baselineMedian}</div>
          <div className="text-lg font-bold text-slate-700 mt-0.5">
            {baseMedian >= 10 ? Math.round(baseMedian).toLocaleString() : baseMedian.toFixed(1)} <span className="text-xs font-normal text-slate-500">{unit}</span>
          </div>
        </div>

        {/* Historical Rank */}
        <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <TrendingUp size={12} />
            {t.historicalRank}
          </div>
          <div className={`text-lg font-bold mt-0.5 ${cfg.accent}`}>
            {pctRank >= 50 ? `Higher than ${pctRank}%` : `Lower than ${100 - pctRank}%`}
          </div>
        </div>

        {/* Sensor & Freshness */}
        <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Satellite size={12} />
            {t.sensorSeries}
          </div>
          <div className="text-xs font-bold text-slate-800 truncate mt-1">
            {sensorLabel}
          </div>
          {currentRecord.flag_nrt && (
            <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              ⚡ {t.nrtBadge}
            </span>
          )}
        </div>

      </div>

      {/* Expandable Analyst Details */}
      {stats && (
        <div className="mt-3 pt-3 border-t border-slate-200/60">
          <button
            type="button"
            onClick={() => setShowAnalystDetails(!showAnalystDetails)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <BarChart2 size={13} className="text-slate-500" />
            <span>{t.analystBreakdown} ({monthNameShort} 2003–2025 Multi-Year Distribution)</span>
            {showAnalystDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAnalystDetails && (
            <div className="mt-2.5 p-3 rounded-lg bg-white border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700 shadow-2xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-medium uppercase">{t.p25Label}</span>
                <span className="font-bold text-slate-800">{stats.p25} {unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium uppercase">{t.p75Label}</span>
                <span className="font-bold text-slate-800">{stats.p75} {unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium uppercase text-red-600">{t.p90Label}</span>
                <span className="font-bold text-red-700">{stats.p90} {unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium uppercase">{t.baselineRange}</span>
                <span className="font-bold text-slate-800">{stats.min} – {stats.max} {unit}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer Strip */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500">
        <span>⚠️ <strong>{t.disclaimerText}</strong></span>
        <span className="font-mono text-slate-400 shrink-0">{t.lastUpdatedText}</span>
      </div>

    </div>
  );
}
