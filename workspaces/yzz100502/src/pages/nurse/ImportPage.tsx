import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Plus,
  Check,
  X,
  AlertCircle,
  UploadCloud,
  User,
  Phone,
  MessageSquare,
  Calendar,
  Users,
} from 'lucide-react';
import { useSmsStore } from '../../store/smsStore';
import { useAuthStore } from '../../store/authStore';
import { classificationService } from '../../services/classificationService';
import type { SenderType } from '../../types';
import { CategoryBadge } from '../../components/CategoryBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { timelineService } from '../../services/timelineService';

interface ImportPreview {
  patientName: string;
  patientId: string;
  phone: string;
  content: string;
  sendTime: Date;
  sender: SenderType;
  senderRelation?: string;
  nurseNote?: string;
  isValid: boolean;
  error?: string;
}

export const ImportPage = () => {
  const { addSmsRecords, addSmsRecord, smsRecords, getStatistics, isLoading, error } = useSmsStore();
  const { currentUser } = useAuthStore();
  const [previewData, setPreviewData] = useState<ImportPreview[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState({
    patientName: '',
    patientId: '',
    phone: '',
    content: '',
    sendTime: new Date().toISOString().slice(0, 16),
    sender: 'patient' as SenderType,
    senderRelation: '',
    nurseNote: '',
  });

  const stats = getStatistics();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const preview = parseImportData(results.data as Record<string, string>[]);
            setPreviewData(preview);
          },
        });
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (event) => {
        const data = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        const preview = parseImportData(jsonData as Record<string, string>[]);
        setPreviewData(preview);
      };
      reader.readAsArrayBuffer(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseImportData = (data: Record<string, string>[]): ImportPreview[] => {
    return data.map((row, index) => {
      const patientName = row['患者姓名'] || row['name'] || row['patientName'] || '';
      const patientId = row['患者ID'] || row['patientId'] || `P${Date.now()}${index}`;
      const phone = row['手机号'] || row['phone'] || row['telephone'] || '';
      const content = row['短信内容'] || row['content'] || row['message'] || '';
      const sendTimeStr = row['发送时间'] || row['sendTime'] || row['time'] || new Date().toISOString();
      const senderStr = row['发送者'] || row['sender'] || 'patient';
      const senderRelation = row['家属关系'] || row['relation'] || '';
      const nurseNote = row['护士备注'] || row['note'] || '';

      const familyCheck = classificationService.detectFamilySender(content);
      const sender: SenderType = senderStr.includes('家属') || familyCheck.isFamily ? 'family' : 'patient';
      const relation = senderRelation || familyCheck.relation || '';

      let sendTime: Date;
      try {
        sendTime = new Date(sendTimeStr);
        if (isNaN(sendTime.getTime())) {
          sendTime = new Date();
        }
      } catch {
        sendTime = new Date();
      }

      const errors: string[] = [];
      if (!patientName) errors.push('患者姓名不能为空');
      if (!phone) errors.push('手机号不能为空');
      if (!content) errors.push('短信内容不能为空');

      return {
        patientName,
        patientId,
        phone,
        content,
        sendTime,
        sender,
        senderRelation: relation,
        nurseNote,
        isValid: errors.length === 0,
        error: errors.join('；'),
      };
    });
  };

  const handleConfirmImport = async () => {
    const validRecords = previewData.filter((r) => r.isValid);
    if (validRecords.length === 0) return;

    await addSmsRecords(
      validRecords.map((r) => ({
        patientId: r.patientId,
        patientName: r.patientName,
        phone: r.phone,
        content: r.content,
        sendTime: r.sendTime,
        sender: r.sender,
        senderRelation: r.senderRelation,
        nurseNote: r.nurseNote,
      }))
    );

    setPreviewData([]);
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.patientName || !manualForm.phone || !manualForm.content) return;

    await addSmsRecord({
      patientId: manualForm.patientId || `P${Date.now()}`,
      patientName: manualForm.patientName,
      phone: manualForm.phone,
      content: manualForm.content,
      sendTime: new Date(manualForm.sendTime),
      sender: manualForm.sender,
      senderRelation: manualForm.senderRelation,
      nurseNote: manualForm.nurseNote,
    });

    setShowManualForm(false);
    setManualForm({
      patientName: '',
      patientId: '',
      phone: '',
      content: '',
      sendTime: new Date().toISOString().slice(0, 16),
      sender: 'patient',
      senderRelation: '',
      nurseNote: '',
    });
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  const validCount = previewData.filter((r) => r.isValid).length;
  const invalidCount = previewData.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">总记录数</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
              <p className="text-xs text-slate-500">待审核</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.confirmed}</p>
              <p className="text-xs text-slate-500">已确认</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {new Set(smsRecords.map((s) => s.patientId)).size}
              </p>
              <p className="text-xs text-slate-500">患者数</p>
            </div>
          </div>
        </motion.div>
      </div>

      {importSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
        >
          <Check className="w-5 h-5" />
          <span>数据导入成功，已自动完成智能分析</span>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <X className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <motion.div
          whileHover={{ borderColor: '#3b82f6' }}
          className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors cursor-pointer hover:bg-blue-50/50"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">批量导入</h3>
          <p className="text-sm text-slate-500 mb-4">支持 CSV、Excel 格式文件</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <FileSpreadsheet size={14} /> .xlsx
            </span>
            <span className="flex items-center gap-1">
              <FileText size={14} /> .csv
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">单条添加</h3>
              <p className="text-sm text-slate-500">手动录入单条短信记录</p>
            </div>
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {showManualForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleManualSubmit}
              className="space-y-4 pt-4 border-t border-slate-100"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <User size={12} className="inline mr-1" />
                    患者姓名 *
                  </label>
                  <input
                    type="text"
                    value={manualForm.patientName}
                    onChange={(e) => setManualForm({ ...manualForm, patientName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入姓名"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Phone size={12} className="inline mr-1" />
                    手机号 *
                  </label>
                  <input
                    type="tel"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入手机号"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <MessageSquare size={12} className="inline mr-1" />
                  短信内容 *
                </label>
                <textarea
                  value={manualForm.content}
                  onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="请输入短信内容"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    发送时间
                  </label>
                  <input
                    type="datetime-local"
                    value={manualForm.sendTime}
                    onChange={(e) => setManualForm({ ...manualForm, sendTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Users size={12} className="inline mr-1" />
                    发送者
                  </label>
                  <select
                    value={manualForm.sender}
                    onChange={(e) => setManualForm({ ...manualForm, sender: e.target.value as SenderType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="patient">患者本人</option>
                    <option value="family">家属代发</option>
                  </select>
                </div>
              </div>

              {manualForm.sender === 'family' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">家属关系</label>
                  <input
                    type="text"
                    value={manualForm.senderRelation}
                    onChange={(e) => setManualForm({ ...manualForm, senderRelation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：女儿、儿子"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">护士备注</label>
                <textarea
                  value={manualForm.nurseNote}
                  onChange={(e) => setManualForm({ ...manualForm, nurseNote: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="如包含图片，请在此描述图片内容"
                />
              </div>

              <button
                type="submit"
                disabled={!manualForm.patientName || !manualForm.phone || !manualForm.content || isLoading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                添加记录
              </button>
            </motion.form>
          )}
        </motion.div>
      </div>

      {previewData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">导入预览</h3>
              <p className="text-sm text-slate-500">
                共 {previewData.length} 条记录，
                <span className="text-green-600 font-medium"> {validCount} 条有效</span>
                {invalidCount > 0 && (
                  <span className="text-red-600 font-medium">，{invalidCount} 条无效</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewData([])}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check size={16} />
                确认导入 ({validCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    患者姓名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    手机号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    短信内容
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    发送时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    发送者
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((row, index) => (
                  <tr key={index} className={!row.isValid ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{row.patientName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{row.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={row.content}>
                      {row.content}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {timelineService.formatDate(row.sendTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          row.sender === 'family'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.sender === 'family' ? `家属(${row.senderRelation || ''})` : '患者本人'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {smsRecords.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">最近导入记录</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {smsRecords.slice(-5).reverse().map((sms) => {
              const analysis = useSmsStore.getState().getAnalysisBySmsId(sms.id);
              return (
                <div key={sms.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{sms.patientNameMasked}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          sms.sender === 'family'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sms.sender === 'family' ? `家属(${sms.senderRelation})` : '患者本人'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">{sms.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {timelineService.formatDate(sms.sendTime)}
                    </p>
                  </div>
                  {analysis && (
                    <div className="flex flex-col items-end gap-1">
                      <CategoryBadge category={analysis.category} size="sm" />
                      <SeverityBadge severity={analysis.severity} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
