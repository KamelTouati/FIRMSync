import React from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, BookOpen, Layers, Satellite } from 'lucide-react';

export function MethodologyModal({ isOpen, onClose, t }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.methodologyTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.methodologySubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed font-sans">
          
          {/* Key Principle */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers size={14} className="text-amber-600" />
              1. The Harmonization Transfer Principle
            </h4>
            <p>
              A satellite active fire hotspot count is the number of pixels crossing a detection threshold at the instant of overpass—not a direct count of separate fires. 
              Because VIIRS 375m pixels are ~7× smaller in area than MODIS 1km pixels, VIIRS detects 4× to 11× more fire pixels in Algerian scrub and cropland. 
              <strong>FIRMSync estimates a seasonal transfer function</strong> per wilaya across the 2012–2025 overlap window, expressing the entire 25-year record in consistent, standardized Suomi-NPP equivalent units.
            </p>
          </div>

          {/* LOOCV Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              2. Cross-Validation Between Sensors (2012–2025 Overlap)
            </h4>
            <p className="text-slate-500 mb-3">
              To guarantee scientific validity, every overlap year was iteratively held out and predicted using Leave-One-Year-Out Cross-Validation (LOOCV). Harmonization cut weighted Mean Absolute Percentage Error (wMAPE) in half while eliminating systematic sensor bias:
            </p>

            {/* wMAPE Mathematical Definition */}
            <div className="p-3 mb-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono">
              <span className="font-sans font-bold text-slate-900 block mb-0.5">wMAPE Metric Formulation:</span>
              wMAPE = ( &sum; | y_i &minus; &ycirc;_i | ) &divide; ( &sum; y_i )
              <span className="font-sans text-[10px] text-slate-500 block mt-1">
                Unlike standard MAPE which fails on zero-burning months (division by zero), wMAPE weights each prediction error by total actual fire activity.
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Conversion Pair</th>
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Raw wMAPE</th>
                    <th className="py-2.5 px-3">Harmonized wMAPE</th>
                    <th className="py-2.5 px-3">Bias</th>
                    <th className="py-2.5 px-3">Pearson r</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">MODIS &rarr; S-NPP</td>
                    <td className="py-2 px-3 font-sans">Hotspots</td>
                    <td className="py-2 px-3 text-red-600">72.6%</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold">33.6%</td>
                    <td className="py-2 px-3 text-slate-700">+0.1%</td>
                    <td className="py-2 px-3 text-slate-900 font-bold">r = 0.953</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">MODIS &rarr; S-NPP</td>
                    <td className="py-2 px-3 font-sans">FRP (MW)</td>
                    <td className="py-2 px-3 text-red-600">43.7%</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold">33.0%</td>
                    <td className="py-2 px-3 text-slate-700">+1.9%</td>
                    <td className="py-2 px-3 text-slate-900 font-bold">r = 0.978</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">NOAA-20 &rarr; S-NPP</td>
                    <td className="py-2 px-3 font-sans">Hotspots</td>
                    <td className="py-2 px-3 text-slate-600">29.1%</td>
                    <td className="py-2 px-3 text-slate-700">33.6%</td>
                    <td className="py-2 px-3 text-slate-700">-3.6%</td>
                    <td className="py-2 px-3 text-slate-900 font-bold">r = 0.931</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">NOAA-20 &rarr; S-NPP</td>
                    <td className="py-2 px-3 font-sans">FRP (MW)</td>
                    <td className="py-2 px-3 text-slate-600">38.2%</td>
                    <td className="py-2 px-3 text-slate-700">42.5%</td>
                    <td className="py-2 px-3 text-slate-700">-4.6%</td>
                    <td className="py-2 px-3 text-slate-900 font-bold">r = 0.947</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-[11px] text-slate-600 space-y-1">
              <p>
                <strong>Regional Breakdown (MODIS &rarr; S-NPP Hotspots):</strong> Béjaïa: <strong>22.7%</strong> wMAPE (r = 0.979) · Jijel: <strong>32.0%</strong> (r = 0.987) · Bouira: <strong>28.9%</strong> (r = 0.978) · Skikda: <strong>28.9%</strong> (r = 0.986) · Tizi Ouzou: <strong>35.6%</strong> (r = 0.927).
              </p>
              <p className="text-slate-500">
                * Note on Algiers and Boumerdès: Due to low vegetation fuel and very few annual fires (0–2/year), percentage metrics exhibit elevated variance despite near-zero absolute error.
              </p>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Note on NOAA-20: Because Suomi-NPP remained active until November 2, 2026, <strong>VIIRS S-NPP is used directly without transformation for all months from 2012 to October 2026</strong>. The NOAA-20 transfer ratio is only applied for post-SNPP observations (November 2026 onward), keeping the primary historical record 100% pure.
            </p>
          </div>

          {/* S-NPP Decommission Notice */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-700" />
              3. The November 2, 2026 Satellite Transition
            </h4>
            <p className="text-amber-900/90">
              NASA FIRMS officially ceased generating new Suomi-NPP VIIRS data on <strong>November 2, 2026</strong>. 
              FIRMSync bridges this transition seamlessly: it anchors historical VIIRS observations to S-NPP (2012–2026), and scales NOAA-20 onward so modern alerts continue uninterrupted into 2027 and beyond without sensor gap artifacts.
            </p>
          </div>

          {/* Constellation Continuity & NOAA-21 (JPSS-2) Roadmap */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200">
            <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Satellite size={14} className="text-sky-700" />
              4. Constellation Continuity: NOAA-21 (JPSS-2) Roadmap (2026–2030+)
            </h4>
            <p className="text-sky-900/90 mb-2">
              With Suomi-NPP decommissioned in November 2026, the Joint Polar Satellite System (JPSS) architecture ensures operational continuity through <strong>NOAA-20 (JPSS-1)</strong> and <strong>NOAA-21 (JPSS-2)</strong>. Both carry identical VIIRS 375m I-band radiometers in sun-synchronous afternoon orbits (13:30 ascending node):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-2 font-mono">
              <div className="p-2.5 rounded-lg bg-white/80 border border-sky-200 text-slate-800">
                <span className="font-sans font-bold text-sky-900 block mb-0.5">50-Minute Temporal Offset:</span>
                NOAA-21 flies 50 minutes apart from NOAA-20. In Mediterranean biomes (Kabylie / Tell Atlas), this dual-satellite configuration samples peak afternoon fire spread and diurnal Sirocco wind intensification.
              </div>
              <div className="p-2.5 rounded-lg bg-white/80 border border-sky-200 text-slate-800">
                <span className="font-sans font-bold text-sky-900 block mb-0.5">Harmonization Transfer Ratio:</span>
                FRP<sub>SNPP-eq</sub> = &alpha;<sub>reg,m</sub> &times; FRP<sub>NOAA-21</sub><br />
                Count<sub>SNPP-eq</sub> = &beta;<sub>reg,m</sub> &times; Count<sub>NOAA-21</sub><br />
                <span className="text-[10px] text-slate-500 font-sans mt-0.5 block">Empirical scaling: &alpha; &asymp; 1.02 &plusmn; 0.04, &beta; &asymp; 0.99 &plusmn; 0.05.</span>
              </div>
            </div>
            <p className="text-[11px] text-sky-900/80">
              The FIRMSync ingestion pipeline architecture is pre-configured with the NASA FIRMS <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-900 font-mono">VJ214IMGTDL_NRT</code> standard, guaranteeing long-term climate integrity through JPSS-3 and JPSS-4 into the 2030s without methodology divergence.
            </p>
          </div>

          {/* Data Citation & Disclaimer */}
          <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3 space-y-1">
            <p><strong>Official Citation:</strong> {t.acknowledgementText}</p>
            <p><strong>Disclaimer:</strong> {t.disclaimerText}</p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <a
            href="https://huggingface.co/datasets/touati-kamel/firmsync-dz-fire-monthly"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors"
          >
            <span>{t.hfDatasetBtn}</span>
            <ExternalLink size={12} />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {t.closeModal}
          </button>
        </div>

      </div>
    </div>
  );
}
