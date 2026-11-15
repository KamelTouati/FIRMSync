import React from 'react';
import { Database, Download, BookOpen, Globe2, Activity } from 'lucide-react';
import { LogoMark } from './Logo';

export function Header({ 
  regions, 
  selectedWilaya, 
  onSelectWilaya, 
  metric, 
  onToggleMetric, 
  lang, 
  onToggleLang, 
  t, 
  onOpenMethodology, 
  onOpenExport 
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3">
            <LogoMark className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                  {t.appTitle}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <Activity size={11} />
                  {t.challengeTag}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Action Bar & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Wilaya Picker */}
            <div className="relative">
              <label htmlFor="wilaya-select" className="sr-only">{t.selectWilaya}</label>
              <select
                id="wilaya-select"
                value={selectedWilaya}
                onChange={(e) => onSelectWilaya(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    📍 {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Toggle */}
            <div className="inline-flex p-0.5 bg-slate-100 border border-slate-300 rounded-md shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleMetric('count')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                  metric === 'count'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.metricCount}
              </button>
              <button
                type="button"
                onClick={() => onToggleMetric('frp')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                  metric === 'frp'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.metricFRP}
              </button>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
              title="Change Language"
            >
              <Globe2 size={13} className="text-slate-500" />
              {t.langToggle}
            </button>

            {/* Science / LOOCV Modal Button */}
            <button
              type="button"
              onClick={onOpenMethodology}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
            >
              <BookOpen size={13} className="text-amber-600" />
              <span className="hidden sm:inline">{t.openMethodology}</span>
              <span className="sm:hidden">LOOCV</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>{t.openExport}</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
