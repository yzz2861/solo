import * as XLSX from "xlsx";
console.log("test");
      ? desensitizeAddress(order.address)
      : order.address;

    return [
      order.id,
      customerName,
      phone,
      address,
      order.applianceType,
      order.applianceModel || "",
      getDefectLabels(order),
      `${order.confidence}%`,
      getStatusLabel(order.status),
      order.isDisputed ? "是" : "否",
      formatDateTime(order.createdAt),
      order.remark || "",
    ];
  });

  const detailData = [detailHeader, ...detailRows];
  const detailWs = XLSX.utils.aoa_to_sheet(detailData);

  // 设置列宽
  detailWs["!cols"] = [
    { wch: 18 }, // 工单号
    { wch: 12 }, // 客户姓名
    { wch: 15 }, // 联系电话
    { wch: 30 }, // 客户地址
    { wch: 10 }, // 家电类型
    { wch: 12 }, // 型号
    { wch: 25 }, // 缺陷标签
    { wch: 10 }, // 置信度
    { wch: 12 }, // 工单状态
    { wch: 10 }, // 是否争议
    { wch: 20 }, // 创建时间
    { wch: 30 }, // 备注
  ];

  // ===== 创建工作簿并导出 =====
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summaryWs, "数据汇总");
  XLSX.utils.book_append_sheet(wb, detailWs, "工单明细");

  const filename = `维修缺陷筛查报告_${formatDateForFilename(new Date())}.xlsx`;
  XLSX.writeFile(wb, filename);
}
