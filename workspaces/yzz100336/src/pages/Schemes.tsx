import { useNavigate } from 'react-router-dom'
import { useSchemeStore } from '@/stores/schemeStore'
import { Plus, FolderOpen, Copy, Trash2, Download } from 'lucide-react'

export default function Schemes() {
  const navigate = useNavigate()
  const schemes = useSchemeStore((s) => s.schemes)
  const createScheme = useSchemeStore((s) => s.createScheme)
  const deleteScheme = useSchemeStore((s) => s.deleteScheme)
  const duplicateScheme = useSchemeStore((s) => s.duplicateScheme)
  const setCurrentSchemeId = useSchemeStore((s) => s.setCurrentSchemeId)

  const schemeList = Object.values(schemes).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const handleCreate = () => {
    const name = window.prompt('请输入方案名称', '新方案')
    if (name) {
      const id = createScheme(name)
      setCurrentSchemeId(id)
      navigate('/editor')
    }
  }

  const handleOpen = (id: string) => {
    setCurrentSchemeId(id)
    navigate('/editor')
  }

  const handleDuplicate = (id: string) => {
    const original = schemes[id]
    if (!original) return
    duplicateScheme(id, `${original.name} (副本)`)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('确定删除该方案？')) {
      deleteScheme(id)
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#0f0f1a] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">方案管理</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-amber-400"
        >
          <Plus size={16} />
          新建方案
        </button>
      </div>

      {schemeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-gray-500">
          <FolderOpen size={48} className="mb-4 opacity-40" />
          <p className="mb-4 text-lg">暂无方案</p>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-amber-400"
          >
            <Plus size={16} />
            新建方案
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {schemeList.map((scheme) => (
            <div
              key={scheme.id}
              className="rounded-xl bg-gray-900 p-4 transition hover:shadow-lg"
            >
              <h3 className="mb-2 text-sm font-semibold text-gray-200">{scheme.name}</h3>
              <p className="mb-1 text-xs text-gray-500">
                创建于 {new Date(scheme.createdAt).toLocaleDateString('zh-CN')}
              </p>
              <p className="mb-3 text-xs text-gray-500">
                商品数: {scheme.placements.length} · 层数: {scheme.shelf.layers.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpen(scheme.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-amber-400 hover:bg-gray-800"
                >
                  <FolderOpen size={12} />
                  打开编辑
                </button>
                <button
                  onClick={() => handleDuplicate(scheme.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800"
                >
                  <Copy size={12} />
                  复制方案
                </button>
                <button
                  onClick={() => navigate(`/export/${scheme.id}`)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-400 hover:bg-gray-800"
                >
                  <Download size={12} />
                  导出
                </button>
                <button
                  onClick={() => handleDelete(scheme.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-gray-800"
                >
                  <Trash2 size={12} />
                  删除方案
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
