import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Layers, 
  FileDown, 
  ClipboardList, 
  Building2,
  GraduationCap,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { UserRole } from "@/types";

export default function Home() {
  const navigate = useNavigate();
  const { currentRole, setCurrentRole, parents, groups, followupRecords } = useAppStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const stats = {
    parents: parents.length,
    groups: groups.length,
    followup: parents.filter(p => p.needFollowup).length,
    ongoing: followupRecords.filter(r => r.status === "进行中" || r.status === "待跟进").length,
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentRole(role);
  };

  const handleEnter = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate("/students");
    }, 300);
  };

  const teacherFeatures = [
    { icon: Users, title: "信息录入", desc: "管理学生、家长和老师信息", path: "/students" },
    { icon: Layers, title: "分组管理", desc: "拖拽式智能分组，实时冲突提醒", path: "/groups" },
    { icon: FileDown, title: "导出中心", desc: "导出座谈表和跟进清单", path: "/export" },
    { icon: ClipboardList, title: "跟进管理", desc: "更新跟进进度和记录", path: "/followup" },
  ];

  const leaderFeatures = [
    ...teacherFeatures,
    { icon: Building2, title: "年级总览", desc: "查看全年级跟进情况", path: "/grade-view" },
  ];

  const features = selectedRole === "班主任" ? teacherFeatures : leaderFeatures;

  return (
    <div className={`min-h-screen transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-success-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-warning-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/30">
              <GraduationCap size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-800 font-serif">
                家长会分组系统
              </h1>
              <p className="text-xs text-neutral-500">座谈管理 · 智能分组 · 跟进关怀</p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-4xl space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 text-primary-600 rounded-full text-sm mb-6">
                <Sparkles size={16} />
                <span>让家长会更高效、更贴心</span>
              </div>
              <h2 className="text-4xl font-bold text-neutral-800 mb-4 font-serif leading-tight">
                请选择您的身份
              </h2>
              <p className="text-neutral-500 max-w-md mx-auto">
                根据您的角色，系统将展示相应的功能模块
              </p>
            </div>

            <div className="flex justify-center gap-6 mb-10">
              <button
                onClick={() => handleRoleSelect("班主任")}
                className={`relative group w-56 p-6 rounded-3xl border-2 transition-all duration-300 ${
                  selectedRole === "班主任"
                    ? "border-primary-500 bg-white shadow-2xl shadow-primary-500/20 scale-105"
                    : "border-neutral-200 bg-white/60 hover:border-primary-300 hover:shadow-lg"
                }`}
              >
                {selectedRole === "班主任" && (
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-all ${
                  selectedRole === "班主任" 
                    ? "bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30" 
                    : "bg-primary-100 text-primary-500 group-hover:bg-primary-200"
                }`}>
                  <Users size={32} />
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">
                  班主任
                </h3>
                <p className="text-xs text-neutral-500">
                  负责班级家长会组织
                </p>
              </button>

              <button
                onClick={() => handleRoleSelect("年级组长")}
                className={`relative group w-56 p-6 rounded-3xl border-2 transition-all duration-300 ${
                  selectedRole === "年级组长"
                    ? "border-primary-500 bg-white shadow-2xl shadow-primary-500/20 scale-105"
                    : "border-neutral-200 bg-white/60 hover:border-primary-300 hover:shadow-lg"
                }`}
              >
                {selectedRole === "年级组长" && (
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-all ${
                  selectedRole === "年级组长" 
                    ? "bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30" 
                    : "bg-primary-100 text-primary-500 group-hover:bg-primary-200"
                }`}>
                  <Building2 size={32} />
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">
                  年级组长
                </h3>
                <p className="text-xs text-neutral-500">
                  查看全年级跟进情况
                </p>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="card p-4 text-center animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="text-3xl font-bold text-primary-600 mb-1">{stats.parents}</div>
                <div className="text-xs text-neutral-500">家长总数</div>
              </div>
              <div className="card p-4 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="text-3xl font-bold text-success-600 mb-1">{stats.groups}</div>
                <div className="text-xs text-neutral-500">小组数量</div>
              </div>
              <div className="card p-4 text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="text-3xl font-bold text-warning-600 mb-1">{stats.followup}</div>
                <div className="text-xs text-neutral-500">需跟进家庭</div>
              </div>
              <div className="card p-4 text-center animate-slide-up" style={{ animationDelay: '250ms' }}>
                <div className="text-3xl font-bold text-danger-600 mb-1">{stats.ongoing}</div>
                <div className="text-xs text-neutral-500">待处理</div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-medium text-neutral-500 mb-4 text-center">
                {selectedRole === "班主任" ? "班主任可用功能" : "年级组长可用功能"}
              </h3>
              <div className={`grid gap-4 ${selectedRole === "年级组长" ? "grid-cols-5" : "grid-cols-4"}`}>
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.path}
                      className="card p-4 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                      onClick={() => {
                        setIsTransitioning(true);
                        setTimeout(() => navigate(feature.path), 300);
                      }}
                      style={{ animationDelay: `${300 + index * 50}ms` }}
                    >
                      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500 mx-auto mb-3 group-hover:bg-primary-100 transition-colors">
                        <Icon size={24} />
                      </div>
                      <h4 className="font-medium text-neutral-800 text-sm mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        {feature.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleEnter}
                className="group px-8 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
              >
                进入系统
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </main>

        <footer className="px-8 py-6 text-center">
          <p className="text-xs text-neutral-400">
            三年级(1)班 · 2026春季家长会 · 用心沟通，陪伴成长
          </p>
        </footer>
      </div>
    </div>
  );
}