import type { PaperSize } from "@/lib/types";

export interface ExportPdfOptions {
  fileName: string;
  paperSize: PaperSize;
  backgroundColor?: string;
}

const PAPER: Record<PaperSize, { width: number; height: number; format: "a4" | "letter" }> = {
  a4: { width: 210, height: 297, format: "a4" },
  letter: { width: 215.9, height: 279.4, format: "letter" },
};

/**
 * Rasterises a DOM element and writes it to a multi-page PDF.
 * Libraries are imported lazily so they stay out of the initial bundle.
 */
export async function exportElementToPdf(element: HTMLElement, options: ExportPdfOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: options.backgroundColor ?? null,
    windowWidth: element.scrollWidth,
  });

  const paper = PAPER[options.paperSize];
  const margin = 8;
  const printableWidth = paper.width - margin * 2;
  const printableHeight = paper.height - margin * 2;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: paper.format });

  const pxPerMm = canvas.width / printableWidth;
  const pageHeightPx = Math.floor(printableHeight * pxPerMm);
  const totalPages = Math.ceil(canvas.height / pageHeightPx);

  for (let page = 0; page < totalPages; page++) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - page * pageHeightPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const ctx = slice.getContext("2d");
    if (!ctx) continue;
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, slice.width, slice.height);
    }
    ctx.drawImage(canvas, 0, page * pageHeightPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    const imgData = slice.toDataURL("image/jpeg", 0.92);
    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, margin, printableWidth, sliceHeight / pxPerMm);

    pdf.setFontSize(8);
    pdf.setTextColor(140);
    pdf.text(`PropertyIQ · Page ${page + 1} of ${totalPages}`, paper.width / 2, paper.height - 4, { align: "center" });
  }

  pdf.save(options.fileName);
}

export function buildReportFileName(propertyName: string): string {
  const safe = propertyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);
  return `propertyiq-${safe || "analysis"}-${stamp}.pdf`;
}
