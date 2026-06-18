import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, Play, X, ChevronDown, Download } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { HudPanel } from '@/components/ui/HudPanel';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { WarningBadge } from '@/components/ui/WarningBadge';
import Empty from '@/components/Empty';
import { db } from '@/data/db';
import type { Scenario, AccidentType, Constraint, ConstraintType, TunnelNode } from '@/types';
import { cn } from '@/lib/utils';

const accidentTypeLabels: Record<AccidentType, string> = {
  fire: '火灾',
  flood: '水灾',
  collapse: '塌方',
  gas: '瓦斯',
};

const accidentTypeColors: Record<AccidentType, 'red' | 'cyan' | 'orange'> = {
  fire: 'red',
  flood: 'cyan',
  collapse: 'orange',
  gas: 'orange',
};

const constraintTypeLabels: Record<ConstraintType, string> = {
  closed: '封闭',
  water_depth: '积水深度',
  ventilation: '通风',
  blocked: '阻塞',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Scenarios() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [nodes, setNodes] = useState<TunnelNode[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<AccidentType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    accidentType: 'fire' as AccidentType,
    startNodeId: '',
    endNodeId: '',
    constraints: [] as Constraint[],
  });
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStartDropdownOpen, setIsStartDropdownOpen] = useState(false);
  const [isEndDropdownOpen, setIsEndDropdownOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [scenariosData, nodesData] = await Promise.all([
      db.getAllScenarios(),
      db.getAllNodes(),
    ]);
    setScenarios(scenariosData);
    setNodes(nodesData);
  };

  const filteredScenarios = scenarios.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(searchText.toLowerCase());
    const matchType = filterType === 'all' || s.accidentType === filterType;
    return matchSearch && matchType;
  });

  const openCreateModal = () => {
    setEditingScenario(null);
    setFormData({
      name: '',
      accidentType: 'fire',
      startNodeId: nodes[0]?.id || '',
      endNodeId: nodes[nodes.length - 1]?.id || '',
      constraints: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setFormData({
      name: scenario.name,
      accidentType: scenario.accidentType,
      startNodeId: scenario.startNodeId,
      endNodeId: scenario.endNodeId,
      constraints: [...scenario.constraints],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除该方案吗？')) {
      await db.deleteScenario(id);
      loadData();
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入方案名称');
      return;
    }
    if (!formData.startNodeId || !formData.endNodeId) {
      alert('请选择起点和终点');
      return;
    }

    const now = new Date().toISOString();

    if (editingScenario) {
      await db.updateScenario(editingScenario.id, {
        ...editingScenario,
        ...formData,
      });
    } else {
      const newScenario: Scenario = {
        id: `S-${Date.now()}`,
        ...formData,
        tunnelId: 'T1',
        createdAt: now,
      };
      await db.addScenario(newScenario);
    }

    setIsModalOpen(false);
    loadData();
  };

  const addConstraint = () => {
    const newConstraint: Constraint = {
      id: `C-${Date.now()}`,
      type: 'blocked',
      value: 1,
      threshold: 0,
      description: '',
    };
    setFormData({
      ...formData,
      constraints: [...formData.constraints, newConstraint],
    });
  };

  const updateConstraint = (index: number, field: keyof Constraint, value: any) => {
    const updated = [...formData.constraints];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, constraints: updated });
  };

  const removeConstraint = (index: number) => {
    const updated = formData.constraints.filter((_, i) => i !== index);
    setFormData({ ...formData, constraints: updated });
  };

  const getNodeName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name || nodeId;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PageLayout title="演练方案管理">
      <div className="h-full flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="按名称搜索方案..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan focus:shadow-glow-cyan transition-all"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white hover:border-tech-cyan transition-all min-w-32"
              >
                <span className="text-sm">
                  {filterType === 'all' ? '全部类型' : accidentTypeLabels[filterType]}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {isTypeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-mine-blue-dark border border-metal-gray z-50">
                  {(['all', 'fire', 'flood', 'collapse', 'gas'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilterType(type);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-tech-cyan/10 transition-colors',
                        filterType === type ? 'text-tech-cyan' : 'text-white'
                      )}
                    >
                      {type === 'all' ? '全部类型' : accidentTypeLabels[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <IndustrialButton
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={openCreateModal}
          >
            新建方案
          </IndustrialButton>
        </div>

        {filteredScenarios.length === 0 ? (
          <Empty />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1"
          >
            {filteredScenarios.map((scenario) => (
              <motion.div key={scenario.id} variants={itemVariants}>
                <HudPanel
                  accentColor={accidentTypeColors[scenario.accidentType]}
                  className="h-full flex flex-col"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white truncate flex-1">
                        {scenario.name}
                      </h3>
                      <WarningBadge
                        level={
                          scenario.accidentType === 'fire'
                            ? 'danger'
                            : scenario.accidentType === 'flood'
                            ? 'info'
                            : 'warning'
                        }
                        pulse={false}
                      >
                        {accidentTypeLabels[scenario.accidentType]}
                      </WarningBadge>
                    </div>

                    <div className="text-sm text-gray-400">
                      创建时间：{formatDate(scenario.createdAt)}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">路线：</span>
                      <span className="text-tech-cyan font-medium">
                        {getNodeName(scenario.startNodeId)}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="text-safety-green font-medium">
                        {getNodeName(scenario.endNodeId)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-400">
                      约束条件：{scenario.constraints.length} 条
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-3 border-t border-metal-gray/30">
                      <IndustrialButton
                        size="sm"
                        variant="default"
                        leftIcon={<Edit2 size={14} />}
                        onClick={() => openEditModal(scenario)}
                      >
                        编辑
                      </IndustrialButton>
                      <IndustrialButton
                        size="sm"
                        variant="danger"
                        leftIcon={<Trash2 size={14} />}
                        onClick={() => handleDelete(scenario.id)}
                      >
                        删除
                      </IndustrialButton>
                      <div className="flex-1" />
                      <IndustrialButton
                        size="sm"
                        variant="success"
                        leftIcon={<Play size={14} />}
                        onClick={() => navigate(`/?scenarioId=${scenario.id}`)}
                      >
                        开始推演
                      </IndustrialButton>
                      <IndustrialButton
                        size="sm"
                        variant="default"
                        leftIcon={<Download size={14} />}
                        onClick={() => navigate(`/export?scenarioId=${scenario.id}`)}
                      >
                        导出
                      </IndustrialButton>
                    </div>
                  </div>
                </HudPanel>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <HudPanel
                title={editingScenario ? '编辑方案' : '新建方案'}
                accentColor="cyan"
                className="bg-mine-blue"
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">方案名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入方案名称"
                      className="w-full px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan focus:shadow-glow-cyan transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm text-gray-300 mb-2">事故类型</label>
                      <button
                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white hover:border-tech-cyan transition-all"
                      >
                        <span>{accidentTypeLabels[formData.accidentType]}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {isTypeDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-mine-blue-dark border border-metal-gray z-50">
                          {(['fire', 'flood', 'collapse', 'gas'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                setFormData({ ...formData, accidentType: type });
                                setIsTypeDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full px-4 py-2 text-left hover:bg-tech-cyan/10 transition-colors',
                                formData.accidentType === type ? 'text-tech-cyan' : 'text-white'
                              )}
                            >
                              {accidentTypeLabels[type]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm text-gray-300 mb-2">起点</label>
                      <button
                        onClick={() => setIsStartDropdownOpen(!isStartDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white hover:border-tech-cyan transition-all text-left"
                      >
                        <span className="truncate">{getNodeName(formData.startNodeId)}</span>
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      </button>
                      {isStartDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-mine-blue-dark border border-metal-gray z-50 max-h-48 overflow-auto">
                          {nodes.map((node) => (
                            <button
                              key={node.id}
                              onClick={() => {
                                setFormData({ ...formData, startNodeId: node.id });
                                setIsStartDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full px-4 py-2 text-left hover:bg-tech-cyan/10 transition-colors',
                                formData.startNodeId === node.id ? 'text-tech-cyan' : 'text-white'
                              )}
                            >
                              {node.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-sm text-gray-300 mb-2">终点</label>
                      <button
                        onClick={() => setIsEndDropdownOpen(!isEndDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-mine-blue-dark/50 border border-metal-gray text-white hover:border-tech-cyan transition-all text-left"
                      >
                        <span className="truncate">{getNodeName(formData.endNodeId)}</span>
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      </button>
                      {isEndDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-mine-blue-dark border border-metal-gray z-50 max-h-48 overflow-auto">
                          {nodes.map((node) => (
                            <button
                              key={node.id}
                              onClick={() => {
                                setFormData({ ...formData, endNodeId: node.id });
                                setIsEndDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full px-4 py-2 text-left hover:bg-tech-cyan/10 transition-colors',
                                formData.endNodeId === node.id ? 'text-tech-cyan' : 'text-white'
                              )}
                            >
                              {node.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">约束条件配置</label>
                      <IndustrialButton
                        size="sm"
                        variant="default"
                        leftIcon={<Plus size={12} />}
                        onClick={addConstraint}
                      >
                        添加约束
                      </IndustrialButton>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {formData.constraints.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">
                          暂无约束条件，点击上方按钮添加
                        </div>
                      ) : (
                        formData.constraints.map((constraint, index) => (
                          <div
                            key={constraint.id}
                            className="flex items-center gap-2 p-3 bg-mine-blue-dark/50 border border-metal-gray/50"
                          >
                            <select
                              value={constraint.type}
                              onChange={(e) =>
                                updateConstraint(index, 'type', e.target.value as ConstraintType)
                              }
                              className="px-2 py-1.5 bg-mine-blue border border-metal-gray text-white text-sm focus:outline-none focus:border-tech-cyan"
                            >
                              {(['closed', 'water_depth', 'ventilation', 'blocked'] as const).map(
                                (type) => (
                                  <option key={type} value={type}>
                                    {constraintTypeLabels[type]}
                                  </option>
                                )
                              )}
                            </select>
                            <input
                              type="text"
                              value={constraint.description}
                              onChange={(e) =>
                                updateConstraint(index, 'description', e.target.value)
                              }
                              placeholder="约束描述"
                              className="flex-1 px-2 py-1.5 bg-mine-blue border border-metal-gray text-white text-sm placeholder-gray-500 focus:outline-none focus:border-tech-cyan"
                            />
                            <button
                              onClick={() => removeConstraint(index)}
                              className="p-1.5 text-alert-red hover:bg-alert-red/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-metal-gray/30">
                    <IndustrialButton
                      variant="default"
                      leftIcon={<X size={16} />}
                      onClick={() => setIsModalOpen(false)}
                    >
                      取消
                    </IndustrialButton>
                    <IndustrialButton
                      variant="primary"
                      onClick={handleSave}
                    >
                      保存
                    </IndustrialButton>
                  </div>
                </div>
              </HudPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
