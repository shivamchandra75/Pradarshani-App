import React from 'react';

export interface PieSlice {
  label: string;
  value: number;
}

const COLORS = ['#2563EB', '#16A34A', '#F97316', '#DB2777', '#7C3AED'];
const OTHERS_COLOR = '#9CA3AF';
const MAX_SLICES = COLORS.length;

const RADIUS = 50;

const point = (angle: number) => `${RADIUS + RADIUS * Math.cos(angle)} ${RADIUS + RADIUS * Math.sin(angle)}`;

/** Small dependency-free SVG pie: the top 5 slices plus an "Others" slice, with a legend. */
export const PieChart: React.FC<{ data: PieSlice[] }> = ({ data }) => {
  const sorted = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const othersValue = sorted.slice(MAX_SLICES).reduce((sum, d) => sum + d.value, 0);
  const slices = othersValue > 0
    ? [...sorted.slice(0, MAX_SLICES), { label: 'Others', value: othersValue }]
    : sorted;
  const total = slices.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">No uploads in this range.</div>;
  }

  const colorOf = (i: number) => (slices[i].label === 'Others' && i === MAX_SLICES ? OTHERS_COLOR : COLORS[i]);

  let start = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const sweep = (s.value / total) * 2 * Math.PI;
    const end = start + sweep;
    // A single 100% slice has identical start/end points, which an arc can't draw; use a circle.
    const shape = slices.length === 1
      ? <circle cx={RADIUS} cy={RADIUS} r={RADIUS} fill={colorOf(i)} />
      : <path d={`M ${RADIUS} ${RADIUS} L ${point(start)} A ${RADIUS} ${RADIUS} 0 ${sweep > Math.PI ? 1 : 0} 1 ${point(end)} Z`} fill={colorOf(i)} stroke="#fff" strokeWidth={0.8} />;
    start = end;
    return <React.Fragment key={s.label + i}>{shape}</React.Fragment>;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-44 h-44 shrink-0" role="img" aria-label="Uploads by user">
        {paths}
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((s, i) => (
          <li key={s.label + i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorOf(i) }} />
            <span className="flex-1 truncate text-gray-700 font-medium">{s.label}</span>
            <span className="text-gray-500 tabular-nums">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
