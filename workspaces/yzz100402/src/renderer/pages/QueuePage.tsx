import { useState, useEffect, useCallback } from 'react';
import { callApi, formatDuration, getWaitMinutes, statusText } from '../utils';
import type { QueueDetail, Department, Doctor } from '../../shared/types';

export default function QueuePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queue, setQueue] = useState<QueueDetail[]>([]);
  const [filterDoctor, setFilterDoctor] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [alert, setAlert] = useState<{ type: 'info' | 'warn' | 'error'; msg: string } | null>(null);

  const [changeDoctorModal, setChangeDoctorModal] = useState<{
    queueId: number;
    currentDoctorId: number;
    depId: number;
  } | null>(null);
  const [newDoctorId, setNewDoctorId] = useState<string>('');
  const [changeNote, setChangeNote] = useState('');
  const [targetDoctors, setTargetDoctors] = useState<Doctor[]>([]);

  const loadQueue = useCallback(async () => {
    try {
      let q = await callApi<QueueDetail[]>((a) =>
        filterDoctor ? a.getTodayQueue(Number(filterDoctor)) : a.getTodayQueue()
      );
      if (filterStatus !== 'all') {
        q = q.filter((it) => it.queue.status === filterStatus);
      }
      if (filterDepartment) {
        q = q.filter((it) => String(it.department.id) === filterDepartment);
      }
      setQueue(q);
    } catch (e: any) {
      showAlert('error', '加载队列失败: ' + e.message);
    }
  }, [filterDoctor, filterDepartment, filterStatus]);

  useEffect(() => {
    (async () => {
      const deps = await callApi<Department[]>((a) => a.getDepartments());
      setDepartments(deps);
      const docs = await callApi<Doctor[]>((a) => a.getDoctors());
      setDoctors(docs);
    })();
  }, []);

  useEffect(() => {
    loadQueue();
    const t = setInterval(loadQueue, 5000);
    return () => clearInterval(t);
  }, [loadQueue]);

  useEffect(() => {
    if (changeDoctorModal) {
      (async () => {
        const docs = await callApi<Doctor[]>((a) => a.getDoctors(changeDoctorModal.depId));
        setTargetDoctors(docs.filter((d) => d.isActive === 1 && d.id !== changeDoctorModal.currentDoctorId));
      })();
    }
  }, [changeDoctorModal]);

  function showAlert(type: 'info' | 'warn' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  }

  async function handleCallNext() {
    if (!filterDoctor) {
      showAlert('warn', '请先选择一位医生，再进行叫号');
      return;
    }
    try {
      const result = await callApi<QueueDetail | null>((a) =>
        a.callNext(Number(filterDoctor))
      );
      if (result) {
        showAlert('info', `正在叫号：${result.queue.queueNumber} - ${result.patient.name}`);
        loadQueue();
      } else {
        showAlert('warn', '当前没有候诊患者');
      }
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handleCall(queueId: number) {
    try {
      await callApi<QueueDetail | null>((a) => a.callNumber(queueId));
      showAlert('info', '叫号成功');
      loadQueue();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handlePass(queueId: number) {
    const ok = await callApi<boolean>((a) => a.showConfirm('确认将该患者标记为过号？'));
    if (!ok) return;
    try {
      await callApi<QueueDetail | null>((a) => a.passNumber(queueId));
      showAlert('info', '已标记为过号');
      loadQueue();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handleRecover(queueId: number) {
    try {
      await callApi<QueueDetail | null>((a) => a.recoverNumber(queueId));
      showAlert('info', '已恢复到队列，将在当前候诊患者之后优先叫号');
      loadQueue();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handleFinish(queueId: number) {
    try {
      await callApi<QueueDetail | null>((a) => a.finishCall(queueId));
      showAlert('info', '已完成就诊');
      loadQueue();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handleCancel(queueId: number) {
    const ok = await callApi<boolean>((a) => a.showConfirm('确认取消该号？'));
    if (!ok) return;
    try {
      await callApi<QueueDetail | null>((a) => a.cancelNumber(queueId));
      showAlert('info', '已取消');
      loadQueue();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handleChangeDoctor() {
    if (!changeDoctorModal || !newDoctorId) return;
    try {
      await callApi<QueueDetail | null>((a) =>
        a.changeDoctor(changeDoctorModal.queueId, Number(newDoctorId), changeNote || undefined)
      );
      showAlert('info', '已更改接诊医生');
      setChangeDoctorModal(null);
      setNewDoctorId('');
      setChangeNote('');
      loadQueue();
    } catch (e: any) {
      showAlert('error', e.message);
    }
  }

  async function handleExportLunch() {
    const ok = await callApi<boolean>((a) =>
      a.showConfirm('午休前导出未叫患者名单？已叫号、过号和已取消的不会导出。')
    );
    if (!ok) return;
    try {
      const filePath = await callApi<string>((a) => a.exportWaitingList());
      const open = await callApi<boolean>((b) =>
        b.showConfirm(`已导出到：\n${filePath}\n\n是否打开文件所在位置？`)
      );
      if (open) {
        await callApi<void>((a) => a.openPath(filePath));
      }
      showAlert('info', '午休名单已导出，下午接诊时队列仍保持顺序');
    } catch (e: any) {
      showAlert('error', '导出失败: ' + e.message);
    }
  }

  const currentCalling = queue.find((q) => q.queue.status === 'calling');
  const waitingCount = queue.filter((q) => ['waiting', 'recovered'].includes(q.queue.status)).length;
  const passedCount = queue.filter((q) => q.queue.status === 'passed').length;
  const finishedCount = queue.filter((q) => q.queue.status === 'called').length;

  const filterDoctorsByDep = filterDepartment
    ? doctors.filter((d) => String(d.departmentId) === filterDepartment)
    : doctors;

  return (
    <div>
      <div className="three-col" style={{ marginBottom: 16 }}>
        <div className="stat-box">
          <div className="stat-label">当前候诊人数</div>
          <div className="stat-value blue">{waitingCount}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">今日已完成</div>
          <div className="stat-value green">{finishedCount}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">今日过号数</div>
          <div className="stat-value orange">{passedCount}</div>
        </div>
      </div>

      {currentCalling && (
        <div className="big-display">
          <div style={{ fontSize: 14, opacity: 0.9 }}>📢 正在叫号</div>
          <div className="big-number">{currentCalling.queue.queueNumber.split('-')[2]}</div>
          <div className="big-info">
            <span>👤 {currentCalling.patient.name}</span>
            <span>🏥 {currentCalling.department.name}</span>
            <span>👨‍⚕️ {currentCalling.doctor.name}</span>
            {currentCalling.queue.isUrgent && <span>⚡ 加急</span>}
          </div>
        </div>
      )}

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="card">
        <div className="card-title">📋 今日叫号队列</div>
        <div className="filter-bar">
          <select
            className="select"
            value={filterDepartment}
            onChange={(e) => {
              setFilterDepartment(e.target.value);
              setFilterDoctor('');
            }}
            style={{ width: 150 }}
          >
            <option value="">全部科室</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            style={{ width: 150 }}
          >
            <option value="">全部医生</option>
            {filterDoctorsByDep.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.isActive === 0 ? '(已停诊)' : ''}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 130 }}
          >
            <option value="all">全部状态</option>
            <option value="waiting">候诊中</option>
            <option value="calling">叫号中</option>
            <option value="recovered">已恢复</option>
            <option value="passed">已过号</option>
            <option value="called">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <div style={{ flex: 1 }} />
          <button className="btn btn-warn btn-sm" onClick={handleExportLunch}>
            🌙 午休导出名单
          </button>
          <button
            className="btn btn-success btn-lg"
            onClick={handleCallNext}
            disabled={!filterDoctor}
          >
            🔊 叫下一位
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="empty">暂无患者</div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 420px)', overflow: 'auto' }}>
            <table className="queue-table">
              <thead>
                <tr>
                  <th>号码</th>
                  <th>患者</th>
                  <th>科室</th>
                  <th>医生</th>
                  <th>标签</th>
                  <th>签到时间</th>
                  <th>已等待</th>
                  <th>状态</th>
                  <th>叫号次数</th>
                  <th style={{ width: 260 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => {
                  const waitMin = getWaitMinutes(q.queue.checkInTime);
                  return (
                    <tr
                      key={q.queue.id}
                      className={
                        q.queue.status === 'calling'
                          ? 'calling-row'
                          : q.queue.isUrgent
                          ? 'urgent-row'
                          : ''
                      }
                    >
                      <td style={{ fontWeight: 700, color: '#1e40af' }}>
                        {q.queue.queueNumber.split('-')[2]}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{q.patient.name}</div>
                        {q.patient.phone && (
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{q.patient.phone}</div>
                        )}
                      </td>
                      <td>{q.department.name}</td>
                      <td>
                        {q.doctor.name}
                        {q.doctor.isActive === 0 && (
                          <span className="tag tag-cancelled" style={{ marginLeft: 4 }}>
                            停诊
                          </span>
                        )}
                      </td>
                      <td>
                        {q.queue.isUrgent && (
                          <span className="tag tag-urgent" style={{ marginRight: 4 }}>
                            ⚡加急
                          </span>
                        )}
                        {q.queue.isFollowUp && <span className="tag tag-follow">🔄复诊</span>}
                      </td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>
                        {q.queue.checkInTime.slice(11, 16)}
                      </td>
                      <td>{formatDuration(waitMin)}</td>
                      <td>
                        <span className={`tag tag-${q.queue.status}`}>
                          {statusText[q.queue.status]}
                        </span>
                      </td>
                      <td>{q.queue.calledCount}</td>
                      <td>
                        <div className="row-actions">
                          {['waiting', 'recovered', 'passed'].includes(q.queue.status) &&
                            q.doctor.isActive === 1 && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleCall(q.queue.id)}
                              >
                                叫号
                              </button>
                            )}
                          {q.queue.status === 'calling' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleFinish(q.queue.id)}
                              >
                                完成
                              </button>
                              <button
                                className="btn btn-warn btn-sm"
                                onClick={() => handlePass(q.queue.id)}
                              >
                                过号
                              </button>
                            </>
                          )}
                          {q.queue.status === 'passed' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRecover(q.queue.id)}
                            >
                              恢复
                            </button>
                          )}
                          {['waiting', 'recovered', 'calling'].includes(q.queue.status) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setChangeDoctorModal({
                                  queueId: q.queue.id,
                                  currentDoctorId: q.doctor.id,
                                  depId: q.department.id,
                                });
                                setNewDoctorId('');
                                setChangeNote('');
                              }}
                            >
                              改医生
                            </button>
                          )}
                          {!['called', 'cancelled'].includes(q.queue.status) && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(q.queue.id)}
                            >
                              取消
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {changeDoctorModal && (
        <div className="modal-backdrop" onClick={() => setChangeDoctorModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">更改接诊医生</div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="label">新的接诊医生</label>
                <select
                  className="select"
                  value={newDoctorId}
                  onChange={(e) => setNewDoctorId(e.target.value)}
                >
                  <option value="">请选择医生</option>
                  {targetDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.title ? `(${d.title})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group full">
                <label className="label">改诊备注</label>
                <textarea
                  className="textarea"
                  placeholder="选填，例如：医生临时出诊"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                />
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-secondary" onClick={() => setChangeDoctorModal(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChangeDoctor}
                disabled={!newDoctorId}
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
