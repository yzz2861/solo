import { User, Settings, Bell, Shield, TreePine, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const roleLabels: Record<string, string> = {
  admin: "物业管理员",
  gardener: "园林施工队",
  supervisor: "主管",
};

const roleDescriptions: Record<string, string> = {
  admin: "负责管理修剪方案、导出任务清单、协调各部门工作",
  gardener: "负责执行修剪任务、上传复查照片、确保修剪质量",
  supervisor: "负责审核方案、安排复查任务、监督工作质量",
};

export function ProfilePage() {
  const { user, role, tasks, pruningSchemes, recheckRecords } = useAppStore();

  if (!user) return null;

  const myTasks = tasks.filter(t => t.assignee === user.id);
  const myCompletedTasks = myTasks.filter(t => t.status === "completed");
  const myPendingTasks = myTasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const myRechecks = recheckRecords.filter(r => r.assigneeId === user.id);

  const stats = role === "gardener" ? [
    { label: "我的任务", value: myTasks.length, icon: TreePine, color: "bg-forest-100 text-forest-600" },
    { label: "已完成", value: myCompletedTasks.length, icon: CheckCircle, color: "bg-green-100 text-green-600" },
    { label: "进行中", value: myPendingTasks.length, icon: Clock, color: "bg-sky-100 text-sky-600" },
    { label: "复查记录", value: myRechecks.length, icon: AlertTriangle, color: "bg-warning-100 text-warning-600" },
  ] : [
    { label: "方案总数", value: pruningSchemes.length, icon: TreePine, color: "bg-forest-100 text-forest-600" },
    { label: "任务总数", value: tasks.length, icon: CheckCircle, color: "bg-green-100 text-green-600" },
    { label: "复查记录", value: recheckRecords.length, icon: Clock, color: "bg-sky-100 text-sky-600" },
    { label: "待复查", value: tasks.filter(t => t.status === "needs_review").length, icon: AlertTriangle, color: "bg-warning-100 text-warning-600" },
  ];

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-card p-8 mb-6">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-forest-400 to-forest-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl">{user.avatar || "🌳"}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                <span className="px-3 py-1 bg-forest-100 text-forest-700 rounded-full text-sm font-medium">
                  {roleLabels[role || ""]}
                </span>
              </div>
              <p className="text-gray-500 mb-4">{roleDescriptions[role || ""]}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span>ID: {user.id}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-warning-600" />
              </div>
              <h3 className="font-semibold text-gray-800">通知设置</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">任务提醒</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-500" />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">复查提醒</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-500" />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">雨天预警</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-500" />
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-sky-600" />
              </div>
              <h3 className="font-semibold text-gray-800">系统信息</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">系统版本</span>
                <span className="text-sm font-medium text-gray-800">v1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">最后登录</span>
                <span className="text-sm font-medium text-gray-800">
                  {format(new Date(), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">数据存储</span>
                <span className="text-sm font-medium text-gray-800">本地存储</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">当前季节</span>
                <span className="text-sm font-medium text-warning-600">夏季（修剪高峰期）</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-forest-50 to-sky-50 rounded-2xl p-6 border border-forest-100">
          <div className="flex items-center gap-3 mb-3">
            <TreePine className="w-6 h-6 text-forest-600" />
            <h3 className="font-semibold text-forest-800">夏季修剪小贴士</h3>
          </div>
          <ul className="space-y-2 text-sm text-forest-700">
            <li className="flex items-start gap-2">
              <span className="text-forest-500 mt-0.5">•</span>
              <span>夏季树木生长旺盛，建议每2周检查一次路灯遮挡情况</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-forest-500 mt-0.5">•</span>
              <span>修剪时注意保留树木自然形态，避免过度修剪影响景观效果</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-forest-500 mt-0.5">•</span>
              <span>雨后及时检查树木倾斜情况，防止倒伏风险</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-forest-500 mt-0.5">•</span>
              <span>行人净空高度建议不低于2.5米，确保通行安全</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
