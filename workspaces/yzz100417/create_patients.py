content = '''import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, User, Phone, FileText, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type { Patient, PatientAttachment } from '../../shared/types.js';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PatientDetail {
  patient: Patient;
  bindings: PatientAttachment[];
  followUps: any[];
}

interface PatientWithStats extends Patient {
  bindingCount: number;
  hasMissing: boolean;
  upcomingFollowUp: string | null;
}

export default function Patients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientDetails, setPatientDetails] = useState<Map<string, PatientDetail>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        setSearchParams({ search: searchQuery });
      } else {
        setSearchParams.delete('search');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  async function loadPatients() {
    try {
      setLoading(true);
      const res = await apiClient.get<Patient[]>('/patients');
      if (res.success) {
        setPatients(res.data);
        for (const p of res.data) {
          try {
            const detailRes = await apiClient.get<PatientDetail>(`/patients/${p.id}`);
            if (detailRes.success) {
              setPatientDetails((prev) => new Map(prev).set(p.id, detailRes.data));
            }
          } catch (e) {
            console.error('Failed to load patient detail:', p.id, e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load patients:', e);
    } finally {
      setLoading(false);
    }
  }

  const patientsWithStats: PatientWithStats[] = useMemo(() => {
    return patients.map((p) => {
      const detail = patientDetails.get(p.id);
      const bindings = detail?.bindings || [];
      const hasMissing = bindings.some((b) => b.missing_reason);
      const upcomingFollowUp = bindings
        .filter((b) => b.follow_up_date)
        .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())[0]?.follow_up_date || null;
      return {
        ...p,
        bindingCount: bindings.length,
        hasMissing,
        upcomingFollowUp,
      };
    });
  }, [patients, patientDetails]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patientsWithStats;
    const q = searchQuery.toLowerCase();
    return patientsWithStats.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.treatment_plan && p.treatment_plan.toLowerCase().includes(q))
    );
  }, [patientsWithStats, searchQuery]);

  const stats = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      total: patientsWithStats.length,
      hasMissing: patientsWithStats.filter((p) => p.hasMissing).length,
      upcoming: patientsWithStats.filter(
        (p) =>
          p.upcomingFollowUp &&
          new Date(p.upcomingFollowUp) >= today &&
          new Date(p.upcomingFollowUp) <= nextWeek
      ).length,
    };
  }, [patientsWithStats]);

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">患者详情</h1>
          <p className="text-gray-500 mt-1">搜索和查看所有患者信息</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-medical-50 flex items-center justify-center">
              <User className="w-5 h-5 text-medical-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总患者数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">存在缺件</p>
              <p className="text-2xl font-bold text-danger-600">{stats.hasMissing}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">即将复诊</p>
              <p className="text-2xl font-bold text-warning-600">{stats.upcoming}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="搜索患者姓名、电话或方案..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            onClick={() => navigate(`/patient/${patient.id}`)}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-medical-200 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-medical-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-medical-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-medical-600 transition-colors">
                    {patient.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone className="w-3 h-3" />
                    <span>{patient.phone || '未填写'}</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-medical-500 transition-colors" />
            </div>

            {patient.treatment_plan && (
              <div className="mt-3 flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-600 line-clamp-2">{patient.treatment_plan}</p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {patient.bindingCount} 条绑定记录
              </span>
              {patient.hasMissing && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-danger-50 text-danger-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  缺件
                </span>
              )}
              {patient.upcomingFollowUp && new Date(patient.upcomingFollowUp) >= new Date() && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(patient.upcomingFollowUp), 'MM月dd日', { locale: zhCN })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-16">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchQuery ? '没有找到匹配的患者' : '暂无患者数据'}
          </p>
        </div>
      )}
    </div>
  );
}
'''

with open('src/pages/Patients.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('File written successfully')
print('Size:', len(content))
