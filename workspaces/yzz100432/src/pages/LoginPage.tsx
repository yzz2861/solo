import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TreePine, User, Shield, Wrench, Users } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

interface RoleOption {
  id: "admin" | "gardener" | "supervisor";
  label: string;
  description: string;
  icon: typeof User;
  color: string;
  hoverColor: string;
}

const roles: RoleOption[] = [
  {
    id: "admin",
    label: "物业管理员",
    description: "管理修剪方案、导出任务清单",
    icon: Shield,
    color: "from-forest-500 to-forest-700",
    hoverColor: "hover:border-forest-400 hover:shadow-forest-500/20",
  },
  {
    id: "gardener",
    label: "园林施工队",
    description: "执行修剪任务、上传复查照片",
    icon: Wrench,
    color: "from-sky-500 to-sky-700",
    hoverColor: "hover:border-sky-400 hover:shadow-sky-500/20",
  },
  {
    id: "supervisor",
    label: "主管",
    description: "审核方案、安排雨后复查",
    icon: Users,
    color: "from-warning-500 to-warning-700",
    hoverColor: "hover:border-warning-400 hover:shadow-warning-500/20",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAppStore();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleLogin = (roleId: "admin" | "gardener" | "supervisor") => {
    setSelectedRole(roleId);
    setTimeout(() => {
      login(roleId);
      const defaultRoute = roleId === "gardener" ? "/tasks" : "/preview";
      navigate(defaultRoute);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 via-white to-sky-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-forest-500 to-forest-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-forest-500/20">
            <TreePine className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            园区树木修剪预览系统
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            智能3D预览，科学规划修剪方案，平衡景观效果与功能需求
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const isDisabled = selectedRole !== null && !isSelected;

            return (
              <button
                key={role.id}
                onClick={() => handleLogin(role.id)}
                disabled={isDisabled}
                className={`group p-6 bg-white rounded-2xl border-2 border-gray-100 
                  ${role.hoverColor} 
                  ${isSelected ? "border-transparent scale-[0.98] opacity-80" : "transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"}
                  ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  text-left`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${role.color} rounded-xl 
                      flex items-center justify-center shadow-lg ${
                      isSelected ? "animate-pulse" : "group-hover:shadow-xl transition-shadow"
                    }`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {role.label}
                    </h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                  <div className="text-gray-300 group-hover:text-forest-400 transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs text-gray-500 shadow-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>系统运行正常 · 夏季修剪高峰期</span>
          </div>
        </div>
      </div>
    </div>
  );
}
