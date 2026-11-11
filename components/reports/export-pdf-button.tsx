"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisInput, AnalysisResults, InvestmentSummary, UnderwritingPack } from "@/lib/types";
import { useSettings } from "@/hooks/useSettings";
import { buildReportFileName, exportElementToPdf } from "@/lib/utils/pdf";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ReportDocument } from "@/components/reports/report-document";

interface ExportPdfButtonProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  input: AnalysisInput;
  results: AnalysisResults;
  summary: InvestmentSummary;
  underwriting?: UnderwritingPack | null;
}

export function ExportPdfButton({ input, results, summary, underwriting, variant = "outline", size, className }: ExportPdfButtonProps) {
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
      // Allow the off-screen report (and Recharts) to lay out and paint.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const node = reportRef.current;
      if (!node) throw new Error("Report not ready");
      await exportElementToPdf(node, {
        fileName: buildReportFileName(input.property.name),
        paperSize: settings.exportPreferences.paperSize,
        backgroundColor: resolvedTheme === "light" ? "#f6f7fb" : "#070b14",
      });
      toast.success("PDF exported", { description: "Your investment report has been downloaded." });
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Something went wrong while generating the PDF.",
      });
    } finally {
      setMounted(false);
      setExporting(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="animate-spin" /> : <FileDown />}
        {exporting ? "Preparing…" : "Export PDF"}
      </Button>
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden
            style={{ position: "absolute", left: -20000, top: 0, pointerEvents: "none", width: 1100 }}
          >
            <ReportDocument
              ref={reportRef}
              input={input}
              results={results}
              summary={summary}
              preferences={settings.exportPreferences}
              underwriting={underwriting}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
