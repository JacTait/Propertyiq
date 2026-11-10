"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

interface TargetSliderProps {
  label: string;
  value: number;
  options: readonly number[];
  onChange: (value: number) => void;
  format: (value: number) => string;
}

export function TargetSlider({ label, value, options, onChange, format }: TargetSliderProps) {
  const nearestIndex = options.reduce((best, option, index) => {
    return Math.abs(option - value) < Math.abs(options[best] - value) ? index : best;
  }, 0);
  const max = options.length - 1;
  const fill = max === 0 ? 100 : (nearestIndex / max) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-bold tabular text-primary">{format(value)}</p>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={nearestIndex}
        aria-label={label}
        onChange={(e) => onChange(options[Number(e.target.value)] ?? options[0])}
        className="max-offer-slider w-full"
        style={{ "--slider-fill": `${fill}%` } as CSSProperties}
      />
      <div className="flex justify-between gap-1">
        {options.map((option) => {
          const active = option === options[nearestIndex];
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-full px-1 py-0.5 text-[10px] font-semibold tabular transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
