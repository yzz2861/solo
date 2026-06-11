import { Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WeightInput } from './WeightInput';
import { PositionInput } from './PositionInput';
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_COLORS } from '../../constants/colors';
import { isLoadBearingDevice, isHoistPoint, isLightRig, isSpeaker } from '../../types/devices';
import { isValidWeightValue } from '../../utils/unitConversion';
import { getDeviceRisks, getRiskLevelColor } from '../../types/safety';

export function PropertyPanel() {
  const { project, selectedDeviceId, updateDevice, removeDevice } = useProjectStore();

  if (!project || !selectedDeviceId) {
    return (
      <Card variant="glass" className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-[#64748b] text-sm text-center">
            选择一个设备查看和编辑属性
          </p>
        </CardContent>
      </Card>
    );
  }

  const device = project.devices.find(d => d.id === selectedDeviceId);
  if (!device) return null;

  const deviceRisks = getDeviceRisks(device.id, project.risks);
  const hasWeightError = isLoadBearingDevice(device) && !isValidWeightValue(device.weight, device.weightUnit);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDevice(device.id, { name: e.target.value });
  };

  const handleWeightChange = (weight: number, unit: any) => {
    updateDevice(device.id, { weight, weightUnit: unit } as any);
  };

  const handlePositionChange = (position: any) => {
    updateDevice(device.id, { position });
  };

  const handleMaxLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateDevice(device.id, { maxLoad: value } as any);
    }
  };

  const handleDelete = () => {
    if (confirm(`确定要删除 ${device.name} 吗？`)) {
      removeDevice(device.id);
    }
  };

  return (
    <Card variant="glass" className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: DEVICE_TYPE_COLORS[device.type] }}
            />
            <CardTitle className="text-base">{DEVICE_TYPE_LABELS[device.type]}</CardTitle>
          </div>
          {deviceRisks.length > 0 && (
            <Badge
              variant="danger"
              size="sm"
            >
              {deviceRisks.length} 项风险
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        <div>
          <Input
            label="设备名称"
            value={device.name}
            onChange={handleNameChange}
          />
        </div>

        <div>
          <PositionInput
            value={device.position}
            onChange={handlePositionChange}
            label="位置坐标 (m)"
          />
        </div>

        {isLoadBearingDevice(device) && (
          <div>
            <WeightInput
              value={device.weight}
              unit={device.weightUnit}
              onChange={handleWeightChange}
              label="设备重量"
              error={hasWeightError}
            />
            {hasWeightError && (
              <p className="text-[10px] text-[#ef4444] mt-1">
                请填写有效重量以进行安全检测
              </p>
            )}
          </div>
        )}

        {isHoistPoint(device) && (
          <div>
            <Input
              label="最大承重 (kg)"
              type="number"
              value={device.maxLoad}
              onChange={handleMaxLoadChange}
              min="0"
              step="10"
            />
            <div className="mt-2 p-2 bg-[#1a1d23] rounded-sm">
              <p className="text-xs text-[#94a3b8]">
                当前承重: <span className="text-[#f8fafc] font-mono">{(device as any).currentLoad?.toFixed(1) || '0.0'} kg</span>
              </p>
            </div>
          </div>
        )}

        {isLightRig(device) && (
          <div>
            <Input
              label="灯具数量"
              type="number"
              value={device.lightCount}
              onChange={(e) => updateDevice(device.id, { lightCount: parseInt(e.target.value) || 0 } as any)}
              min="0"
            />
          </div>
        )}

        {isSpeaker(device) && (
          <div>
            <Input
              label="功率 (W)"
              type="number"
              value={device.power}
              onChange={(e) => updateDevice(device.id, { power: parseInt(e.target.value) || 0 } as any)}
              min="0"
            />
          </div>
        )}

        {deviceRisks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[#94a3b8]">风险提示</h4>
            {deviceRisks.map(risk => (
              <div
                key={risk.id}
                className="p-2 rounded-sm border-l-2"
                style={{
                  backgroundColor: `${getRiskLevelColor(risk.level)}10`,
                  borderColor: getRiskLevelColor(risk.level),
                }}
              >
                <p className="text-xs text-[#f8fafc]">{risk.description}</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">{risk.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <div className="p-4 border-t border-[#3a4150] flex-shrink-0">
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          className="w-full"
        >
          <Trash2 className="w-4 h-4" />
          删除设备
        </Button>
      </div>
    </Card>
  );
}
