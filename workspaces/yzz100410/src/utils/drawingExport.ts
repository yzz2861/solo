import { jsPDF } from "jspdf";
import type { Scheme } from "@/types";

export function exportDrawingPdf(scheme: Scheme): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  doc.setFontSize(18);
  doc.text(scheme.name, margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.text(`Date: ${new Date(scheme.createdAt).toLocaleDateString()}`, margin, y);
  y += 6;

  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const drawAreaX = margin;
  const drawAreaY = y;
  const drawAreaW = pageW * 0.6;
  const drawAreaH = 100;

  doc.setDrawColor(0);
  doc.rect(drawAreaX, drawAreaY, drawAreaW, drawAreaH);

  const allX = scheme.modules.map((m) => m.position[0]);
  const allZ = scheme.modules.map((m) => m.position[2]);
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 10);
  const minZ = Math.min(...allZ, 0);
  const maxZ = Math.max(...allZ, 10);
  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const scaleX = (drawAreaW - 20) / rangeX;
  const scaleZ = (drawAreaH - 20) / rangeZ;
  const scale = Math.min(scaleX, scaleZ);
  const offsetX = drawAreaX + 10;
  const offsetZ = drawAreaY + 10;

  for (const mod of scheme.modules) {
    const rx = offsetX + (mod.position[0] - minX) * scale;
    const ry = offsetZ + (mod.position[2] - minZ) * scale;
    const rw = mod.length * scale;
    const rh = mod.width * scale;
    doc.setDrawColor(0, 0, 200);
    doc.rect(rx, ry, rw, rh);
    doc.setFontSize(7);
    doc.text(mod.id, rx + 1, ry + 4);
  }

  for (const anchor of scheme.anchors) {
    const ax = offsetX + (anchor.position[0] - minX) * scale;
    const ay = offsetZ + (anchor.position[2] - minZ) * scale;
    const r = 2;
    doc.setDrawColor(anchor.type === "shore" ? 0 : 200, 0, anchor.type === "shore" ? 200 : 0);
    doc.circle(ax, ay, r);
    doc.setFontSize(7);
    doc.text(anchor.id, ax + 3, ay + 1);
  }

  y = drawAreaY + drawAreaH + 8;

  const tableX = pageW * 0.65;
  let ty = margin + 20;

  doc.setFontSize(12);
  doc.text("Module List", tableX, ty);
  ty += 6;
  doc.setFontSize(8);
  doc.text("ID", tableX, ty);
  doc.text("Type", tableX + 25, ty);
  doc.text("L×W", tableX + 50, ty);
  doc.text("Cap.", tableX + 80, ty);
  ty += 4;
  doc.line(tableX, ty, pageW - margin, ty);
  ty += 4;
  for (const mod of scheme.modules) {
    doc.text(mod.id, tableX, ty);
    doc.text(mod.type, tableX + 25, ty);
    doc.text(`${mod.length}×${mod.width} ${mod.unit}`, tableX + 50, ty);
    doc.text(`${mod.loadCapacity}kg`, tableX + 80, ty);
    ty += 5;
  }

  ty += 6;
  doc.setFontSize(12);
  doc.text("Anchor List", tableX, ty);
  ty += 6;
  doc.setFontSize(8);
  doc.text("ID", tableX, ty);
  doc.text("Type", tableX + 25, ty);
  doc.text("Pos", tableX + 50, ty);
  doc.text("Rope", tableX + 85, ty);
  ty += 4;
  doc.line(tableX, ty, pageW - margin, ty);
  ty += 4;
  for (const anchor of scheme.anchors) {
    doc.text(anchor.id, tableX, ty);
    doc.text(anchor.type, tableX + 25, ty);
    doc.text(`(${anchor.position[0].toFixed(1)},${anchor.position[2].toFixed(1)})`, tableX + 50, ty);
    doc.text(`${anchor.ropeLength}m`, tableX + 85, ty);
    ty += 5;
  }

  if (scheme.warnings.length > 0) {
    ty += 6;
    doc.setFontSize(12);
    doc.text("Safety Warnings", tableX, ty);
    ty += 6;
    doc.setFontSize(8);
    for (const w of scheme.warnings) {
      if (ty > doc.internal.pageSize.getHeight() - margin) break;
      const prefix = w.level === "danger" ? "[DANGER]" : "[WARN]";
      doc.text(`${prefix} ${w.message}`, tableX, ty);
      ty += 5;
    }
  }

  doc.addPage();
  y = margin;
  doc.setFontSize(14);
  doc.text("Review Notes & Checklist", margin, y);
  y += 10;

  const checklist = [
    "All anchor points verified within allowed zones",
    "Module connection angles within limits",
    "Passage widths meet minimum requirements",
    "Visitor load within bridge capacity",
    "Environmental forces calculated and verified",
    "Rope lengths sufficient for anchor positions",
    "Unit consistency checked across all modules",
    "Emergency evacuation route confirmed",
  ];

  doc.setFontSize(10);
  for (const item of checklist) {
    doc.rect(margin, y - 3, 4, 4);
    doc.text(item, margin + 7, y);
    y += 8;
  }

  y += 10;
  doc.line(margin, y, pageW - margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.text("Reviewer: ______________________    Date: ____________    Signature: ______________________", margin, y);

  doc.save(`${scheme.name}.pdf`);
}
