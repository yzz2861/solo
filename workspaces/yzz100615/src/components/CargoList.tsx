import { useState } from 'react';
import { Trash2, Edit3, Plus, GripVertical, Check, X } from 'lucide-react';
import type { Cargo, WeightUnit, LengthUnit } from '@/types';
import { formatWeight, formatLength, convertWeight, convertLength } from '@/utils/units';
import { checkCargoOutOfCarriage } from '@/utils/calculator';

interface CargoListProps {
  cargoes: Cargo[];
  carriageLength: number;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onAdd?: (cargo: Omit<Cargo, 'id' | 'color'>) => void;
  onUpdate?: (id: string, updates: Partial<Cargo>) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export default function CargoList({
  cargoes,
  carriageLength,
  weightUnit,
  lengthUnit,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
}: CargoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newWidth, setNewWidth] = useState('');

  const startEdit = (cargo: Cargo) => {
    setEditingId(cargo.id);
    setEditName(cargo.name);
    setEditWeight(convertWeight(cargo.weight, 'kg', weightUnit).toString());
    setEditPosition(convertLength(cargo.position, 'mm', lengthUnit).toString());
    setEditWidth(convertLength(cargo.width, 'mm', lengthUnit).toString());
  };

  const saveEdit = () => {
    if (!editingId) return;
    onUpdate?.(editingId, {
      name: editName,
      weight: convertWeight(parseFloat(editWeight) || 0, weightUnit, 'kg'),
      position: convertLength(parseFloat(editPosition) || 0, lengthUnit, 'mm'),
      width: convertLength(parseFloat(editWidth) || 0, lengthUnit, 'mm'),
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName || !newWeight) return;
    onAdd?.({
      name: newName,
      weight: convertWeight(parseFloat(newWeight) || 0, weightUnit, 'kg'),
      position: convertLength(parseFloat(newPosition) || carriageLength / 2, lengthUnit, 'mm'),
      width: convertLength(parseFloat(newWidth) || 1000, lengthUnit, 'mm'),
    });
    setNewName('');
    setNewWeight('');
    setNewPosition('');
    setNewWidth('');
    setShowAdd(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">货物清单</h3>
        {!readOnly && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            添加货物
          </button>
        )}
      </div>

      {showAdd && !readOnly && (
        <div className="p-3 bg-blue-50 border-b border-blue-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="货物名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder={`重量 (${weightUnit === 'ton' ? '吨' : 'kg'})`}
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder={`位置 (${lengthUnit})`}
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder={`长度 (${lengthUnit})`}
              value={newWidth}
              onChange={(e) => setNewWidth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              确认添加
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {cargoes.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">暂无货物，点击上方按钮添加</div>
        )}

        {cargoes.map((cargo, index) => {
          const { outOfBounds } = checkCargoOutOfCarriage(cargo, carriageLength);
          const isEditing = editingId === cargo.id;
          const isSelected = selectedId === cargo.id;

          return (
            <div
              key={cargo.id}
              className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              } ${outOfBounds ? 'bg-red-50' : ''}`}
              onClick={() => onSelect?.(cargo.id)}
            >
              {!readOnly && <GripVertical size={16} className="text-gray-300 flex-shrink-0" />}

              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: cargo.color }}
              />

              {isEditing ? (
                <div className="flex-1 grid grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={editWidth}
                    onChange={(e) => setEditWidth(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{cargo.name}</div>
                    <div className="text-xs text-gray-500">
                      重量: {formatWeight(cargo.weight, weightUnit, 1)} | 位置:{' '}
                      {formatLength(cargo.position, lengthUnit, 0)}
                    </div>
                  </div>
                  {outOfBounds && (
                    <span className="text-xs text-red-500 font-medium flex-shrink-0">超出</span>
                  )}
                </>
              )}

              {!readOnly && (
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(cargo)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => onRemove?.(cargo.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        共 {cargoes.length} 件货物，总重{' '}
        {formatWeight(
          cargoes.reduce((sum, c) => sum + c.weight, 0),
          weightUnit,
          1,
        )}
      </div>
    </div>
  );
}
