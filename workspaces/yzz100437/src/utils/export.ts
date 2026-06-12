import { Member, LeaveRecord, PerformanceListEntry, WeeklyRollCallEntry, MemberAttendanceStats } from '../types';
import { getVoicePartName } from './voiceParts';
import { getWeekDates, formatDateShort, daysBetween, getNextPerformanceDate } from './date';
import { voicePartOrder } from './voiceParts';

export const exportToCSV = (data: object[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row)
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateWeeklyRollCall = (
  members: Member[],
  leaveRecords: LeaveRecord[],
  weekStart?: Date
): WeeklyRollCallEntry[] => {
  const weekDates = getWeekDates(weekStart);
  
  return members
    .filter(m => m.status === 'active')
    .sort((a, b) => {
      const partCompare = voicePartOrder.indexOf(a.voicePart) - voicePartOrder.indexOf(b.voicePart);
      if (partCompare !== 0) return partCompare;
      return a.name.localeCompare(b.name);
    })
    .map(m => {
      const entry: WeeklyRollCallEntry = {
        name: m.name,
        voicePart: getVoicePartName(m.voicePart),
      };
      
      weekDates.forEach(date => {
        const leave = leaveRecords.find(
          r => r.memberId === m.id && r.rehearsalDate === date
        );
        entry[date] = leave ? '请假' : '';
      });
      
      return entry;
    });
};

export const generatePerformanceList = (
  members: Member[],
  leaveRecords: LeaveRecord[]
): PerformanceListEntry[] => {
  const nextPerformance = getNextPerformanceDate();
  const performanceDateStr = nextPerformance.toISOString().split('T')[0];
  
  return members
    .filter(m => m.status === 'active')
    .sort((a, b) => {
      const partCompare = voicePartOrder.indexOf(a.voicePart) - voicePartOrder.indexOf(b.voicePart);
      if (partCompare !== 0) return partCompare;
      return a.name.localeCompare(b.name);
    })
    .map(m => {
      const memberLeaves = leaveRecords.filter(r => r.memberId === m.id);
      const recentLeaves = memberLeaves.filter(r => daysBetween(r.rehearsalDate, performanceDateStr) <= 30);
      const latestLeave = memberLeaves.sort((a, b) => 
        new Date(b.rehearsalDate).getTime() - new Date(a.rehearsalDate).getTime()
      )[0];
      
      const avgProficiency = recentLeaves.length > 0
        ? recentLeaves.reduce((sum, r) => sum + r.proficiency, 0) / recentLeaves.length
        : 5;
      
      const recentAttendance = latestLeave 
        ? `最近请假: ${formatDateShort(latestLeave.rehearsalDate)}`
        : '出勤良好';
      
      const willPerform = !memberLeaves.some(r => r.rehearsalDate === performanceDateStr) &&
        memberLeaves.every(r => r.willPerform !== false);
      
      return {
        name: m.name,
        voicePart: getVoicePartName(m.voicePart),
        proficiency: Math.round(avgProficiency * 10) / 10,
        recentAttendance,
        willPerform,
      };
    });
};

export const generateAttendanceStats = (
  members: Member[],
  leaveRecords: LeaveRecord[],
  days: number = 30
): MemberAttendanceStats[] => {
  const now = new Date();
  
  return members
    .filter(m => m.status === 'active')
    .map(m => {
      const memberLeaves = leaveRecords.filter(
        r => r.memberId === m.id && daysBetween(r.rehearsalDate, now.toISOString().split('T')[0]) <= days
      );
      
      const sortedLeaves = [...memberLeaves].sort((a, b) => 
        new Date(b.rehearsalDate).getTime() - new Date(a.rehearsalDate).getTime()
      );
      
      let consecutiveLeaves = 0;
      const today = new Date();
      for (let i = 0; i < sortedLeaves.length; i++) {
        const leaveDate = new Date(sortedLeaves[i].rehearsalDate);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - (i + 1) * 7);
        
        if (daysBetween(sortedLeaves[i].rehearsalDate, expectedDate.toISOString().split('T')[0]) <= 2) {
          consecutiveLeaves++;
        } else {
          break;
        }
      }
      
      const totalRehearsals = Math.ceil(days / 7);
      const leaveCount = memberLeaves.length;
      const attendedCount = totalRehearsals - leaveCount;
      const attendanceRate = totalRehearsals > 0 ? (attendedCount / totalRehearsals) * 100 : 100;
      
      return {
        memberId: m.id,
        name: m.name,
        voicePart: m.voicePart,
        totalRehearsals,
        attendedCount,
        leaveCount,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        consecutiveLeaves,
        needsReminder: consecutiveLeaves >= 2 || attendanceRate < 70,
      };
    })
    .sort((a, b) => {
      if (a.needsReminder && !b.needsReminder) return -1;
      if (!a.needsReminder && b.needsReminder) return 1;
      return a.attendanceRate - b.attendanceRate;
    });
};

