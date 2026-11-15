"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisInput, QuickUnderwriteResults, UnderwritingPack } from "@/lib/types";
import { useSettings } from "@/hooks/useSettings";
import { buildReportFileName, exportElementToPdf } from "@/lib/utils/pdf";
import { Button } from "@/components/ui/button";
import { QuickUnderwriteReport } from "@/components/reports/quick-underwrite-report";

export function ExportQuickUnderwritePdfButton({
  input,
  quick,
  underwriting,
}: {
  input: AnalysisInput;
  quick: QuickUnderwriteResults;
  underwriting?: UnderwritingPack | null;
}) {
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setMounted(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const node = reportRef.current;
      if (!node) throw new Error("Report not ready");
      await exportElementToPdf(node, {
        fileName: buildReportFileName(`${input.property.name || "quick-underwrite"}-quick`),
        paperSize: settings.exportPreferences.paperSize,
        backgroundColor: resolvedTheme === "light" ? "#f6f7fb" : "#070b14",
      });
      toast.success("PDF exported");
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Could not generate the Quick Underwrite PDF.",
      });
    } finally {
      setMounted(false);
      setExporting(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="animate-spin" /> : <FileDown />}
        {exporting ? "Preparing…" : "Export PDF"}
      </Button>
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div aria-hidden style={{ position: "absolute", left: -20000, top: 0, pointerEvents: "none", width: 1100 }}>
            <QuickUnderwriteReport ref={reportRef} input={input} quick={quick} underwriting={underwriting} />
          </div>,
          document.body,
        )}
    </>
  );
}
