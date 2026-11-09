"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  isUpdate: boolean;
  onSave: (name: string, asNew: boolean) => void;
}

export function SavePropertyDialog({ open, onOpenChange, defaultName, isUpdate, onSave }: SavePropertyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Radix unmounts content when closed, so local state resets on every open. */}
        <SaveForm
          defaultName={defaultName}
          isUpdate={isUpdate}
          onSubmit={(name, asNew) => {
            onSave(name, asNew);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function SaveForm({
  defaultName,
  isUpdate,
  onSubmit,
}: {
  defaultName: string;
  isUpdate: boolean;
  onSubmit: (name: string, asNew: boolean) => void;
}) {
  const [name, setName] = useState(defaultName);
  const submit = (asNew: boolean) => onSubmit(name.trim() || defaultName, asNew);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isUpdate ? "Update saved property" : "Save to portfolio"}</DialogTitle>
        <DialogDescription>
          {isUpdate
            ? "Overwrite the saved analysis with your current inputs, or save it as a new entry."
            : "Store this analysis locally so you can revisit and compare it later."}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <Label htmlFor="save-name">Property name</Label>
        <Input id="save-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </form>
      <DialogFooter>
        {isUpdate && (
          <Button variant="outline" onClick={() => submit(true)}>
            Save as new
          </Button>
        )}
        <Button onClick={() => submit(false)}>
          <Save /> {isUpdate ? "Update" : "Save property"}
        </Button>
      </DialogFooter>
    </>
  );
}
