"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { DealGrade } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const GRADE_COLORS: Record<DealGrade, string> = {
  elite: "#22c55e",
  excellent: "#4ade80",
  good: "#6366f1",
  average: "#f59e0b",
  avoid: "#ef4444",
};

interface DealScoreGaugeProps {
  score: number;
  grade: DealGrade;
  size?: number;
  className?: string;
  animated?: boolean;
  label?: string;
  idPrefix?: string;
}

export function DealScoreGauge({
  score,
  grade,
  size = 200,
  className,
  animated = true,
  label = "Deal Score",
  idPrefix = "gauge",
}: DealScoreGaugeProps) {
  const stroke = Math.max(10, size * 0.07);
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius; // half circle
  const progress = useMotionValue(animated ? 0 : score);
  const dash = useTransform(progress, (v) => circumference * (1 - v / 100));
  const [animatedDisplay, setAnimatedDisplay] = useState(0);
  const display = animated ? animatedDisplay : score;

  useEffect(() => {
    if (!animated) {
      progress.set(score);
      return;
    }
    const controls = animate(progress, score, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setAnimatedDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, progress, animated]);

  const color = GRADE_COLORS[grade];
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size / 2 + stroke }}>
      <svg width={size} height={size / 2 + stroke} viewBox={`0 0 ${size} ${size / 2 + stroke}`}>
        <defs>
          <linearGradient id={`${idPrefix}-track`} x1="0" x2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.25} />
          </linearGradient>
          <filter id={`${idPrefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke={`url(#${idPrefix}-track)`}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dash }}
          filter={`url(#${idPrefix}-glow)`}
        />
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = Math.PI - (tick / 100) * Math.PI;
          const inner = radius - stroke / 2 - 4;
          const outer = radius - stroke / 2 - 10;
          const x1 = cx + inner * Math.cos(angle);
          const y1 = cy - inner * Math.sin(angle);
          const x2 = cx + outer * Math.cos(angle);
          const y2 = cy - outer * Math.sin(angle);
          return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--chart-text)" strokeWidth={1.5} strokeOpacity={0.6} />;
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-4xl font-black tracking-tight tabular sm:text-5xl" style={{ color }}>
          {display}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
