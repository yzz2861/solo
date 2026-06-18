import { Download, FileText, ClipboardList, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function ExportPage() {
  const { students, parents, teachers, groups, followupRecords } = useAppStore();
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const exportToCSV = (
    filename: string,
    headers: string[],
    rows: (string | number)[][]
  ) => {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(filename);
    setTimeout(() => setExportSuccess(null), 2000);
  };

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || "未知";

  const getTeacherName = (teacherId: string | null) =>
    teachers.find((t) => t.id === teacherId)?.name || "未分配";

  const getGroupName = (groupId: string | null) =>
    groups.find((g) => g.id === groupId)?.name || "未分组";

  const handleExportDiscussion = () => {
    const headers = [
      "小组名称",
      "负责老师",
      "小组主题",
      "家长姓名",
      "与学生关系",
      "学生姓名",
      "沟通主题",
      "联系电话",
      "到场情况",
      "特殊备注",
      "是否需跟进",
    ];

    const rows: (string | number)[][] = [];

    groups.forEach((group) => {
      const groupParents = parents.filter((p) => p.groupId === group.id);
      if (groupParents.length === 0) {
        rows.push([
          group.name,
          getTeacherName(group.teacherId),
          group.topic,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      } else {
        groupParents.forEach((parent) => {
          rows.push([
            group.name,
            getTeacherName(group.teacherId),
            group.topic,
            parent.name,
            parent.relation,
            getStudentName(parent.studentId),
            parent.topic,
            parent.phone,
            parent.attended ? "已到场" : "未到场",
            parent.specialNote,
            parent.needFollowup ? "是" : "否",
          ]);
        });
      }
    });

    const ungroupedParents = parents.filter((p) => !p.groupId);
    if (ungroupedParents.length > 0) {
      ungroupedParents.forEach((parent) => {
        rows.push([
          "未分组",
          getTeacherName(parent.teacherId),
          "",
          parent.name,
          parent.relation,
          getStudentName(parent.studentId),
          parent.topic,
          parent.phone,
          parent.attended ? "已到场" : "未到场",
          parent.specialNote,
          parent.needFollowup ? "是" : "否",
        ]);
      });
    }

    exportToCSV("家长会座谈安排表.csv", headers, rows);
  };

  const handleExportFollowup = () => {
    const headers = [
      "学生姓名",
      "家长姓名",
      "与学生关系",
      "联系电话",
      "沟通主题",
      "特殊备注",
      "负责老师",
      "跟进状态",
      "上次跟进日期",
      "下次计划日期",
      "跟进方式",
      "跟进记录",
      "所在小组",
    ];

    const needFollowupParents = parents.filter((p) => p.needFollowup);

    const rows: (string | number)[][] = needFollowupParents.map((parent) => {
      const records = followupRecords
        .filter((r) => r.parentId === parent.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const latestRecord = records[0];

      return [
        getStudentName(parent.studentId),
        parent.name,
        parent.relation,
        parent.phone,
        parent.topic,
        parent.specialNote,
        getTeacherName(parent.teacherId),
        latestRecord?.status || "待跟进",
        latestRecord?.date || "-",
        latestRecord?.nextPlanDate || "-",
        latestRecord?.type || "-",
        latestRecord?.note || "-",
        getGroupName(parent.groupId),
      ];
    });

    exportToCSV("家长会跟进清单.csv", headers, rows);
  };

  const handleExportAll = () => {
    handleExportDiscussion();
    setTimeout(() => handleExportFollowup(), 500);
  };

  const stats = {
    totalParents: parents.length,
    attended: parents.filter((p) => p.attended).length,
    needFollowup: parents.filter((p) => p.needFollowup).length,
    groups: groups.length,
    grouped: parents.filter((p) => p.groupId).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 font-serif">
          导出中心
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          导出座谈安排表和跟进清单，方便打印和存档
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="家长总数"
          value={stats.totalParents}
          color="primary"
          icon={<FileText size={20} />}
        />
        <StatCard
          label="已到场"
          value={stats.attended}
          color="success"
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          label="需跟进"
          value={stats.needFollowup}
          color="warning"
          icon={<ClipboardList size={20} />}
        />
        <StatCard
          label="小组数"
          value={stats.groups}
          color="primary"
          icon={<FileText size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-500 flex-shrink-0">
              <FileText size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-neutral-800 mb-1">
                座谈安排表
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                导出各小组的详细安排，包括小组信息、家长名单、沟通主题等，方便打印和现场使用。
              </p>
              <ul className="text-xs text-neutral-500 space-y-1 mb-4">
                <li>• 按小组分组展示</li>
                <li>• 包含家长姓名、学生姓名、联系方式</li>
                <li>• 包含到场情况和特殊备注</li>
              </ul>
              <button
                onClick={handleExportDiscussion}
                className="btn-primary w-full"
              >
                <Download size={18} />
                导出座谈表
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-warning-100 rounded-2xl flex items-center justify-center text-warning-500 flex-shrink-0">
              <ClipboardList size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-neutral-800 mb-1">
                跟进清单
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                导出所有需要跟进的家庭清单，包括跟进状态、负责老师、跟进记录等。
              </p>
              <ul className="text-xs text-neutral-500 space-y-1 mb-4">
                <li>• 仅包含需跟进的家庭</li>
                <li>• 包含跟进状态和最新记录</li>
                <li>• 包含负责老师和联系方式</li>
              </ul>
              <button
                onClick={handleExportFollowup}
                className="btn-secondary w-full"
              >
                <Download size={18} />
                导出跟进清单
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">一键导出全部</h3>
            <p className="text-sm text-white/80">
              同时导出座谈安排表和跟进清单
            </p>
          </div>
          <button
            onClick={handleExportAll}
            className="bg-white text-primary-600 hover:bg-white/90 px-6 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-xl"
          >
            <Download size={18} className="inline mr-2" />
            全部导出
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="fixed bottom-8 right-8 bg-success-500 text-white px-5 py-3 rounded-xl shadow-lg animate-bounce-in flex items-center gap-2">
          <CheckCircle2 size={20} />
          <span>已导出：{exportSuccess}</span>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: "primary" | "success" | "warning" | "danger";
  icon: React.ReactNode;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-800">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
