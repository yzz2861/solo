import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, FolderKanban, Calendar, MessageSquare, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Empty from '@/components/ui/Empty';

export default function Projects() {
  const navigate = useNavigate();
  const { projects, loadProjects, createProject, deleteProject } = useProjectStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project = await createProject(newName.trim());
    setNewName('');
    setShowCreate(false);
    navigate(`/projects/${project.id}/import`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget);
    setDeleteTarget(null);
    setShowDelete(false);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (projects.length === 0 && !showCreate) {
    return (
      <div className="min-h-screen bg-[#0D1117] px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              New Project
            </Button>
          </div>
          <Empty
            icon={<FolderKanban className="h-12 w-12" />}
            title="No Projects Yet"
            description="Create your first project to start mining risks from survey responses."
          />
        </div>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project" size="sm">
          <div className="space-y-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name"
              className="w-full rounded-lg border border-[#1E3A5F] bg-[#0D1117] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/50"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => navigate(`/projects/${project.id}/import`)}
              className="group relative cursor-pointer rounded-xl border border-[#1E3A5F] bg-[#16213E] p-5 transition-shadow hover:shadow-lg hover:shadow-[#F59E0B]/5"
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(project.id);
                    setShowDelete(true);
                  }}
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mb-3 text-base font-semibold text-white pr-8 truncate">
                {project.name}
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{project.responseCount} responses</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{project.riskCount} risks</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project" size="sm">
        <div className="space-y-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Project name"
            className="w-full rounded-lg border border-[#1E3A5F] bg-[#0D1117] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/50"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Project" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete this project? All responses and risks will be permanently removed.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
