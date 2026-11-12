"use client";

import * as React from "react";
import { Controller, useFormContext, type FieldPath } from "react-hook-form";
import type { MaxOfferFormValues } from "@/lib/utils/schema";
import { NumberInput, FieldWrapper } from "@/components/forms/fields";
import { Input } from "@/components/ui/input";

type Name = FieldPath<MaxOfferFormValues>;

export function MaxNumberField({
  name,
  label,
  prefix,
  suffix,
  hint,
  placeholder,
  className,
  onValueChange,
  emptyAsZero,
}: {
  name: Name;
  label: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  onValueChange?: (value: number) => void;
  emptyAsZero?: boolean;
}) {
  const { control } = useFormContext<MaxOfferFormValues>();
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

export function MaxTextField({
  name,
  label,
  placeholder,
  hint,
  className,
}: {
  name: Name;
  label: string;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  const { control } = useFormContext<MaxOfferFormValues>();
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
