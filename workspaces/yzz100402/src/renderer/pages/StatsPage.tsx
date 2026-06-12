import { useState, useEffect } from 'react';
import { callApi, actionText, formatDuration } from '../utils';
import type { DailyStat, CallRecord, QueueDetail, Patient, Doctor } from '../../shared/types';
import dayjs from 'dayjs';

export default function StatsPage() {
  const [tab, setTab] = useState<'overview' | 'records'>('overview');
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [recordDate, setRecordDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [queueMap, setQueueMap] = useState<Map<number, QueueDetail>>(new Map());
  const [patientMap, setPatientMap] = useState<Map<number, Patient>>(new Map());
  const [doctorMap, setDoctorMap] = useState<Map<number, Doctor>>(new Map());
  const [alert, setAlert] = useState<{ type: 'info' | 'warn' | 'error'; msg: string } | null>(null);

  async function loadStats() {
    try {
      const data = await callApi<DailyStat[]>((a) => a.getDailyStats(startDate, endDate));
      setStats(data);
    } catch (e: any) {
      showAlert('error', '加载统计数据失败: ' + e.message);
    }
  }

  async function loadRecords() {
    try {
      const data = await callApi<CallRecord[]>((a) => a.getCallRecords(recordDate));
      setRecords(data);
      const queueIds = [...new Set(data.map((r) => r.queueId))];
      const docIds = [
        ...new Set([...data.map((r) => r.fromDoctorId), ...data.map((r) => r.toDoctorId)].filter(Boolean) as number[]),
      ];
      const qMap = new Map<number, QueueDetail>();
      for (const qid of queueIds) {
        try {
          const detail = await callApi<QueueDetail | null>((a) => a.getQueueDetail(qid));
          if (detail) {
            qMap.set(qid, detail);
            patientMap.set(detail.patient.id, detail.patient);
            doctorMap.set(detail.doctor.id, detail.doctor);
          }
        } catch {}
      }
      setQueueMap(new Map(qMap));
      if (docIds.length > 0) {
        try {
          const allDocs = await callApi<Doctor[]>((a) => a.getDoctors());
          const dMap = new Map(doctorMap);
          for (const d of allDocs) dMap.set(d.id, d);
          setDoctorMap(dMap);
        } catch {}
      }
    } catch (e: any) {
      showAlert('error', '加载记录失败: ' + e.message);
    }
  }

  function showAlert(type: 'info' | 'warn' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  }

  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [recordDate, tab]);

  const totalStats = stats.reduce(
    (acc, s) => ({
      total: acc.total + s.totalCount,
      avg: acc.avg + s.avgWaitMinutes * s.totalCount,
      max: Math.max(acc.max, s.maxWaitMinutes),
      passed: acc.passed + s.passedCount,
      cancelled: acc.cancelled + s.cancelledCount,
      urgent: acc.urgent + s.urgentCount,
      recall: acc.recall + s.recallCount,
      change: acc.change + s.changeDoctorCount,
    }),
    { total: 0, avg: 0, max: 0, passed: 0, cancelled: 0, urgent: 0, recall: 0, change: 0 }
  );
  const overallAvg = totalStats.total > 0 ? Math.round(totalStats.avg / totalStats.total) : 0;

  const recallRecords = records.filter((r) => r.action === 'recall' || r.action === 'change_doctor');

  return (
    <div>
      <div className="page-title">📊 院长报表</div>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          📈 接诊概况
        </button>
        <button className={`tab ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>
          📝 叫号/撤回记录
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="filter-bar">
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label className="label">从</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label className="label">至</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="three-col" style={{ marginBottom: 16 }}>
            <div className="stat-box">
              <div className="stat-label">总接诊量</div>
              <div className="stat-value blue">{totalStats.total}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">平均等待时长</div>
              <div className="stat-value green">{formatDuration(overallAvg)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">最长等待时长</div>
              <div className="stat-value orange">{formatDuration(totalStats.max)}</div>
            </div>
          </div>

          <div className="three-col" style={{ marginBottom: 16 }}>
            <div className="stat-box">
              <div className="stat-label">加急挂号数</div>
              <div className="stat-value orange">{totalStats.urgent}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">过号总数</div>
              <div className="stat-value red">{totalStats.passed}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">取消/撤回/改诊</div>
              <div className="stat-value">
                {totalStats.cancelled + totalStats.recall + totalStats.change}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📅 每日明细</div>
            {stats.length === 0 ? (
              <div className="empty">暂无数据</div>
            ) : (
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>接诊量</th>
                    <th>平均等待</th>
                    <th>最长等待</th>
                    <th>加急</th>
                    <th>过号</th>
                    <th>取消</th>
                    <th>重新叫号</th>
                    <th>改医生</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.date}>
                      <td style={{ fontWeight: 500 }}>{s.date}</td>
                      <td>{s.totalCount}</td>
                      <td>{formatDuration(s.avgWaitMinutes)}</td>
                      <td style={{ color: '#d97706' }}>{formatDuration(s.maxWaitMinutes)}</td>
                      <td style={{ color: '#d97706' }}>{s.urgentCount}</td>
                      <td style={{ color: '#dc2626' }}>{s.passedCount}</td>
                      <td>{s.cancelledCount}</td>
                      <td style={{ color: '#7c3aed' }}>{s.recallCount}</td>
                      <td style={{ color: '#2563eb' }}>{s.changeDoctorCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'records' && (
        <>
          <div className="filter-bar">
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label className="label">日期</label>
              <input
                type="date"
                className="input"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ color: '#6b7280', fontSize: 13 }}>
              共 {records.length} 条记录 · 撤回/改诊 {recallRecords.length} 条
            </div>
          </div>

          <div className="card">
            <div className="card-title">📝 叫号操作记录（含撤回、改医生等）</div>
            {records.length === 0 ? (
              <div className="empty">暂无记录</div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 360px)', overflow: 'auto' }}>
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>患者</th>
                      <th>号码</th>
                      <th>操作</th>
                      <th>详情</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const q = queueMap.get(r.queueId);
                      const patient = q?.patient;
                      return (
                        <tr key={r.id}>
                          <td style={{ color: '#6b7280', fontSize: 12 }}>{r.createdAt.slice(11, 19)}</td>
                          <td style={{ fontWeight: 500 }}>{patient?.name || '未知'}</td>
                          <td style={{ color: '#1e40af' }}>
                            {q?.queue.queueNumber?.split('-')[2] || '-'}
                          </td>
                          <td>
                            <span
                              className={`tag ${
                                ['recall', 'recover', 'change_doctor'].includes(r.action)
                                  ? 'tag-waiting'
                                  : r.action === 'cancel'
                                  ? 'tag-cancelled'
                                  : r.action === 'pass'
                                  ? 'tag-passed'
                                  : 'tag-called'
                              }`}
                            >
                              {actionText[r.action] || r.action}
                            </span>
                          </td>
                          <td style={{ color: '#4b5563', fontSize: 12 }}>
                            {r.action === 'change_doctor' && (
                              <>
                                {doctorMap.get(r.fromDoctorId!)?.name || r.fromDoctorId}
                                {' → '}
                                {doctorMap.get(r.toDoctorId!)?.name || r.toDoctorId}
                              </>
                            )}
                            {r.note}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
