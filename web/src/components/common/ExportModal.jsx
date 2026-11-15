import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Check } from 'lucide-react';

// Helper: RFC 4180 compliant CSV sanitizer with formula injection neutralization (CWE-1236)
function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '""';
  if (typeof val === 'boolean') return val ? 'true' : 'false';

  let str = String(val);
  // Neutralize spreadsheet formula execution triggers (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // RFC 4180 double-quote escaping
  return `"${str.replace(/"/g, '""')}"`;
}

export function ExportModal({ 
  isOpen, 
  onClose, 
  timeseries, 
  selectedWilaya, 
  regions, 
  t 
}) {
  const [scope, setScope] = useState('current'); // 'current' or 'all'
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear] = useState(2026);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const currentWilayaName = regions.find(r => r.id === selectedWilaya)?.name || selectedWilaya;

  const handleDownload = () => {
    // Filter records
    const filtered = timeseries.filter(r => {
      const matchWilaya = scope === 'all' || r.region_id === selectedWilaya;
      const matchYear = r.year >= startYear && r.year <= endYear;
      return matchWilaya && matchYear;
    });

    // Generate CSV
    const headers = [
      "region_id",
      "region_name",
      "year",
      "month",
      "series_used",
      "count_viirs_eq",
      "frp_viirs_eq_mw",
      "anomaly_status",
      "historical_percentile",
      "is_nrt",
      "is_complete"
    ];

    const rows = filtered.map(r => [
      sanitizeCsvCell(r.region_id),
      sanitizeCsvCell(r.region_name),
      sanitizeCsvCell(r.year),
      sanitizeCsvCell(r.month),
      sanitizeCsvCell(r.series_used),
      sanitizeCsvCell(r.count),
      sanitizeCsvCell(r.frp),
      sanitizeCsvCell(r.count_status),
      sanitizeCsvCell(r.count_pct),
      sanitizeCsvCell(r.flag_nrt),
      sanitizeCsvCell(r.complete)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    const filename = scope === 'all' 
      ? `FIRMSync_Algeria_7Wilayas_${startYear}_${endYear}.csv`
      : `FIRMSync_${selectedWilaya}_${startYear}_${endYear}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t.exportTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t.exportSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Scope Selection */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              {t.exportScope}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('current')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                  scope === 'current'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500/30'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="block font-bold">📍 {currentWilayaName}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{t.exportCurrentOnly}</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                  scope === 'all'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500/30'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="block font-bold">🇩🇿 7 Wilayas</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{t.exportAllWilayas}</span>
              </button>
            </div>
          </div>

          {/* Time Horizon Slider / Inputs */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              {t.exportRange}: <span className="font-mono text-amber-700">{startYear} – {endYear}</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2000"
                max="2026"
                value={startYear}
                onChange={(e) => setStartYear(Math.min(Number(e.target.value), endYear))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <input
                type="range"
                min="2000"
                max="2026"
                value={endYear}
                onChange={(e) => setEndYear(Math.max(Number(e.target.value), startYear))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Info note */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            ✓ Formatted with standard UTF-8 BOM encoding for instant compatibility with Microsoft Excel, Python Pandas, and QGIS.
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-600 hover:bg-slate-200/60"
          >
            {t.closeModal}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
          >
            {downloaded ? <Check size={14} className="text-emerald-400" /> : <Download size={14} />}
            <span>{downloaded ? "Downloaded!" : t.downloadBtn}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
