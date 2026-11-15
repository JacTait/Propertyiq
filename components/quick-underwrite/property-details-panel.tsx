"use client";

import { PropertyDetailsFields } from "@/components/forms/property-details-fields";
import { FieldGrid, TextField } from "@/components/forms/fields";
import { Card, CardContent } from "@/components/ui/card";

export function PropertyDetailsPanel({
  onLocationChange,
}: {
  onLocationChange?: (country: "US" | "GB" | "CA" | "AU", region: string) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <PropertyDetailsFields
          onLocationChange={onLocationChange}
          description="Shared with Standard Analysis, Max Offer, Resilience and Downside."
        />
        <div className="mt-4">
          <FieldGrid>
            <TextField name="property.address" label="Street Address" placeholder="42 Palm Avenue" className="sm:col-span-2" />
            <TextField name="property.city" label="City" placeholder="Tampa" />
          </FieldGrid>
        </div>
      </CardContent>
    </Card>
  );
}
