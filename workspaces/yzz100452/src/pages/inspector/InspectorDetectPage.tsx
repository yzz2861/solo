import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ArrowLeft,
  Check,
  X,
  UploadCloud,
  Crosshair,
  Focus,
  Mountain,
  CheckCircle2,
  Package,
  ShieldCheck,
  FileText,
  Send,
  Trash2,
  ImagePlus,
  Tag,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { formatShutter, gradeColor } from "@/utils/format";
import { useCameraStore } from "@/store/cameraStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/ui/GradeBadge";
import type { DefectGrade, InspectionPhoto } from "@/types";

interface FormData {
  shutterCount: number;
  centerSharp: boolean;
  edgeSharp: boolean;
  infinityFocus: boolean;
  focusPassed: boolean;
  focusNote: string;
  defectGrade: DefectGrade;
  conclusion: string;
}

const DEFECT_GRADES: DefectGrade[] = ["S", "A", "B", "C", "D"];

const createPhoto = (equipmentId: string, category: InspectionPhoto["category"], file: File): InspectionPhoto => ({
  id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  equipmentId,
  category,
  url: URL.createObjectURL(file),
  name: file.name,
  uploadAt: new Date().toISOString(),
});

export default function InspectorDetectPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { equipments, addInspection, updateEquipmentStatus } = useCameraStore();
  const { currentUser } = useAuthStore();
  const equipment = equipments.find((e) => e.id === id) ?? null;
  const [shutterPhoto, setShutterPhoto] = useState<InspectionPhoto | null>(null);
  const [moldPhotos, setMoldPhotos] = useState<InspectionPhoto[]>([]);
  const [checkedMolds, setCheckedMolds] = useState<Set<string>>(new Set());
  const [accessories, setAccessories] = useState<Record<string, { present: boolean; condition: string }>>({});

  const { register, setValue, watch, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      shutterCount: 0,
      centerSharp: true,
      edgeSharp: true,
      infinityFocus: true,
      focusPassed: true,
      focusNote: "",
      defectGrade: "A",
      conclusion: "",
    },
  });

  useEffect(() => {
    if (!equipment) return;
    reset();
    setShutterPhoto(null);
    setMoldPhotos([]);
    setCheckedMolds(new Set());
    setAccessories(Object.fromEntries(equipment.accessories.map((a) => [a, { present: true, condition: "" }])));
  }, [id, equipment, reset]);

  const handleShutterDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && equipment) setShutterPhoto(createPhoto(equipment.id, "shutter", f));
  }, [equipment]);

  const handleMoldDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!equipment) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setMoldPhotos((prev) => [...prev, ...files.map((f) => createPhoto(equipment.id, "mold", f))]);
  }, [equipment]);

  const onMoldClick = (pid: string) => {
    setCheckedMolds((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const removeMold = (pid: string) => {
    setMoldPhotos((prev) => prev.filter((p) => p.id !== pid));
    setCheckedMolds((prev) => { const n = new Set(prev); n.delete(pid); return n; });
  };

  const onSubmit = (data: FormData) => {
    if (!equipment || !currentUser) return;
    const accessoryCheck = Object.entries(accessories).map(([item, v]) => ({
      item, present: v.present, condition: v.condition || undefined,
    }));
    addInspection({
      equipmentId: equipment.id,
      equipmentSerialNumber: equipment.serialNumber,
      shutterCount: data.shutterCount,
      shutterImageId: shutterPhoto?.id,
      moldSpotsCount: checkedMolds.size,
      moldPhotos,
      focusTest: {
        passed: data.focusPassed,
        centerSharp: data.centerSharp,
        edgeSharp: data.edgeSharp,
        infinityFocus: data.infinityFocus,
        note: data.focusNote || undefined,
      },
      accessoryCheck,
      defectGrade: data.defectGrade,
      conclusion: data.conclusion,
      inspectorId: currentUser.id,
      inspectorName: currentUser.displayName || currentUser.name,
    });
    updateEquipmentStatus(equipment.id, "available");
    alert(`检测报告已提交！设备 ${equipment.brand} ${equipment.model} 已转为可售状态`);
    navigate("/inspector/workbench", { replace: true });
  };

  if (!equipment) {
    return (
      <div className="card-panel p-16 text-center">
        <X className="w-16 h-16 mx-auto mb-4 text-signal-red" />
        <h2 className="text-xl font-semibold text-space-200 mb-2">设备不存在</h2>
        <p className="text-sm text-space-400 mb-6">未找到对应设备记录</p>
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate("/inspector/workbench")}>
          返回工作台
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-52px)] bg-space-950 flex flex-col">
      <div className="px-8 py-5 border-b border-brass-500/10 flex items-center gap-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-lg bg-brass-gradient-subtle border border-brass-400/30 flex items-center justify-center">
            <Camera className="w-7 h-7 text-brass-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-space-100 tracking-wide">{equipment.brand} {equipment.model}</h1>
              {equipment.defectGrade && <GradeBadge grade={equipment.defectGrade} size="sm" />}
            </div>
            <div className="flex items-center gap-5 text-xs text-space-400">
              <span className="font-mono flex items-center gap-1.5"><Tag className="w-3 h-3" />{equipment.serialNumber}</span>
              <span>寄卖人：{equipment.consignorName}</span>
              <span>参考底价：¥{equipment.basePrice.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-brass-400/80 px-3 py-1.5 rounded bg-brass-gradient-subtle border border-brass-400/20">
          INSPECTION MODE
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-brass-500/15 flex flex-col min-w-0">
          <div className="p-6 grid grid-cols-2 gap-5 border-b border-brass-500/10">
            <div className="card-panel p-6">
              <div className="text-[10px] font-mono tracking-widest text-space-500 mb-3">SHUTTER COUNT · 快门次数</div>
              <div className="text-5xl font-mono font-bold text-brass-gradient mb-2">{formatShutter(watch("shutterCount"))}</div>
              <div className="text-[10px] text-space-600 mb-3">{watch("shutterCount") > 50000 ? "使用较多" : watch("shutterCount") > 10000 ? "正常使用" : "近乎全新"}</div>
              <input type="number" {...register("shutterCount", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-base bg-space-900 border border-space-600 rounded text-space-100 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-500/20 transition-all" />
            </div>
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleShutterDrop}
              className={cn("card-panel p-6 flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer min-h-[200px]",
                shutterPhoto ? "border-brass-400/40 bg-brass-gradient-subtle/40" : "border-space-600 hover:border-brass-500/50 hover:bg-space-800/40")}>
              {shutterPhoto ? (
                <div className="w-full h-full relative">
                  <img src={shutterPhoto.url} alt="shutter" className="w-full h-40 object-cover rounded-md shadow-lg" />
                  <button type="button" onClick={() => setShutterPhoto(null)} className="absolute top-2 right-2 p-1.5 bg-space-900/80 rounded-md text-space-300 hover:text-signal-red hover:bg-space-900 transition-all"><X className="w-4 h-4" /></button>
                  <div className="mt-3 text-[10px] font-mono text-space-500 truncate">{shutterPhoto.name}</div>
                </div>
              ) : (
                <div className="text-center">
                  <UploadCloud className="w-12 h-12 mx-auto mb-3 text-space-500" />
                  <div className="text-sm text-space-300 mb-1">拖拽快门数照片到此处</div>
                  <div className="text-[10px] text-space-600">支持 JPG / PNG 格式</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-space-500 block">霉斑照片画廊</span>
                <span className="text-xs text-space-400 mt-0.5 block">MOLD DETECTION GALLERY · {moldPhotos.length} 张</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-brass-300">{checkedMolds.size}</span>
                <span className="text-[10px] text-space-500 ml-1">处已标记</span>
              </div>
            </div>
            <div className={cn("flex-1 border-2 border-dashed rounded-lg p-4 overflow-y-auto scrollbar-thin transition-colors",
              moldPhotos.length === 0 ? "border-space-600 bg-space-900/30" : "border-brass-500/20 bg-space-900/10")}
              onDragOver={(e) => e.preventDefault()} onDrop={handleMoldDrop}>
              {moldPhotos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <ImagePlus className="w-14 h-14 mb-4 text-space-600" />
                  <div className="text-base text-space-300 mb-2">拖拽霉斑检测照片到此处</div>
                  <div className="text-xs text-space-500 mb-1">支持多张图片同时上传</div>
                  <div className="text-[10px] text-space-600">点击缩略图标记存在霉斑的照片</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <AnimatePresence>
                    {moldPhotos.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, scale: 0.85, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.25, delay: i * 0.04 }}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-space-600 cursor-pointer shadow-md hover:shadow-lg transition-all" onClick={() => onMoldClick(p.id)}>
                        <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className={cn("absolute inset-0 transition-all duration-200",
                          checkedMolds.has(p.id) ? "bg-brass-400/25 ring-3 ring-inset ring-brass-400" : "group-hover:bg-space-900/40")}>
                          {checkedMolds.has(p.id) && (
                            <div className="absolute top-2 left-2 w-7 h-7 bg-brass-gradient rounded-full flex items-center justify-center shadow-brass-glow">
                              <Check className="w-4 h-4 text-space-900" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeMold(p.id); }} className="absolute top-2 right-2 p-1.5 bg-space-900/80 rounded-md text-space-300 opacity-0 group-hover:opacity-100 transition-all hover:text-signal-red hover:bg-space-900"><Trash2 className="w-4 h-4" /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-1/2 flex flex-col min-w-0 relative">
          <div className="p-6 space-y-5 flex-1 overflow-y-auto scrollbar-thin pb-28">
            <div className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-brass-500/10 flex items-center justify-between bg-space-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-brass-200">
                  <Crosshair className="w-4 h-4" />跑焦检测 · FOCUS CALIBRATION
                </div>
                <label className="flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-space-900/60 border border-space-600">
                  <input type="checkbox" {...register("focusPassed")} className="w-4 h-4 accent-brass-500" />
                  <span className={cn("font-medium", watch("focusPassed") ? "text-signal-green" : "text-signal-red")}>{watch("focusPassed") ? "✓ 整体通过" : "✗ 未通过"}</span>
                </label>
              </div>
              <div className="p-5 space-y-3">
                {[{ k: "centerSharp", l: "中心锐度达标", i: <Crosshair className="w-4 h-4" /> },
                  { k: "edgeSharp", l: "边缘锐度达标", i: <Focus className="w-4 h-4" /> },
                  { k: "infinityFocus", l: "无穷远合焦准确", i: <Mountain className="w-4 h-4" /> }].map(({ k, l, i }) => (
                  <label key={k} className="flex items-center justify-between p-3 rounded-md bg-space-900/60 border border-space-700/50 hover:border-space-600 transition-colors cursor-pointer">
                    <span className="flex items-center gap-3 text-sm text-space-200">{i}{l}</span>
                    <input type="checkbox" {...register(k as any)} className="w-5 h-5 accent-brass-500 rounded" />
                  </label>
                ))}
                <div>
                  <label className="label-field">检测备注</label>
                  <textarea {...register("focusNote")} rows={2} placeholder="如有跑焦或其他光学问题请在此说明..."
                    className="w-full px-3 py-2 text-sm bg-space-900 border border-space-600 rounded-md text-space-100 placeholder-space-500 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-500/20 transition-all resize-none" />
                </div>
              </div>
            </div>

            <div className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-brass-500/10 flex items-center gap-2 text-xs font-semibold text-brass-200 bg-space-800/40">
                <Package className="w-4 h-4" />配件核对清单 · ACCESSORY CHECKLIST
              </div>
              <div className="p-5 space-y-2.5">
                {Object.keys(accessories).length === 0 ? (
                  <div className="text-xs text-space-500 py-6 text-center border border-dashed border-space-700 rounded-md">无配件清单</div>
                ) : (
                  Object.entries(accessories).map(([item, v]) => (
                    <div key={item} className="flex items-center gap-4 p-3 rounded-md bg-space-900/60 border border-space-700/40">
                      <span className="text-sm text-space-200 flex-1 min-w-0 truncate font-medium">{item}</span>
                      <label className="flex items-center gap-2 text-xs text-space-400 flex-shrink-0">
                        <input type="checkbox" checked={v.present} onChange={(e) => setAccessories((p) => ({ ...p, [item]: { ...p[item], present: e.target.checked } }))} className="w-4 h-4 accent-brass-500" />
                        {v.present ? <CheckCircle2 className="w-4 h-4 text-signal-green" /> : <X className="w-4 h-4 text-signal-red" />}
                        <span className={v.present ? "text-signal-green" : "text-signal-red"}>{v.present ? "齐全" : "缺失"}</span>
                      </label>
                      <input value={v.condition} onChange={(e) => setAccessories((p) => ({ ...p, [item]: { ...p[item], condition: e.target.value } }))} placeholder="成色/状态备注"
                        className="w-36 px-3 py-1.5 text-xs bg-space-800 border border-space-600 rounded-md text-space-100 placeholder-space-600 focus:border-brass-500 focus:outline-none transition-all" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-brass-500/10 flex items-center gap-2 text-xs font-semibold text-brass-200 bg-space-800/40">
                <ShieldCheck className="w-4 h-4" />瑕疵等级评定 · DEFECT GRADE
              </div>
              <div className="p-5 flex items-center justify-between gap-3">
                {DEFECT_GRADES.map((g) => {
                  const c = gradeColor(g);
                  const sel = watch("defectGrade") === g;
                  return (
                    <button key={g} type="button" onClick={() => setValue("defectGrade", g)}
                      className={cn("flex-1 flex flex-col items-center py-4 rounded-lg border transition-all duration-200",
                        sel ? "bg-brass-gradient-subtle border-brass-400/60 shadow-brass-glow-lg scale-[1.02]" : `${c.bg} ${c.border} hover:brightness-110 hover:scale-[1.01]`)}>
                      <span className={cn("w-12 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-xl mb-2 border",
                        c.bg, c.text, c.border, sel && "shadow-brass-glow")}>{g}</span>
                      <span className={cn("text-xs font-medium", sel ? "text-brass-200" : "text-space-500")}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-brass-500/10 flex items-center gap-2 text-xs font-semibold text-brass-200 bg-space-800/40">
                <FileText className="w-4 h-4" />检测结论 · FINAL CONCLUSION
              </div>
              <div className="p-5">
                <textarea {...register("conclusion")} rows={5} placeholder="请详细描述设备整体状况，包括外观成色、光学性能、机械功能、瑕疵说明等综合评估意见..."
                  className="w-full px-4 py-3 text-sm bg-space-900 border border-space-600 rounded-lg text-space-100 placeholder-space-500 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-500/20 transition-all resize-none leading-relaxed" />
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 p-5 bg-space-900/95 border-t border-brass-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-4 max-w-xl ml-auto">
              <div className="flex-1 text-right">
                <div className="text-[10px] font-mono tracking-widest text-space-500">当前等级</div>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <GradeBadge grade={watch("defectGrade")} showLabel size="sm" />
                </div>
              </div>
              <Button type="submit" size="lg" icon={<Send className="w-4 h-4" />} className="min-w-[180px]">
                提交检测报告
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
