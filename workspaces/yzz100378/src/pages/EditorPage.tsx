import { useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Save, Download, Upload, RotateCcw, Play } from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { getAllLevels } from "@/utils/levelPresets"
import { saveCustomLevel } from "@/utils/levelPresets"
import EditorCanvas from "@/components/editor/EditorCanvas"
import EditorToolbar from "@/components/editor/EditorToolbar"
import FlowConfig from "@/components/editor/FlowConfig"
import EventConfig from "@/components/editor/EventConfig"

export default function EditorPage() {
  const navigate = useNavigate()
  const { levelId } = useParams()
  const level = useEditorStore(s => s.level)
  const setLevelName = useEditorStore(s => s.setLevelName)
  const setStationName = useEditorStore(s => s.setStationName)
  const setDifficulty = useEditorStore(s => s.setDifficulty)
  const setTimeLimit = useEditorStore(s => s.setTimeLimit)
  const setMaxGuides = useEditorStore(s => s.setMaxGuides)
  const setMaxFences = useEditorStore(s => s.setMaxFences)
  const setGridSize = useEditorStore(s => s.setGridSize)
  const exportLevel = useEditorStore(s => s.exportLevel)
  const resetEditor = useEditorStore(s => s.resetEditor)
  const loadLevel = useEditorStore(s => s.loadLevel)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    const config = exportLevel()
    if (!config) {
      alert("请填写关卡名称和站点名称")
      return
    }
    saveCustomLevel(config)
    alert("关卡已保存")
  }

  const handleExport = () => {
    const config = exportLevel()
    if (!config) return
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${config.name || "level"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string)
        loadLevel(config)
      } catch {
        alert("导入失败：无效的 JSON 文件")
      }
    }
    reader.readAsText(file)
  }

  const handleTestPlay = () => {
    const config = exportLevel()
    if (!config) {
      alert("请填写关卡名称和站点名称")
      return
    }
    saveCustomLevel(config)
    navigate(`/game/${config.id}`)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <EditorToolbar />
      <EditorCanvas />
      <div className="w-64 overflow-y-auto border-l border-white/10 bg-[#141830] p-3">
        <h2 className="mb-3 text-sm font-bold text-white">关卡配置</h2>

        <div className="space-y-2">
          <label className="block text-[10px] text-gray-500">
            关卡名称
            <input
              value={level.name || ""}
              onChange={e => setLevelName(e.target.value)}
              className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              placeholder="例：西直门站·初级"
            />
          </label>
          <label className="block text-[10px] text-gray-500">
            站点名称
            <input
              value={level.stationName || ""}
              onChange={e => setStationName(e.target.value)}
              className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              placeholder="例：西直门站"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1 text-[10px] text-gray-500">
              难度
              <select
                value={level.difficulty || 1}
                onChange={e => setDifficulty(parseInt(e.target.value) as any)}
                className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              >
                {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex-1 text-[10px] text-gray-500">
              时限(秒)
              <input
                type="number" min={30} max={300}
                value={level.timeLimit || 120}
                onChange={e => setTimeLimit(parseInt(e.target.value))}
                className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-[10px] text-gray-500">
              引导员上限
              <input
                type="number" min={1} max={20}
                value={level.maxGuides || 5}
                onChange={e => setMaxGuides(parseInt(e.target.value))}
                className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              />
            </label>
            <label className="flex-1 text-[10px] text-gray-500">
              围栏上限
              <input
                type="number" min={1} max={50}
                value={level.maxFences || 20}
                onChange={e => setMaxFences(parseInt(e.target.value))}
                className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-[10px] text-gray-500">
              网格列数
              <input
                type="number" min={10} max={40}
                value={level.gridSize?.cols || 20}
                onChange={e => setGridSize(parseInt(e.target.value), level.gridSize?.rows || 15)}
                className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              />
            </label>
            <label className="flex-1 text-[10px] text-gray-500">
              网格行数
              <input
                type="number" min={8} max={30}
                value={level.gridSize?.rows || 15}
                onChange={e => setGridSize(level.gridSize?.cols || 20, parseInt(e.target.value))}
                className="mt-0.5 w-full rounded bg-[#1a1f36] px-2 py-1 text-xs text-white border border-white/10"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 border-t border-white/5 pt-3">
          <FlowConfig />
        </div>

        <div className="mt-4 border-t border-white/5 pt-3">
          <EventConfig />
        </div>

        <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#457b9d] py-2 text-xs font-medium text-white hover:bg-[#457b9d]/80"
          >
            <Save className="h-3.5 w-3.5" /> 保存关卡
          </button>
          <button
            onClick={handleTestPlay}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#2a9d8f] py-2 text-xs font-medium text-white hover:bg-[#2a9d8f]/80"
          >
            <Play className="h-3.5 w-3.5" /> 试玩
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 py-2 text-xs text-gray-400 hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" /> 导出
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 py-2 text-xs text-gray-400 hover:bg-white/10"
            >
              <Upload className="h-3.5 w-3.5" /> 导入
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
          <button
            onClick={resetEditor}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-white/5 py-2 text-xs text-red-400 hover:bg-red-400/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </button>
        </div>
      </div>
    </div>
  )
}
