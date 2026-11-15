// Inferno Colormap interpolator with square-root luminance scaling

const INFERNO_STOPS = [
  { t: 0.0, r: 45,  g: 23,  b: 77 },   // soft deep purple (avoids jet-black ink-blot on 1 fire)
  { t: 0.2, r: 66,  g: 10,  b: 104 },  // #420a68 - purple
  { t: 0.4, r: 147, g: 38,  b: 103 },  // #932667 - magenta/crimson
  { t: 0.6, r: 221, g: 81,  b: 58 },   // #dd513a - fiery red
  { t: 0.8, r: 252, g: 165, b: 10 },   // #fca50a - intense orange
  { t: 1.0, r: 252, g: 255, b: 164 }   // #fcffa4 - bright light yellow
];

function interpolateColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < INFERNO_STOPS.length - 1; i++) {
    const s1 = INFERNO_STOPS[i];
    const s2 = INFERNO_STOPS[i + 1];
    if (clamped >= s1.t && clamped <= s2.t) {
      const localT = (clamped - s1.t) / (s2.t - s1.t);
      const r = Math.round(s1.r + localT * (s2.r - s1.r));
      const g = Math.round(s1.g + localT * (s2.g - s1.g));
      const b = Math.round(s1.b + localT * (s2.b - s1.b));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = INFERNO_STOPS[INFERNO_STOPS.length - 1];
  return `rgb(${last.r}, ${last.g}, ${last.b})`;
}

/**
 * Returns a color for a fire metric value.
 * Uses square-root power scaling so both regular annual fires and extreme spikes have contrast.
 */
export function getInfernoColor(value, maxVal) {
  if (value === null || value === undefined || isNaN(value)) {
    return '#f1f5f9'; // muted slate for no data
  }
  if (value <= 0) {
    return '#ffffff'; // clean white for zero burning
  }

  const effectiveMax = Math.max(maxVal || 100, 10);
  const normalized = Math.min(value / effectiveMax, 1.0);
  // Square-root transform expands contrast in low-to-mid range
  const scaledT = Math.pow(normalized, 0.55);

  return interpolateColor(scaledT);
}

/**
 * Returns text contrast color (dark slate vs white) based on luminance
 */
export function getContrastTextColor(value, maxVal) {
  if (!value || value <= 0) return '#64748b';
  const normalized = Math.min(value / (maxVal || 100), 1.0);
  const scaledT = Math.pow(normalized, 0.55);
  return scaledT > 0.65 ? '#0f172a' : '#ffffff';
}

export const INFERNO_LEGEND_STOPS = [
  { pct: '0%', color: '#ffffff', label: '0' },
  { pct: '20%', color: '#420a68', label: 'Low' },
  { pct: '45%', color: '#932667', label: 'Moderate' },
  { pct: '70%', color: '#dd513a', label: 'High' },
  { pct: '100%', color: '#fcffa4', label: 'Peak Extreme' }
];
