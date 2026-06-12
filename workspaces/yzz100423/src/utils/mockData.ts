import type { WorkOrder, Photo } from "@/types";
import { simulateAIAnalysis, generatePhotoQuality } from "./aiSimulator";
import { calculateConfidence, isDisputedOrder } from "./confidence";
import { APPLIANCE_TYPES, PHOTO_ANGLES } from "./constants";

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const sampleRemarks = [
  "客户说冰箱不制冷，上门检查发现背后有裂纹，怀疑是运输时碰的",
  "洗衣机侧面有污渍，客户说买的时候就有，需要确认",
  "空调外机缺少一个固定螺丝，安装师傅说开箱就没找到",
  "电视屏幕左下角有碎裂，客户坚称送货时没检查仔细",
  "热水器底部有水渍，不确定是安装漏水还是之前就有",
  "油烟机表面有划痕，客户认为是安装师傅不小心碰的",
  "燃气灶有一个火盖变形，怀疑是客户使用不当造成的",
  "微波炉门把手处有裂纹，之前修过一次，这次又坏了",
  "洗碗机底部有进水痕迹，客户说用了半年一直没问题",
  "冰箱密封条有污渍，门关上后有缝隙，制冷效果差",
];

const customerNames = [
  "张伟",
  "李娜",
  "王芳",
  "刘洋",
  "陈静",
  "杨帆",
  "黄磊",
  "周明",
  "吴婷",
  "徐磊",
];

const addresses = [
  "北京市朝阳区建国路88号SOHO现代城A座1201",
  "上海市浦东新区张江高科技园区博云路2号",
  "广州市天河区体育西路103号维多利广场B座",
  "深圳市南山区科技园南区深南大道9996号",
  "杭州市西湖区文三路478号华星时代广场",
  "成都市锦江区春熙路东段1号阳光百货",
  "武汉市江汉区建设大道568号新世界国贸大厦",
  "南京市鼓楼区中山路18号德基广场",
];

const technicianNames = ["李师傅", "王师傅", "张师傅", "陈师傅", "刘师傅"];

const statuses: WorkOrder["status"][] = [
  "screened",
  "customer_reviewed",
  "quality_check",
  "quality_passed",
  "disputed",
  "closed",
];

const samplePhotos = [
  "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
];

export function generateMockOrders(count: number = 12): WorkOrder[] {
  const orders: WorkOrder[] = [];

  for (let i = 0; i < count; i++) {
    const id = `WO${String(202406000 + i).padStart(10, "0")}`;
    const numPhotos = randomInt(2, 5);
    const photos: Photo[] = [];

    for (let j = 0; j < numPhotos; j++) {
      const quality = generatePhotoQuality();
      photos.push({
        id: randomId("photo"),
        orderId: id,
        url: samplePhotos[(i + j) % samplePhotos.length],
        angle: PHOTO_ANGLES[j % PHOTO_ANGLES.length],
        clarity: quality.clarity,
        brightness: quality.brightness,
      });
    }

    const remark = randomChoice(sampleRemarks);
    const applianceType = randomChoice(APPLIANCE_TYPES);

    const { tags, evidenceAreas } = simulateAIAnalysis(id, photos, remark);

    const hasOldRepair = tags.some((t) => t.type === "old_repair");

    const { overallConfidence, factors } = calculateConfidence({
      photos,
      tags,
      remark,
      hasOldRepair,
    });

    let status = randomChoice(statuses);
    if (i < 3) status = "screened";
    if (i >= 3 && i < 6) status = "customer_reviewed";
    if (i >= 6 && i < 9) status = "quality_check";
    if (i >= 9 && i < 11) status = "disputed";
    if (i >= 11) status = "closed";

    const order: WorkOrder = {
      id,
      customerName: randomChoice(customerNames),
      phone: `1${randomInt(30, 99)}${String(randomInt(1000, 9999)).padStart(4, "0")}${String(randomInt(1000, 9999)).padStart(4, "0")}`,
      address: randomChoice(addresses),
      applianceType,
      applianceModel: `${applianceType.charAt(0)}-${randomInt(100, 999)}`,
      remark,
      status,
      confidence: overallConfidence,
      isDisputed: false,
      confidenceFactors: factors,
      createdBy: randomChoice(technicianNames),
      createdAt: new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000).toISOString(),
      photos,
      tags,
      evidenceAreas,
      auditLogs: [
        {
          id: randomId("log"),
          orderId: id,
          operator: randomChoice(technicianNames),
          action: "上传照片",
          remark: "师傅上门检查后上传",
          createdAt: new Date(Date.now() - randomInt(5, 24) * 60 * 60 * 1000).toISOString(),
        },
        {
          id: randomId("log"),
          orderId: id,
          operator: "AI系统",
          action: "AI初筛完成",
          afterValue: `检测到 ${tags.length} 类缺陷`,
          createdAt: new Date(Date.now() - randomInt(4, 20) * 60 * 60 * 1000).toISOString(),
        },
      ],
      tagModifyCount: 0,
    };

    order.isDisputed = isDisputedOrder(order);
    if (order.isDisputed && order.status !== "disputed" && order.status !== "closed") {
      order.status = "disputed";
    }

    orders.push(order);
  }

  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
