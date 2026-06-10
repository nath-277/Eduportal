'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  className?: string;
  unit?: string;
}

export function BarChart({ data, height = 160, className, unit = '' }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {d.value}
                {unit}
              </span>
              <div className="group relative w-full flex-1 rounded-md bg-muted/60">
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-200 group-hover:brightness-95"
                  style={{ backgroundColor: d.color ?? 'hsl(var(--primary))' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  whileHover={{ scaleX: 1.05 }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                />
                {/* Visual Tooltip Overlay */}
                <div className="absolute left-1/2 bottom-full mb-1.5 z-30 hidden group-hover:flex -translate-x-1/2 flex-col items-center">
                  <div className="bg-popover text-popover-foreground border border-border text-[10px] px-2 py-0.5 rounded-md shadow-md whitespace-nowrap font-medium">
                    {d.label}: {d.value}{unit}
                  </div>
                  <div className="w-1.5 h-1.5 bg-popover border-b border-r border-border rotate-45 -mt-1" />
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
}

export function LineChart({ data, height = 200, className }: LineChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(5, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;
  const width = 100;
  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = 100 - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * innerW;
    const y = padding + (1 - (d.value - min) / range) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1]?.x.toFixed(2) ?? 0} 100 L ${points[0]?.x.toFixed(2) ?? 0} 100 Z`;

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-label="CGPA trend"
      >
        <defs>
          <linearGradient id="line-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaD}
          fill="url(#line-area)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={`${p.label}-${i}`}
            cx={p.x}
            cy={p.y}
            r="0.8"
            fill="hsl(var(--primary))"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ r: 1.8, fill: 'oklch(0.65 0.16 245)' }}
            transition={{ delay: 0.6 + i * 0.05, duration: 0.2 }}
            className="cursor-pointer transition-colors duration-150"
          >
            <title>{p.label}: {p.value}</title>
          </motion.circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  className?: string;
  unit?: string;
  centerLabel?: string;
  centerValue?: string | number;
}

export function PieChart({
  data,
  size = 180,
  thickness = 28,
  className,
  unit = '',
  centerLabel,
  centerValue,
}: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-xs text-muted-foreground', className)}
        style={{ height: size }}
      >
        No data
      </div>
    );
  }

  const cx = 50;
  const cy = 50;
  const r = 45;
  const circumference = 2 * Math.PI * r;

  const slices = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0;
    const length = pct * circumference;
    const offset = data.slice(0, i).reduce((sum, prev) => sum + (prev.value / total) * circumference, 0);
    return { d, length, offset, i };
  });

  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
          aria-label={centerLabel ?? 'Distribution'}
        >
          {slices.map(({ d, length, offset, i }) => (
            <motion.circle
              key={`${d.label}-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness / 2.4}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ strokeWidth: thickness / 1.9 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="cursor-pointer transition-all duration-200"
            >
              <title>{d.label}: {d.value}{unit} ({Math.round((d.value / total) * 100)}%)</title>
            </motion.circle>
          ))}
        </svg>
        {centerLabel ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums">
              {centerValue ?? total}
              {unit}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {centerLabel}
            </span>
          </div>
        ) : null}
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: d.color }}
              aria-hidden
            />
            <span className="text-foreground/80">{d.label}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {d.value}
              {unit} · {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  height?: number;
  className?: string;
  color?: string;
}

export function Sparkline({ data, height = 36, className, color }: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center text-xs text-muted-foreground', className)}
        style={{ height }}
      >
        No data yet
      </div>
    );
  }
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = `M ${points.join(' L ')}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn('h-full w-full', className)}
      style={{ height }}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={color ?? 'hsl(var(--primary))'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
