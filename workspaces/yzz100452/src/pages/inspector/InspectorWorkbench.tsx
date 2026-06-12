import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
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
} from "lucide-react";
import { cn } from "@/utils/cn";
import { formatShutter, gradeColor } from "@/utils/format";
import { useCameraStore } from "@/store/cameraStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
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

export default function InspectorWorkbench() {
  const { equipments, addInspection, updateEquipmentStatus } = useCameraStore();
  const { currentUser } = useAuthStore();
  const pendingEquipments = equipments.filter((e) => e.status === "pending_inspect");
  const [selectedId, setSelectedId] = useState<string | null>(pendingEquipments[0]?.id ?? null);
  const selected = equipments.find((e) => e.id === selectedId) ?? null;
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
    if (!selected) return;
    reset({ shutterCount: 0, centerSharp: true, edgeSharp: true, infinityFocus: true, focusPassed: true, focusNote: "", defectGrade: "A", conclusion: "" });
    setShutterPhoto(null);
    setMoldPhotos([]);
    setCheckedMolds(new Set());
    setAccessories(Object.fromEntries(selected.accessories.map((a) => [a, { present: true, condition: "" }])));
  }, [selectedId, selected, reset]);

  const handleShutterDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && selected) setShutterPhoto(createPhoto(selected.id, "shutter", f));
  }, [selected]);

  const handleMoldDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!selected) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setMoldPhotos((prev) => [...prev, ...files.map((f) => createPhoto(selected.id, "mold", f))]);
  }, [selected]);

  const onMoldClick = (id: string) => {
    setCheckedMolds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const removeMold = (id: string) => {
    setMoldPhotos((prev) => prev.filter((p) => p.id !== id));
    setCheckedMolds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const onSubmit = (data: FormData) => {
    if (!selected || !currentUser) return;
    const accessoryCheck = Object.entries(accessories).map(([item, v]) => ({ item, present: v.present, condition: v.condition || undefined }));
    addInspection({
      equipmentId: selected.id,
      equipmentSerialNumber: selected.serialNumber,
      shutterCount: data.shutterCount,
      shutterImageId: shutterPhoto?.id,
      moldSpotsCount: checkedMolds.size,
      moldPhotos,
      focusTest: { passed: data.focusPassed, centerSharp: data.centerSharp, edgeSharp: data.edgeSharp, infinityFocus: data.infinityFocus, note: data.focusNote || undefined },
      accessoryCheck,
      defectGrade: data.defectGrade,
      conclusion: data.conclusion,
      inspectorId: currentUser.id,
      inspectorName: currentUser.displayName || currentUser.name,
    });
    updateEquipmentStatus(selected.id, "available");
    alert(`检测报告已提交！设备 ${selected.brand} ${selected.model} 已转为可售状态`);
    const remaining = pendingEquipments.filter((e) => e.id !== selected.id);
    setSelectedId(remaining[0]?.id ?? null);
  };

  if (pendingEquipments.length === 0) {
    return (
      <div className="card-panel p-16 text-center">
        <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-brass-400" />
        <h2 className="text-xl font-semibold text-space-200 mb-2">暂无待检测设备</h2>
        <p className="text-sm text-space-400">所有设备已完成检测</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-52px)] flex bg-space-950">
      <aside className="w-60 flex-shrink-0 border-r border-brass-500/15 bg-space-900/60 overflow-y-auto scrollbar-thin">
        <div className="p-3 border-b border-brass-500/10">
          <h3 className="text-xs font-mono tracking-widest text-brass-300/80">待检队列 · {pendingEquipments.length}</h3>
        </div>
        <div className="p-2 space-y-2">
          {pendingEquipments.map((eq) => (
            <button
              key={eq.id}
              onClick={() => setSelectedId(eq.id)}
              className={cn(
                "w-full text-left p-3 rounded-md border transition-all",
                selectedId === eq.id
                  ? "border-brass-400/60 bg-brass-gradient-subtle shadow-brass-glow"
                  : "border-space-700 bg-space-800/60 hover:border-space-600",
              )}
            >
              <div className="flex items-center gap-2">
                <Camera
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    selectedId === eq.id ? "text-brass-300" : "text-space-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-space-100 truncate">
                    {eq.brand} {eq.model}
                  </div>
                  <div className="text-[10px] font-mono text-space-500 mt-0.5">
                    {eq.serialNumber}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {selected ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex min-w-0">
          <div className="w-1/2 border-r border-brass-500/15 flex flex-col min-w-0">
            <div className="p-4 grid grid-cols-2 gap-3 border-b border-brass-500/10">
              <div className="card-panel p-4">
                <div className="text-[10px] font-mono tracking-widest text-space-500 mb-2">SHUTTER COUNT</div>
                <div className="text-4xl font-mono font-bold text-brass-gradient mb-1">{formatShutter(watch("shutterCount"))}</div>
                <input type="number" {...register("shutterCount", { valueAsNumber: true })}
                  className="mt-2 w-full px-2 py-1 text-sm bg-space-900 border border-space-600 rounded text-space-100 focus:border-brass-500 focus:outline-none" />
              </div>
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleShutterDrop}
                className={cn("card-panel p-4 flex flex-col items-center justify-center border-2 border-dashed transition-colors cursor-pointer", shutterPhoto ? "border-brass-400/40" : "border-space-600 hover:border-brass-500/50")}>
                {shutterPhoto ? (
                  <div className="w-full h-full relative">
                    <img src={shutterPhoto.url} alt="shutter" className="w-full h-28 object-cover rounded" />
                    <button type="button" onClick={() => setShutterPhoto(null)} className="absolute top-1 right-1 p-1 bg-space-900/80 rounded text-space-300 hover:text-signal-red"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                    <div className="text-center">
                      <UploadCloud className="w-8 h-8 mx-auto mb-2 text-space-500" />
                      <div className="text-xs text-space-400">拖拽快门数照片</div>
                    </div>
                  )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono tracking-widest text-space-500">霉斑照片 · {moldPhotos.length}</span>
                <span className="text-[10px] text-brass-400">已标记 {checkedMolds.size} 处</span>
              </div>
              <div className={cn("h-[calc(100%-2rem)] border-2 border-dashed rounded-md p-3 overflow-y-auto scrollbar-thin",
                moldPhotos.length === 0 ? "border-space-600" : "border-brass-500/20")}
                onDragOver={(e) => e.preventDefault()} onDrop={handleMoldDrop}>
                {moldPhotos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ImagePlus className="w-10 h-10 mb-2 text-space-500" />
                    <div className="text-sm text-space-400">拖拽霉斑照片到此处</div>
                    <div className="text-[10px] text-space-600 mt-1">支持多选，点击缩略图标记霉斑</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <AnimatePresence>
                      {moldPhotos.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, delay: i * 0.03 }}
                          className="relative group aspect-square rounded overflow-hidden border border-space-600 cursor-pointer" onClick={() => onMoldClick(p.id)}>
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                          <div className={cn("absolute inset-0 transition-all", checkedMolds.has(p.id) ? "bg-brass-400/20 ring-2 ring-inset ring-brass-400" : "group-hover:bg-space-900/30")}>
                            {checkedMolds.has(p.id) && <div className="absolute top-1 left-1 w-5 h-5 bg-brass-gradient rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-space-900" /></div>}
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeMold(p.id); }} className="absolute top-1 right-1 p-1 bg-space-900/80 rounded text-space-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-signal-red"><Trash2 className="w-3 h-3" /></button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-1/2 flex flex-col min-w-0 relative">
            <div className="p-4 space-y-4 flex-1 overflow-y-auto scrollbar-thin pb-24">
              <div className="card-panel">
                <div className="px-4 py-3 border-b border-brass-500/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-brass-200">跑焦检测</span>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" {...register("focusPassed")} className="w-3.5 h-3.5 accent-brass-500" /><span className={watch("focusPassed") ? "text-signal-green" : "text-signal-red"}>{watch("focusPassed") ? "通过" : "不通过"}</span></label>
                </div>
                <div className="p-4 space-y-2">
                  {[{ k: "centerSharp", l: "中心锐度", i: <Crosshair className="w-3.5 h-3.5" /> },
                    { k: "edgeSharp", l: "边缘锐度", i: <Focus className="w-3.5 h-3.5" /> },
                    { k: "infinityFocus", l: "无穷远合焦", i: <Mountain className="w-3.5 h-3.5" /> }].map(({ k, l, i }) => (
                    <label key={k} className="flex items-center justify-between p-2 rounded bg-space-900/60">
                      <span className="flex items-center gap-2 text-sm text-space-300">{i}{l}</span>
                      <input type="checkbox" {...register(k as any)} className="w-4 h-4 accent-brass-500" />
                    </label>
                  ))}
                  <textarea {...register("focusNote")} rows={2} placeholder="检测备注..."
                    className="mt-2 w-full px-3 py-2 text-sm bg-space-900 border border-space-600 rounded text-space-100 placeholder-space-500 focus:border-brass-500 focus:outline-none resize-none" />
                </div>
              </div>

              <div className="card-panel">
                <div className="px-4 py-3 border-b border-brass-500/10 flex items-center gap-2 text-xs font-semibold text-brass-200">
                  <Package className="w-3.5 h-3.5" />配件核对
                </div>
                <div className="p-4 space-y-2">
                  {Object.keys(accessories).length === 0 ? (
                    <div className="text-xs text-space-500 py-2 text-center">无配件清单</div>
                  ) : (
                    Object.entries(accessories).map(([item, v]) => {
                      const val = v as { present: boolean; condition: string };
                      return (
                        <div key={item} className="flex items-center gap-3 p-2 rounded bg-space-900/60">
                          <span className="text-sm text-space-200 flex-1 min-w-0 truncate">{item}</span>
                          <label className="flex items-center gap-1.5 text-xs text-space-400 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={val.present}
                              onChange={(e) =>
                                setAccessories((p) => ({
                                  ...p,
                                  [item]: { ...p[item], present: e.target.checked },
                                }))
                              }
                              className="w-3.5 h-3.5 accent-brass-500"
                            />
                            {val.present ? (
                              <CheckCircle2 className="w-3 h-3 text-signal-green" />
                            ) : (
                              <X className="w-3 h-3 text-signal-red" />
                            )}
                          </label>
                          <input
                            value={val.condition}
                            onChange={(e) =>
                              setAccessories((p) => ({
                                ...p,
                                [item]: { ...p[item], condition: e.target.value },
                              }))
                            }
                            placeholder="成色备注"
                            className="w-24 px-2 py-1 text-xs bg-space-800 border border-space-600 rounded text-space-100 placeholder-space-600 focus:border-brass-500 focus:outline-none"
                          />
                      </div>
                    ); })
                  )}
                </div>
              </div>

              <div className="card-panel">
                <div className="px-4 py-3 border-b border-brass-500/10 flex items-center gap-2 text-xs font-semibold text-brass-200">
                  <ShieldCheck className="w-3.5 h-3.5" />瑕疵等级
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  {DEFECT_GRADES.map((g) => {
                    const c = gradeColor(g);
                    const sel = watch("defectGrade") === g;
                    return (
                      <button key={g} type="button" onClick={() => setValue("defectGrade", g)}
                        className={cn("flex-1 flex flex-col items-center py-2.5 rounded-md border transition-all",
                          sel ? "bg-brass-gradient-subtle border-brass-400/60 shadow-brass-glow" : `${c.bg} ${c.border} hover:brightness-110`)}>
                        <span className={cn("w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-lg", c.bg, c.text, c.border, sel && "border")}>{g}</span>
                        <span className={cn("text-[10px] mt-1", sel ? "text-brass-200" : "text-space-500")}>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card-panel">
                <div className="px-4 py-3 border-b border-brass-500/10 flex items-center gap-2 text-xs font-semibold text-brass-200">
                  <FileText className="w-3.5 h-3.5" />检测结论
                </div>
                <div className="p-4">
                  <textarea {...register("conclusion")} rows={4} placeholder="详细描述设备整体状况..."
                    className="w-full px-3 py-2 text-sm bg-space-900 border border-space-600 rounded text-space-100 placeholder-space-500 focus:border-brass-500 focus:outline-none resize-none" />
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 p-4 bg-space-900/95 border-t border-brass-500/10 backdrop-blur">
              <div className="max-w-md ml-auto">
                <Button type="submit" size="lg" icon={<Send className="w-4 h-4" />} className="w-full">提交检测报告</Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex-1 flex items-center justify-center text-space-500">请选择设备</div>
      )}
    </div>
  );
}
