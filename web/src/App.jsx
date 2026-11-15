import React, { useState, useMemo } from 'react';
import firmsyncData from './data/firmsync_data.json';
import { TRANSLATIONS } from './utils/i18n';
import { Header, MethodologyModal, ExportModal, LogoMark } from './components/common';
import { StatusIndicator } from './features/status';
import { ForecastCard, IncidentDrilldown } from './features/forecast';
import { WilayaMap } from './features/map';
import { CalendarHeatmap } from './features/calendar';
import { ShieldAlert, ExternalLink, Satellite } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('en');
  const [selectedWilaya, setSelectedWilaya] = useState('bejaia');
  const [metric, setMetric] = useState('count'); // 'count' | 'frp'
  
  // Default to August 2026 (the peak firestorm month) or latest complete month
  const [activeYear, setActiveYear] = useState(2026);
  const [activeMonth, setActiveMonth] = useState(8);

  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const t = TRANSLATIONS[lang];

  // Active record lookup
  const currentRecord = useMemo(() => {
    const rec = firmsyncData.timeseries.find(
      r => r.region_id === selectedWilaya && r.year === activeYear && r.month === activeMonth
    );
    if (rec) return rec;
    // Fallback to latest available for region
    const wilayaRows = firmsyncData.timeseries.filter(r => r.region_id === selectedWilaya);
    return wilayaRows[wilayaRows.length - 1];
  }, [selectedWilaya, activeYear, activeMonth]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Top Header */}
      <Header
        regions={firmsyncData.regions}
        selectedWilaya={selectedWilaya}
        onSelectWilaya={setSelectedWilaya}
        metric={metric}
        onToggleMetric={setMetric}
        lang={lang}
        onToggleLang={() => setLang(lang === 'en' ? 'fr' : 'en')}
        t={t}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {/* Status Indicator Card (Is this month unusual?) */}
        <StatusIndicator
          currentRecord={currentRecord}
          metric={metric}
          t={t}
          baselines={firmsyncData.baselines}
        />

        {/* Forward-Looking Operational Hazard Outlook (ML Forecaster) */}
        <ForecastCard
          selectedWilaya={selectedWilaya}
          forecasts={firmsyncData.forecasts}
          forecastMetrics={firmsyncData.forecast_metrics}
          t={t}
        />

        {/* Two-Column Middle Section: Map + Quick Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Interactive Map */}
          <div className="lg:col-span-7 h-[360px] sm:h-[400px]">
            <WilayaMap
              geojson={firmsyncData.geojson}
              regions={firmsyncData.regions}
              selectedWilaya={selectedWilaya}
              onSelectWilaya={setSelectedWilaya}
              timeseries={firmsyncData.timeseries}
              activeYear={activeYear}
              activeMonth={activeMonth}
              metric={metric}
              t={t}
            />
          </div>

          {/* Right Column: Historical Context & Regional Quick Glance */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Satellite size={14} className="text-amber-600" />
                  Regional Comparison ({t.monthsShort[activeMonth - 1]} {activeYear})
                </span>
                <span className="text-[11px] font-mono font-medium text-slate-500">
                  {metric === 'count' ? 'Hotspots' : 'FRP MW'}
                </span>
              </div>

              {/* Wilaya Rank Table */}
              <div className="mt-3 space-y-1.5">
                {firmsyncData.regions.map(r => {
                  const rec = firmsyncData.timeseries.find(
                    row => row.region_id === r.id && row.year === activeYear && row.month === activeMonth
                  );
                  const val = rec ? (metric === 'count' ? rec.count : rec.frp) : 0;
                  const isSelected = r.id === selectedWilaya;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedWilaya(r.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                        isSelected 
                          ? 'bg-amber-50 text-amber-950 font-bold border border-amber-300 shadow-2xs' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-[10px]">
                          {isSelected ? '▶' : '·'}
                        </span>
                        {r.name}
                        {(r.id === 'algiers' || r.id === 'boumerdes') && (
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 rounded" title={t.lowConfidenceNotice}>
                            *
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 font-bold">
                          {val.toLocaleString()}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          rec?.count_status === 'extreme' 
                            ? 'bg-red-100 text-red-800' 
                            : rec?.count_status === 'high' 
                              ? 'bg-amber-100 text-amber-800' 
                              : rec?.count_status === 'low'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rec?.count_status === 'extreme' ? t.statusExtreme :
                           rec?.count_status === 'high' ? t.statusHigh :
                           rec?.count_status === 'low' ? t.statusLow : t.statusNormal}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Callout */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-slate-800 font-semibold">
                  Multi-Sensor Harmonization
                </strong>
                <span className="text-[10px] text-slate-400 font-mono">r = 0.953</span>
              </div>
              <p>
                Calibrated on 2012–2025 overlap. LOOCV correlation r = 0.953. Cross-validated between MODIS and VIIRS sensors.
              </p>
              <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200">
                {t.lastUpdatedText}
              </div>
            </div>

          </div>
        </div>

        {/* Tactical Wildfire Incident Drilldown (Daily Cumulative FRE) */}
        <IncidentDrilldown t={t} />

        {/* 25-Year Calendar Heatmap Section */}
        <CalendarHeatmap
          timeseries={firmsyncData.timeseries}
          selectedWilaya={selectedWilaya}
          activeYear={activeYear}
          activeMonth={activeMonth}
          onSelectMonthYear={(y, m) => {
            setActiveYear(y);
            setActiveMonth(m);
          }}
          metric={metric}
          t={t}
        />

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-10 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LogoMark className="w-8 h-8 rounded-lg" />
              <div>
                <p className="font-semibold text-slate-800">
                  FIRMSync — NASA Space Apps Challenge 2026
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t.acknowledgementText}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://huggingface.co/datasets/touati-kamel/firmsync-dz-fire-monthly"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700"
              >
                <span>Hugging Face Dataset</span>
                <ExternalLink size={12} />
              </a>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setIsMethodologyOpen(true)}
                className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                LOOCV Science
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <p>
              <strong className="text-slate-600 font-medium">Disclaimer:</strong> {t.disclaimerText}
            </p>
            <span className="font-mono text-slate-500 shrink-0">
              {t.lastUpdatedText}
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        t={t}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        timeseries={firmsyncData.timeseries}
        selectedWilaya={selectedWilaya}
        regions={firmsyncData.regions}
        geojson={firmsyncData.geojson}
        t={t}
      />

    </div>
  );
}
