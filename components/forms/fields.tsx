"use client";

import * as React from "react";
import { Controller, useFormContext, type FieldPath } from "react-hook-form";
import { Info } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Name = FieldPath<AnalysisFormValues>;

interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}

export function FieldWrapper({ label, htmlFor, hint, error, className, children, trailing }: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
          {label}
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/70 hover:text-foreground" aria-label={`About ${label}`}>
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          )}
        </Label>
        {trailing}
      </div>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface NumberFieldProps {
  name: Name;
  label: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
  /** Optional side-effect after the value changes (e.g. sync deposit amount). */
  onValueChange?: (value: number) => void;
  emptyAsZero?: boolean;
}

function formatForInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 1_000_000) / 1_000_000);
}

export function NumberField({
  name,
  label,
  prefix,
  suffix,
  hint,
  placeholder,
  className,
  disabled,
  trailing,
  onValueChange,
  emptyAsZero,
}: NumberFieldProps) {
  const { control } = useFormContext<AnalysisFormValues>();
  const id = React.useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const numeric = typeof field.value === "number" ? field.value : NaN;
        return (
          <NumberInput
            id={id}
            label={label}
            hint={hint}
            error={fieldState.error?.message}
            prefix={prefix}
            suffix={suffix}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
            trailing={trailing}
            value={numeric}
            emptyAsZero={emptyAsZero}
            onBlur={field.onBlur}
            onChange={(v) => {
              field.onChange(v);
              onValueChange?.(v);
            }}
          />
        );
      }}
    />
  );
}

interface NumberInputProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  /** Blank / incomplete input emits 0 instead of NaN. Use only on optional money fields. */
  emptyAsZero?: boolean;
}

export function NumberInput({
  id,
  label,
  hint,
  error,
  prefix,
  suffix,
  placeholder,
  className,
  disabled,
  trailing,
  value,
  onChange,
  onBlur,
  emptyAsZero = false,
}: NumberInputProps) {
  const [text, setText] = React.useState(() => formatForInput(value));
  const lastEmitted = React.useRef(value);

  React.useEffect(() => {
    const changedExternally =
      (Number.isFinite(value) || Number.isFinite(lastEmitted.current)) && value !== lastEmitted.current;
    if (changedExternally) {
      setText(formatForInput(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.\-]/g, "");
    setText(cleaned);
    const parsed = cleaned === "" || cleaned === "-" || cleaned === "." ? NaN : Number(cleaned);
    const next = Number.isFinite(parsed) ? parsed : emptyAsZero ? 0 : NaN;
    lastEmitted.current = next;
    onChange(next);
  };

  return (
    <FieldWrapper label={label} htmlFor={id} hint={hint} error={error} className={className} trailing={trailing}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          aria-invalid={error ? true : undefined}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => {
            if (Number.isFinite(value)) setText(formatForInput(value));
            onBlur?.();
          }}
          className={cn(prefix && "pl-8", suffix && "pr-10")}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
}

/* ------------------------------------------------------------------ */

interface TextFieldProps {
  name: Name;
  label: string;
  placeholder?: string;
  hint?: string;
  className?: string;
}

export function TextField({ name, label, placeholder, hint, className }: TextFieldProps) {
  const { control } = useFormContext<AnalysisFormValues>();
  const id = React.useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldWrapper label={label} htmlFor={id} hint={hint} error={fieldState.error?.message} className={className}>
          <Input
            id={id}
            placeholder={placeholder}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            aria-invalid={fieldState.error ? true : undefined}
          />
        </FieldWrapper>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */

interface SelectFieldProps<V extends string> {
  name: Name;
  label: string;
  options: { value: V; label: string }[];
  placeholder?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  onValueChange?: (value: V) => void;
}

export function SelectField<V extends string>({
  name,
  label,
  options,
  placeholder,
  hint,
  className,
  disabled,
  onValueChange,
}: SelectFieldProps<V>) {
  const { control } = useFormContext<AnalysisFormValues>();
  const id = React.useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldWrapper label={label} htmlFor={id} hint={hint} error={fieldState.error?.message} className={className}>
          <Select
            value={typeof field.value === "string" ? field.value : undefined}
            onValueChange={(v) => {
              field.onChange(v);
              onValueChange?.(v as V);
            }}
            disabled={disabled}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.error ? true : undefined}>
              <SelectValue placeholder={placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */

export function FieldGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4 space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
