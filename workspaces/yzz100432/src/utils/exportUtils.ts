import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import type { Task, Tree, PruningScheme } from "../types";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export function exportToExcel(
  tasks: Task[],
  trees: Tree[],
  filename: string = "修剪清单"
): void {
  const data = tasks.map((task) => {
    const tree = trees.find((t) => t.id === task.treeId);
    return {
      序号: tasks.indexOf(task) + 1,
      树木编号: task.treeCode,
      树种: tree?.species || "",
      位置: `X:${tree?.positionX || 0}, Z:${tree?.positionZ || 0}`,
      修剪方位: task.sideToPrune,
      照片要求: task.photoRequirements,
      复查日期: task.recheckDate
        ? format(new Date(task.recheckDate), "yyyy-MM-dd", { locale: zhCN })
        : "",
      负责人: task.assignee,
      状态: getTaskStatusText(task.status),
      雨后复查: task.isRainReview ? "是" : "否",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "修剪清单");

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];

  XLSX.writeFile(
    workbook,
    `${filename}_${format(new Date(), "yyyyMMdd", { locale: zhCN })}.xlsx`
  );
}

export function exportToPDF(
  tasks: Task[],
  trees: Tree[],
  schemes: PruningScheme[],
  filename: string = "修剪清单"
): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("园区树木修剪清单", 140, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `生成日期: ${format(new Date(), "yyyy年MM月dd日", { locale: zhCN })}`,
    15,
    25
  );
  doc.text(`任务总数: ${tasks.length}`, 15, 32);

  const headers = [
    "序号",
    "树木编号",
    "树种",
    "位置",
    "修剪方位",
    "照片要求",
    "复查日期",
    "负责人",
    "状态",
  ];
  const colWidths = [12, 22, 18, 25, 40, 50, 22, 18, 18];

  let y = 45;
  const rowHeight = 12;

  doc.setFont("helvetica", "bold");
  doc.setFillColor(27, 77, 62);
  doc.setTextColor(255, 255, 255);
  doc.rect(10, y - 8, 280, rowHeight - 2, "F");

  let x = 12;
  headers.forEach((header, i) => {
    doc.text(header, x, y - 2);
    x += colWidths[i];
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  y += rowHeight;

  tasks.forEach((task, index) => {
    if (y > 190) {
      doc.addPage();
      y = 25;

      doc.setFont("helvetica", "bold");
      doc.setFillColor(27, 77, 62);
      doc.setTextColor(255, 255, 255);
      doc.rect(10, y - 8, 280, rowHeight - 2, "F");

      let xh = 12;
      headers.forEach((header, i) => {
        doc.text(header, xh, y - 2);
        xh += colWidths[i];
      });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      y += rowHeight;
    }

    const tree = trees.find((t) => t.id === task.treeId);
    const scheme = schemes.find((s) => s.id === task.schemeId);
    const rowData = [
      String(index + 1),
      task.treeCode,
      tree?.species || "",
      `X:${tree?.positionX || 0}, Z:${tree?.positionZ || 0}`,
      task.sideToPrune,
      task.photoRequirements,
      task.recheckDate
        ? format(new Date(task.recheckDate), "yyyy-MM-dd", { locale: zhCN })
        : "",
      task.assignee,
      getTaskStatusText(task.status),
    ];

    if (index % 2 === 0) {
      doc.setFillColor(240, 247, 244);
      doc.rect(10, y - 8, 280, rowHeight - 2, "F");
    }

    let xd = 12;
    rowData.forEach((data, i) => {
      const lines = doc.splitTextToSize(data, colWidths[i] - 2);
      doc.text(lines[0], xd, y);
      xd += colWidths[i];
    });

    if (scheme) {
      y += 15;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `  景观评分: ${scheme.landscapeScore.toFixed(1)} | 照明覆盖率: ${(
          scheme.lightingCoverage * 100
        ).toFixed(0)}% | 净空高度: ${scheme.clearanceHeight.toFixed(1)}m`,
        15,
        y
      );
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      y -= 3;
    }

    y += rowHeight;
  });

  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "备注：请园林队按照清单要求执行修剪，每棵树完成后请及时上传回传照片。",
    15,
    y
  );
  doc.text(
    "复查日期请严格遵守，雨后需额外复查的任务已单独标注。",
    15,
    y + 6
  );

  doc.save(
    `${filename}_${format(new Date(), "yyyyMMdd", { locale: zhCN })}.pdf`
  );
}

export function exportSchemeComparison(
  scheme: PruningScheme,
  tree: Tree,
  beforeImage?: string,
  afterImage?: string
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("修剪方案对比报告", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`方案名称: ${scheme.name}`, 20, 35);
  doc.text(`树木编号: ${tree.code}`, 20, 42);
  doc.text(`树种: ${tree.species}`, 20, 49);
  doc.text(`创建人: ${scheme.createdBy}`, 20, 56);
  doc.text(
    `创建日期: ${format(new Date(scheme.createdAt), "yyyy年MM月dd日", {
      locale: zhCN,
    })}`,
    20,
    63
  );

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("效果指标", 20, 78);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`行人净空高度: ${scheme.clearanceHeight.toFixed(1)} 米`, 25, 86);
  doc.text(
    `照明覆盖率: ${(scheme.lightingCoverage * 100).toFixed(0)}%`,
    25,
    93
  );
  doc.text(`景观评分: ${scheme.landscapeScore.toFixed(1)} / 10`, 25, 100);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("修剪参数", 20, 115);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `修剪范围位置: X:${scheme.pruningBox.position[0].toFixed(
      1
    )}, Y:${scheme.pruningBox.position[1].toFixed(1)}, Z:${scheme.pruningBox.position[2].toFixed(1)}`,
    25,
    123
  );
  doc.text(
    `修剪范围尺寸: ${scheme.pruningBox.size[0].toFixed(1)} × ${scheme.pruningBox.size[1].toFixed(1)} × ${scheme.pruningBox.size[2].toFixed(1)} 米`,
    25,
    130
  );

  if (beforeImage) {
    try {
      doc.addImage(beforeImage, "JPEG", 20, 145, 80, 60);
      doc.text("修剪前", 55, 210, { align: "center" });
    } catch (e) {
      console.warn("Failed to add before image:", e);
    }
  }

  if (afterImage) {
    try {
      doc.addImage(afterImage, "JPEG", 110, 145, 80, 60);
      doc.text("修剪后", 145, 210, { align: "center" });
    } catch (e) {
      console.warn("Failed to add after image:", e);
    }
  }

  doc.save(
    `修剪方案_${tree.code}_${format(new Date(), "yyyyMMdd", { locale: zhCN })}.pdf`
  );
}

function getTaskStatusText(status: Task["status"]): string {
  const map: Record<Task["status"], string> = {
    pending: "待处理",
    in_progress: "进行中",
    completed: "已完成",
    needs_review: "需复查",
  };
  return map[status];
}

export function downloadJSON<T>(data: T, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "yyyyMMdd", {
    locale: zhCN,
  })}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function resizeImage(
  dataUrl: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } else {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}
