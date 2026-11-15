import React, { useState, useMemo } from 'react';
import { getInfernoColor, getContrastTextColor, INFERNO_LEGEND_STOPS } from '../../../utils/inferno';
import { Calendar, Filter, Sparkles, Layers, Info } from 'lucide-react';

export function CalendarHeatmap({ 
  timeseries, 
  selectedWilaya, 
  activeYear, 
  activeMonth, 
  onSelectMonthYear, 
  metric, 
  t 
}) {
  const [yearFilter, setYearFilter] = useState('all');
  const [hoveredCell, setHoveredCell] = useState(null);

  const isCount = metric === 'count';
  const unit = isCount ? 'hotspots' : 'MW';

  // Filter records for active wilaya
  const wilayaRecords = useMemo(() => {
    return timeseries.filter(r => r.region_id === selectedWilaya);
  }, [timeseries, selectedWilaya]);

  // Determine global max for scaling in active wilaya
  const maxValue = useMemo(() => {
    let max = 0;
    wilayaRecords.forEach(r => {
      const v = isCount ? r.count : r.frp;
      if (v > max) max = v;
    });
    return Math.max(max, 10);
  }, [wilayaRecords, isCount]);

  // Year range calculation
  const years = useMemo(() => {
    const allYears = Array.from({ length: 27 }, (_, i) => 2000 + i); // 2000 to 2026
    if (yearFilter === 'viirs') {
      return allYears.filter(y => y >= 2012);
    }
    if (yearFilter === 'recent') {
      return allYears.filter(y => y >= 2020);
    }
    return allYears;
  }, [yearFilter]);

  // Lookup record by (year, month)
  const recordMap = useMemo(() => {
    const map = {};
    wilayaRecords.forEach(r => {
      map[`${r.year}-${r.month}`] = r;
    });
    return map;
  }, [wilayaRecords]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-4 sm:p-5">
      
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {t.calendarTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.calendarSubtitle}
          </p>
        </div>

        {/* Year Filter Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1">
            <Filter size={11} />
            {t.filterYears}:
          </span>
          {[
            { id: 'all', label: t.allYears },
            { id: 'viirs', label: t.viirsEra },
            { id: 'recent', label: t.recent5 }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setYearFilter(f.id)}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                yearFilter === f.id
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Container */}
      <div className="pt-4 overflow-x-auto">
        <div className="min-w-[620px]">
          
          {/* Months Header */}
          <div className="grid grid-cols-[70px_repeat(12,1fr)] gap-1 mb-1 text-center text-xs font-semibold text-slate-600">
            <div className="text-left pl-1 font-mono text-[11px] text-slate-400">Year</div>
            {t.monthsShort.map((m, idx) => (
              <div key={idx} className="py-1">
                {m}
              </div>
            ))}
          </div>

          {/* Year Rows */}
          <div className="space-y-1">
            {years.map(year => {
              // Sensor era badge for row
              const eraColor = year < 2012 
                ? 'border-l-4 border-l-blue-400' 
                : year < 2026 
                  ? 'border-l-4 border-l-emerald-500' 
                  : 'border-l-4 border-l-purple-500';

              return (
                <div 
                  key={year} 
                  className={`grid grid-cols-[70px_repeat(12,1fr)] gap-1 items-center rounded-sm transition-colors ${eraColor}`}
                >
                  {/* Year Label */}
                  <div className="text-xs font-mono font-semibold text-slate-700 pl-2">
                    {year}
                  </div>

                  {/* 12 Months */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    const rec = recordMap[`${year}-${month}`];
                    const isSelected = activeYear === year && activeMonth === month;
                    const val = rec ? (isCount ? rec.count : rec.frp) : null;
                    const hasData = val !== null;
                    const bg = getInfernoColor(val, maxValue);
                    const textColor = getContrastTextColor(val, maxValue);
                    const isPartial = rec && !rec.complete;

                    return (
                      <div
                        key={month}
                        onClick={() => rec && onSelectMonthYear(year, month)}
                        onMouseEnter={() => rec && setHoveredCell({ year, month, rec, val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-7 rounded-sm flex items-center justify-center text-[10px] font-mono font-medium transition-transform cursor-pointer relative ${
                          isSelected ? 'ring-2 ring-slate-900 ring-offset-1 z-10 scale-105' : 'hover:scale-105 hover:z-10'
                        } ${isPartial ? 'border-dashed border-amber-500' : ''}`}
                        style={{
                          backgroundColor: bg,
                          color: textColor,
                          boxShadow: hasData && val > 0 ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'inset 0 0 0 1px #e2e8f0'
                        }}
                        title={rec ? `${t.months[month - 1]} ${year}: ${Math.round(val).toLocaleString()} ${unit}${isPartial ? ' (Partial)' : ''}` : 'No data'}
                      >
                        {hasData && val > 0 ? (
                          <span className="truncate px-0.5">
                            {val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
                          </span>
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                        {isPartial && (
                          <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Hover Information Pill */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-amber-500" />
          {hoveredCell ? (
            <span className="font-medium text-slate-800 flex items-center gap-2 flex-wrap">
              <span>
                <strong>{t.months[hoveredCell.month - 1]} {hoveredCell.year}</strong>: {Math.round(hoveredCell.val).toLocaleString()} {unit}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 capitalize">
                Series: {hoveredCell.rec.series_used === 'modis' ? 'MODIS C6.1' : hoveredCell.rec.series_used === 'viirs_snpp' ? 'VIIRS S-NPP' : 'VIIRS NOAA-20'}
              </span>
              {hoveredCell.rec.series_used === 'modis' && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-mono">
                    Raw MODIS: {hoveredCell.rec.count_raw} × {hoveredCell.rec.ratio_count} ratio
                  </span>
                </>
              )}
              <span className="text-slate-400">·</span>
              <span className="font-semibold text-amber-700">
                Percentile: {hoveredCell.rec.count_pct}%
              </span>
              {!hoveredCell.rec.complete && (
                <span className="text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded text-[10px]">
                  PARTIAL MONTH
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-500 italic">
              {t.clickCellHint}
            </span>
          )}
        </div>

        {/* Sensor Era Legend Tags */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-400 inline-block"></span>
            MODIS (2000–2011)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
            VIIRS S-NPP (2012–2026)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 inline-block"></span>
            NOAA-20 (Post-SNPP Nov 2026+)
          </span>
        </div>
      </div>

      {/* Accessible Inferno Colormap Legend */}
      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
          <span>{t.legendTitle}</span>
          <span className="text-slate-500 font-mono text-[10px]">Power-Scaled (v^0.55) for Dynamic Range</span>
        </div>

        {/* Color Gradient Strip */}
        <div className="h-3 w-full rounded-full border border-slate-300 shadow-inner flex overflow-hidden">
          <div className="flex-1 bg-white" title="0" />
          <div className="flex-1" style={{ backgroundColor: '#2d174d' }} />
          <div className="flex-1" style={{ backgroundColor: '#420a68' }} />
          <div className="flex-1" style={{ backgroundColor: '#6a176e' }} />
          <div className="flex-1" style={{ backgroundColor: '#932667' }} />
          <div className="flex-1" style={{ backgroundColor: '#bc3754' }} />
          <div className="flex-1" style={{ backgroundColor: '#dd513a' }} />
          <div className="flex-1" style={{ backgroundColor: '#f37819' }} />
          <div className="flex-1" style={{ backgroundColor: '#fca50a' }} />
          <div className="flex-1" style={{ backgroundColor: '#f6d746' }} />
          <div className="flex-1" style={{ backgroundColor: '#fcffa4' }} />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 font-medium mt-1">
          <span>0 {unit}</span>
          <span>Moderate Seasonal</span>
          <span>Peak Catastrophic ({Math.round(maxValue).toLocaleString()} {unit})</span>
        </div>
      </div>

    </div>
  );
}
