import { useState, useEffect } from 'react';
import { callApi } from '../utils';
import type { Patient, Department, Doctor, QueueDetail } from '../../shared/types';

export default function RegistrationPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    idCard: '',
    age: '',
    gender: '' as '' | '男' | '女',
    departmentId: '',
    doctorId: '',
    isUrgent: false,
    urgentReason: '',
    isFollowUp: false,
    followUpNote: '',
  });

  const [alert, setAlert] = useState<{ type: 'info' | 'warn' | 'error'; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<QueueDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const deps = await callApi<Department[]>((a) => a.getDepartments());
        setDepartments(deps);
      } catch (e: any) {
        showAlert('error', '加载科室失败: ' + e.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (form.departmentId) {
      (async () => {
        try {
          const docs = await callApi<Doctor[]>((a) => a.getDoctors(Number(form.departmentId)));
          setDoctors(docs.filter((d) => d.isActive === 1));
          if (docs.length > 0 && !form.doctorId) {
            setForm((f) => ({ ...f, doctorId: String(docs[0].id) }));
          }
        } catch (e: any) {
          showAlert('error', '加载医生失败: ' + e.message);
        }
      })();
    } else {
      setDoctors([]);
    }
  }, [form.departmentId]);

  useEffect(() => {
    if (form.name.trim().length >= 2) {
      const t = setTimeout(() => {
        (async () => {
          try {
            const p = await callApi<Patient | null>((a) =>
              a.findPatient(form.name.trim(), form.phone.trim() || undefined, form.idCard.trim() || undefined)
            );
            setPatient(p);
            if (p) {
              setForm((f) => ({
                ...f,
                phone: p.phone || f.phone,
                idCard: p.idCard || f.idCard,
                age: p.age ? String(p.age) : f.age,
                gender: p.gender || f.gender,
              }));
            }
          } catch {}
        })();
      }, 400);
      return () => clearTimeout(t);
    } else {
      setPatient(null);
    }
  }, [form.name, form.phone, form.idCard]);

  function showAlert(type: 'info' | 'warn' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return showAlert('error', '请输入患者姓名');
    if (!form.departmentId) return showAlert('error', '请选择科室');
    if (!form.doctorId) return showAlert('error', '请选择医生');

    setSubmitting(true);
    try {
      let patientId: number;
      if (patient) {
        const updated = await callApi<Patient>((a) =>
          a.updatePatient(patient.id, {
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            idCard: form.idCard.trim() || undefined,
            age: form.age ? Number(form.age) : undefined,
            gender: (form.gender as '男' | '女') || undefined,
          })
        );
        patientId = updated.id;
      } else {
        const created = await callApi<Patient>((a) =>
          a.createPatient({
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            idCard: form.idCard.trim() || undefined,
            age: form.age ? Number(form.age) : undefined,
            gender: (form.gender as '男' | '女') || undefined,
          })
        );
        patientId = created.id;
      }

      const dup = await callApi<boolean>((a) => a.checkDuplicate(patientId, Number(form.doctorId)));
      if (dup) {
        const ok = await callApi<boolean>((a) =>
          a.showConfirm(`患者 ${form.name} 今日已在该医生处挂号，是否继续挂号？`)
        );
        if (!ok) {
          setSubmitting(false);
          return;
        }
      }

      const detail = await callApi<QueueDetail>((a) =>
        a.addToQueue({
          patientId,
          departmentId: Number(form.departmentId),
          doctorId: Number(form.doctorId),
          isUrgent: form.isUrgent,
          urgentReason: form.urgentReason.trim() || undefined,
          isFollowUp: form.isFollowUp,
          followUpNote: form.followUpNote.trim() || undefined,
        })
      );

      setLastTicket(detail);
      showAlert('info', `挂号成功！号码：${detail.queue.queueNumber}`);

      try {
        await callApi<boolean>((a) => a.printReceipt(detail.queue.id));
      } catch (e: any) {
        showAlert('warn', '打印失败，请手动打印: ' + e.message);
      }

      setForm({
        name: '',
        phone: '',
        idCard: '',
        age: '',
        gender: '',
        departmentId: '',
        doctorId: '',
        isUrgent: false,
        urgentReason: '',
        isFollowUp: false,
        followUpNote: '',
      });
      setPatient(null);
    } catch (e: any) {
      showAlert('error', '挂号失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="two-col">
        <form onSubmit={handleSubmit} className="card">
          <div className="card-title">📝 患者挂号登记</div>

          {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

          {patient && (
            <div className="alert alert-info">
              ℹ️ 已找到该患者历史档案（首次挂号：{patient.createdAt.slice(0, 10)}）
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="label">
                患者姓名<span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="请输入姓名"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="label">手机号</label>
              <input
                className="input"
                placeholder="选填"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">身份证号</label>
              <input
                className="input"
                placeholder="选填"
                value={form.idCard}
                onChange={(e) => setField('idCard', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">年龄</label>
              <input
                className="input"
                type="number"
                placeholder="选填"
                value={form.age}
                onChange={(e) => setField('age', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">性别</label>
              <select
                className="select"
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value as any)}
              >
                <option value="">未选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">
                就诊科室<span className="req">*</span>
              </label>
              <select
                className="select"
                value={form.departmentId}
                onChange={(e) => setField('departmentId', e.target.value)}
              >
                <option value="">请选择科室</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label className="label">
                接诊医生<span className="req">*</span>
              </label>
              <select
                className="select"
                value={form.doctorId}
                onChange={(e) => setField('doctorId', e.target.value)}
                disabled={!form.departmentId || doctors.length === 0}
              >
                <option value="">
                  {form.departmentId
                    ? doctors.length === 0
                      ? '该科室暂无可接诊医生'
                      : '请选择医生'
                    : '请先选择科室'}
                </option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.title ? `(${d.title})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group half">
              <div className="checkbox-group">
                <input
                  id="urgent"
                  type="checkbox"
                  checked={form.isUrgent}
                  onChange={(e) => setField('isUrgent', e.target.checked)}
                />
                <label htmlFor="urgent" className="label" style={{ margin: 0 }}>
                  ⚡ 加急挂号
                </label>
              </div>
              {form.isUrgent && (
                <input
                  className="input"
                  placeholder="加急原因"
                  value={form.urgentReason}
                  onChange={(e) => setField('urgentReason', e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
            <div className="form-group half">
              <div className="checkbox-group">
                <input
                  id="follow"
                  type="checkbox"
                  checked={form.isFollowUp}
                  onChange={(e) => setField('isFollowUp', e.target.checked)}
                />
                <label htmlFor="follow" className="label" style={{ margin: 0 }}>
                  🔄 复诊患者
                </label>
              </div>
              {form.isFollowUp && (
                <input
                  className="input"
                  placeholder="复诊备注"
                  value={form.followUpNote}
                  onChange={(e) => setField('followUpNote', e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setForm({
                  name: '',
                  phone: '',
                  idCard: '',
                  age: '',
                  gender: '',
                  departmentId: '',
                  doctorId: '',
                  isUrgent: false,
                  urgentReason: '',
                  isFollowUp: false,
                  followUpNote: '',
                })
              }
              disabled={submitting}
            >
              清空
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? '挂号中...' : '✅ 挂号并打印'}
            </button>
          </div>
        </form>

        <div>
          {lastTicket && (
            <div className="card">
              <div className="card-title">🎫 最近挂号凭证</div>
              <div className="big-display">
                <div style={{ fontSize: 14, opacity: 0.9 }}>您的号码</div>
                <div className="big-number">{lastTicket.queue.queueNumber.split('-')[2]}</div>
                <div className="big-info">
                  <span>👤 {lastTicket.patient.name}</span>
                  <span>🏥 {lastTicket.department.name}</span>
                  <span>👨‍⚕️ {lastTicket.doctor.name}</span>
                </div>
                {(lastTicket.queue.isUrgent || lastTicket.queue.isFollowUp) && (
                  <div style={{ marginTop: 10 }}>
                    {lastTicket.queue.isUrgent && (
                      <span className="tag tag-urgent" style={{ marginRight: 6 }}>
                        ⚡ 加急
                      </span>
                    )}
                    {lastTicket.queue.isFollowUp && (
                      <span className="tag tag-follow">🔄 复诊</span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => callApi<boolean>((a) => a.printReceipt(lastTicket.queue.id))}
                >
                  🖨️ 重新打印
                </button>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-title">💡 使用提示</div>
            <ul style={{ paddingLeft: 18, color: '#4b5563', lineHeight: 1.9, fontSize: 13 }}>
              <li>输入姓名后将自动匹配历史患者档案</li>
              <li>加急患者将在候诊队列中优先叫号</li>
              <li>复诊患者排在普通患者之前</li>
              <li>同一患者今日重复挂号将弹出提醒</li>
              <li>挂号成功后会自动打印号码小票</li>
              <li>关闭软件后，所有队列数据将自动保存</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
