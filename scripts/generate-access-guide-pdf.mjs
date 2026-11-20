import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs", "PropertyIQ-Access-Guide.pdf");

const doc = new jsPDF({ unit: "pt", format: "a4" });
const left = 56;
let y = 72;

doc.setFont("helvetica", "bold");
doc.setFontSize(20);
doc.text("PropertyIQ Access Guide", left, y);
y += 36;

doc.setFont("helvetica", "normal");
doc.setFontSize(12);
doc.text("Use this checklist after you purchase PropertyIQ on Payhip.", left, y, { maxWidth: 480 });
y += 32;

const steps = [
  "1. Open the PropertyIQ access link.",
  "2. Enter the email used at Payhip checkout.",
  "3. Enter the unique Payhip licence key from the receipt/download page.",
  "4. Activate access.",
  "5. Bookmark PropertyIQ.",
];

for (const step of steps) {
  doc.text(step, left, y, { maxWidth: 480 });
  y += 22;
}

y += 16;
doc.setFontSize(11);
doc.text(
  "Each licence is unique to your purchase. PropertyIQ does not use a shared bypass code. If you need to move to a new browser, sign out under Settings, then activate again.",
  left,
  y,
  { maxWidth: 480 },
);

writeFileSync(output, Buffer.from(doc.output("arraybuffer")));
console.info(`Wrote ${output}`);
