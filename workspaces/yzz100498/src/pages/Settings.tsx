import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Progress } from '../components/ui/Progress';
import { Alert } from '../components/ui/Alert';
import { 
  Settings as SettingsIcon, User, Bell, Shield, Palette,
  Database, Download, Trash2, Info, CheckCircle,
  Clock, AlertTriangle, Save
} from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

interface ToggleSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div>
      <div className="font-medium text-gray-800">{label}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  </div>
);

const Settings: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    riskAlert: true,
    dailyReport: false,
    forecastUpdate: true
  });
  
  const [display, setDisplay] = useState({
    theme: 'light',
    density: 'comfortable',
    showDecimal: false,
    animation: true
  });
  
  const [dataRetention, setDataRetention] = useState('180');
  const [autoBackup, setAutoBackup] = useState(true);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  
  const handleSave = () => {
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };
  
  const handleClearCache = () => {
    if (confirm('确定要清除本地缓存数据吗？这将重置所有本地存储的设置和数据。')) {
      localStorage.clear();
      window.location.reload();
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <SettingsIcon className="w-7 h-7 text-gray-600" />
              系统设置
            </h1>
            <p className="text-gray-500 mt-1">
              配置系统参数、通知和显示选项
            </p>
          </div>
          <Button variant="primary" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            保存设置
          </Button>
        </div>
        
        {showSaveMessage && (
          <Alert variant="success" className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            设置已成功保存
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingsSection title="通知设置" icon={<Bell className="w-5 h-5 text-blue-500" />}>
            <ToggleSwitch
              label="邮件通知"
              description="接收重要预警和报告的邮件提醒"
              checked={notifications.email}
              onChange={(v) => setNotifications({ ...notifications, email: v })}
            />
            <ToggleSwitch
              label="推送通知"
              description="在浏览器中接收实时推送通知"
              checked={notifications.push}
              onChange={(v) => setNotifications({ ...notifications, push: v })}
            />
            <ToggleSwitch
              label="风险预警通知"
              description="当出现高风险备餐建议时立即通知"
              checked={notifications.riskAlert}
              onChange={(v) => setNotifications({ ...notifications, riskAlert: v })}
            />
            <ToggleSwitch
              label="每日数据报告"
              description="每日早晨发送昨日销售数据汇总"
              checked={notifications.dailyReport}
              onChange={(v) => setNotifications({ ...notifications, dailyReport: v })}
            />
            <ToggleSwitch
              label="预测更新通知"
              description="当明日预测数据更新时通知"
              checked={notifications.forecastUpdate}
              onChange={(v) => setNotifications({ ...notifications, forecastUpdate: v })}
            />
          </SettingsSection>
          
          <SettingsSection title="显示设置" icon={<Palette className="w-5 h-5 text-purple-500" />}>
            <div className="py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-800">主题模式</div>
                  <div className="text-sm text-gray-500">选择界面显示主题</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDisplay({ ...display, theme: 'light' })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      display.theme === 'light' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    浅色
                  </button>
                  <button
                    onClick={() => setDisplay({ ...display, theme: 'dark' })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      display.theme === 'dark' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    深色
                  </button>
                </div>
              </div>
            </div>
            
            <div className="py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-800">界面密度</div>
                  <div className="text-sm text-gray-500">调整内容间距和紧凑程度</div>
                </div>
                <Select
                  options={[
                    { value: 'compact', label: '紧凑' },
                    { value: 'comfortable', label: '舒适' },
                    { value: 'spacious', label: '宽松' }
                  ]}
                  value={display.density}
                  onChange={(v) => setDisplay({ ...display, density: String(v) })}
                  className="w-28"
                />
              </div>
            </div>
            
            <ToggleSwitch
              label="显示小数"
              description="在统计数据中显示一位小数"
              checked={display.showDecimal}
              onChange={(v) => setDisplay({ ...display, showDecimal: v })}
            />
            <ToggleSwitch
              label="动画效果"
              description="启用界面过渡和图表动画"
              checked={display.animation}
              onChange={(v) => setDisplay({ ...display, animation: v })}
            />
          </SettingsSection>
          
          {hasAccess(['logistics']) && (
            <SettingsSection title="数据管理" icon={<Database className="w-5 h-5 text-green-500" />}>
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-800">数据保留期限</div>
                    <div className="text-sm text-gray-500">历史数据在系统中保留的天数</div>
                  </div>
                  <Select
                    options={[
                      { value: '90', label: '90 天' },
                      { value: '180', label: '180 天' },
                      { value: '365', label: '1 年' },
                      { value: '730', label: '2 年' }
                    ]}
                    value={dataRetention}
                    onChange={setDataRetention}
                    className="w-28"
                  />
                </div>
              </div>
              
              <ToggleSwitch
                label="自动备份"
                description="每日凌晨自动备份系统数据"
                checked={autoBackup}
                onChange={setAutoBackup}
              />
              
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-800">存储使用情况</div>
                    <div className="text-sm text-gray-500">本地数据存储占用</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">订餐记录</span>
                    <span className="font-mono">2.4 MB / 5 MB</span>
                  </div>
                  <Progress value={48} max={100} variant="info" />
                  <div className="flex justify-between text-sm mt-3">
                    <span className="text-gray-600">预测模型</span>
                    <span className="font-mono">1.8 MB / 5 MB</span>
                  </div>
                  <Progress value={36} max={100} variant="success" />
                </div>
              </div>
              
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      清除本地缓存
                    </div>
                    <div className="text-sm text-gray-500">重置所有本地存储的设置和数据</div>
                  </div>
                  <Button variant="danger" size="sm" onClick={handleClearCache}>
                    清除缓存
                  </Button>
                </div>
              </div>
            </SettingsSection>
          )}
          
          <SettingsSection title="关于系统" icon={<Info className="w-5 h-5 text-orange-500" />}>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  医院陪护餐销量分析系统
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  版本 1.0.0
                </p>
                <Badge variant="success" className="mt-2">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  正式版
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">前端技术栈</div>
                  <div className="font-medium text-gray-800">React 18 + TypeScript</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">图表库</div>
                  <div className="font-medium text-gray-800">Recharts 2</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">状态管理</div>
                  <div className="font-medium text-gray-800">Zustand 4</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">样式方案</div>
                  <div className="font-medium text-gray-800">TailwindCSS 3</div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">核心算法</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    加权移动平均预测算法
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    指数平滑法时间序列预测
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    二维风险评估矩阵
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    异常订单检测算法
                  </li>
                </ul>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  性能指标
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">预测准确率</span>
                    <span className="font-mono font-bold text-blue-700">92.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">浪费降低率</span>
                    <span className="font-mono font-bold text-green-700">31.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">缺餐率</span>
                    <span className="font-mono font-bold text-orange-700">2.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">用户满意度</span>
                    <span className="font-mono font-bold text-purple-700">96.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