export const generateReminderMessage = (stats: MemberAttendanceStats): string => {
  const messages: string[] = [];
  
  messages.push(`${getVoicePartName(stats.voicePart)} ${stats.name}：`);
  
  if (stats.consecutiveLeaves >= 2) {
    messages.push(`您已连续缺席${stats.consecutiveLeaves}次排练，请尽快安排时间补练。`);
  }
  
  if (stats.attendanceRate < 70) {
    messages.push(`您最近30天的出勤率仅为${stats.attendanceRate}%，为了不影响演出效果，请尽量参加排练。`);
  }
  
  if (stats.leaveCount > 0) {
    messages.push(`如有特殊情况无法参加，请及时在系统中提交请假申请。`);
  }
  
  return messages.join('\n');
};

export const generatePiecePracticeList = (
  members: Member[],
  leaveRecords: LeaveRecord[]
): Array<{ voicePart: string; members: string[]; reason: string }> => {
  const result: Array<{ voicePart: string; members: string[]; reason: string }> = [];
  
  for (const part of voicePartOrder) {
    const partMembers = members.filter(
      m => m.voicePart === part && m.status === 'active'
    );
    
    const needsPractice: string[] = [];
    for (const member of partMembers) {
      const memberLeaves = leaveRecords.filter(r => r.memberId === member.id);
      const recentLeaves = memberLeaves
        .filter(r => daysBetween(r.rehearsalDate, new Date().toISOString().split('T')[0]) <= 14)
        .sort((a, b) => new Date(b.rehearsalDate).getTime() - new Date(a.rehearsalDate).getTime());
      
      if (recentLeaves.length >= 2 || 
          (recentLeaves.length > 0 && recentLeaves[0].proficiency <= 2)) {
        needsPractice.push(member.name);
      }
    }
    
    if (needsPractice.length > 0) {
      result.push({
        voicePart: getVoicePartName(part),
        members: needsPractice,
        reason: '近期缺席较多或熟练度较低，需要重点补练',
      });
    }
  }
  
  return result;
};

export const printRollCall = (
  members: Member[],
  leaveRecords: LeaveRecord[],
  weekStart?: Date
): void => {
  const weekDates = getWeekDates(weekStart);
  const rollCallData = generateWeeklyRollCall(members, leaveRecords, weekStart);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const dateHeaders = weekDates.map(d => `<th class="border px-4 py-2 text-sm">${formatDateShort(d)}</th>`).join('');
  
  const rows = rollCallData.map(row => {
    const dateCells = weekDates.map(d => {
      const isLeave = row[d] === '请假';
      return `<td class="border px-4 py-3 text-center ${isLeave ? 'bg-red-50 text-red-600' : ''}">${row[d] || ''}</td>`;
    }).join('');
    
    return `<tr class="hover:bg-gray-50">
      <td class="border px-4 py-3 font-medium">${row.name}</td>
      <td class="border px-4 py-3 text-sm text-gray-600">${row.voicePart}</td>
      ${dateCells}
      <td class="border px-4 py-3" style="width: 100px;"></td>
    </tr>`;
  }).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>本周排练点名表</title>
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f5f5f5; font-weight: 600; }
        .signature { text-align: right; margin-top: 40px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>🎵 社区合唱团排练点名表</h1>
      <p style="text-align: center; color: #666;">本周：${weekDates[0]} 至 ${weekDates[6]}</p>
      <table border="1">
        <thead>
          <tr>
            <th class="border px-4 py-2">姓名</th>
            <th class="border px-4 py-2">声部</th>
            ${dateHeaders}
            <th class="border px-4 py-2">签名</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="signature">
        <p>指挥签字：_______________</p>
        <p>团长签字：_______________</p>
        <p>日期：${new Date().toLocaleDateString('zh-CN')}</p>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};
