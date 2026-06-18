import type { Transcript } from '@/types'

const STORAGE_KEY = 'heritage_transcripts'

export function listProjects(): Transcript[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    const projects = JSON.parse(data) as Transcript[]
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } catch (error) {
    console.error('读取项目列表失败:', error)
    return []
  }
}

export function getProject(id: string): Transcript | null {
  try {
    const projects = listProjects()
    return projects.find(p => p.id === id) || null
  } catch (error) {
    console.error('获取项目失败:', error)
    return null
  }
}

export function saveProject(project: Transcript): void {
  try {
    const projects = listProjects()
    const existingIndex = projects.findIndex(p => p.id === project.id)
    const updatedProject = { ...project, updatedAt: new Date().toISOString() }

    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject
    } else {
      projects.push(updatedProject)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('保存项目失败:', error)
    throw new Error('保存失败，请检查浏览器存储空间')
  }
}

export function deleteProject(id: string): void {
  try {
    const projects = listProjects()
    const filtered = projects.filter(p => p.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('删除项目失败:', error)
    throw new Error('删除失败')
  }
}

export function exportProject(id: string): string {
  const project = getProject(id)
  if (!project) {
    throw new Error('项目不存在')
  }
  return JSON.stringify(project, null, 2)
}

export function importProject(data: string): Transcript {
  try {
    const project = JSON.parse(data) as Transcript

    if (!project.id || !project.title || !Array.isArray(project.paragraphs)) {
      throw new Error('无效的项目数据格式')
    }

    const existing = getProject(project.id)
    if (existing) {
      project.id = `${project.id}_${Date.now()}`
      project.title = `${project.title} (导入)`
    }

    project.createdAt = new Date().toISOString()
    project.updatedAt = new Date().toISOString()

    saveProject(project)
    return project
  } catch (error) {
    console.error('导入项目失败:', error)
    if (error instanceof SyntaxError) {
      throw new Error('JSON 格式错误，请检查文件内容')
    }
    throw error
  }
}
