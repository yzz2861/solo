import { useState, useEffect } from 'react';
import { callApi } from '../utils';
import type { Doctor, Department } from '../../shared/types';

export default function DoctorManagePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filterDep, setFilterDep] = useState<string>('');
  const [alert, setAlert] = useState<{ type: 'info' | 'warn' | 'error'; msg: string } | null>(null);

  async function load() {
    const deps = await callApi<Department[]>((a) => a.getDepartments());
    setDepartments(deps);
    const docs = await callApi<Doctor[]>((a) => a.getDoctors());
    setDoctors(docs);
  }

  useEffect(() => {
    load();
  }, []);

  function showAlert(type: 'info' | 'warn' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  }

  async function toggleActive(doctor: Doctor) {
    const active = doctor.isActive === 0;
    const msg = active
      ? `确认恢复 ${doctor.name} 医生的接诊？`
      : `确认停诊 ${doctor.name} 医生？停诊后将不能继续叫号到该诊室。`;
    const ok = await callApi<boolean>((a) => a.showConfirm(msg));
    if (!ok) return;
    try {
      await callApi<boolean>((a) => a.setDoctorActive(doctor.id, active));
      showAlert('info', `${doctor.name} ${active ? '已恢复接诊' : '已停诊'}`);
      load();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  const filtered = filterDep
    ? doctors.filter((d) => String(d.departmentId) === filterDep)
    : doctors;
  const depMap = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div>
      <div className="page-title">👨‍⚕️ 医生排班管理</div>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <div className="card">
        <div className="filter-bar">
          <select
            className="select"
            value={filterDep}
            onChange={(e) => setFilterDep(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">全部科室</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            共 {filtered.length} 位医生 · 停诊 {filtered.filter((d) => d.isActive === 0).length} 位
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">暂无医生</div>
        ) : (
          filtered.map((d) => (
            <div key={d.id} className={`doctor-card ${d.isActive === 0 ? 'inactive' : ''}`}>
              <div className="doctor-info">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: d.isActive === 1 ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {d.name.charAt(0)}
                </div>
                <div>
                  <div className="doctor-name">
                    {d.name}
                    {d.isActive === 0 && (
                      <span className="tag tag-cancelled" style={{ marginLeft: 6 }}>
                        已停诊
                      </span>
                    )}
                  </div>
                  <div className="doctor-meta">
                    {depMap.get(d.departmentId)} · {d.title || '医师'}
                  </div>
                </div>
              </div>
              <button
                className={`btn btn-sm ${d.isActive === 1 ? 'btn-warn' : 'btn-success'}`}
                onClick={() => toggleActive(d)}
              >
                {d.isActive === 1 ? '🚫 停诊' : '✅ 恢复接诊'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title">💡 说明</div>
        <ul style={{ paddingLeft: 18, color: '#4b5563', lineHeight: 1.9, fontSize: 13 }}>
          <li>医生停诊后，挂号时不会出现在可选医生列表</li>
          <li>已挂号到停诊医生的患者，前台需手动"改医生"转至其他医生</li>
          <li>叫号时若该医生已停诊，系统会提示无法继续叫号</li>
          <li>午休或医生临时出诊时可使用停诊功能</li>
        </ul>
      </div>
    </div>
  );
}
