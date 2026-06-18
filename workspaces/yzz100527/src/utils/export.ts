import type { Student } from '@/types';
import { getMissingMaterials } from './validators';

export function exportIncompleteToCSV(students: Student[]): void {
  const incompleteStudents = students.filter(
    (s) => !s.idNumber || !s.idExpiryDate || !s.guardianSigned || !s.insuranceProvided
  );

  if (incompleteStudents.length === 0) {
    alert('没有缺材料的学生，无需导出');
    return;
  }

  const headers = [
    '序号',
    '姓名',
    '班级',
    '缺少材料',
    '证件号码',
    '证件有效期',
    '监护人授权',
    '保险信息',
    '联系备注',
  ];

  const rows = incompleteStudents.map((s, idx) => {
    const missing = getMissingMaterials(s).join('、');
    return [
      idx + 1,
      s.name,
      s.className,
      missing,
      s.idNumber || '-',
      s.idExpiryDate || '-',
      s.guardianSigned ? '已提供' : '未提供',
      s.insuranceProvided ? '已提供' : '未提供',
      s.notes || '-',
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  link.setAttribute('href', url);
  link.setAttribute('download', `待补材料清单_${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr;
}

export function getBusNumbers(students: Student[]): string[] {
  const busSet = new Set<string>();
  students.forEach((s) => {
    if (s.busNumber) {
      busSet.add(s.busNumber);
    }
  });
  return Array.from(busSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

export function getStudentsByBus(students: Student[], busNumber: string): Student[] {
  return students
    .filter((s) => s.busNumber === busNumber)
    .sort((a, b) => {
      const seatA = parseInt(a.seatNumber, 10);
      const seatB = parseInt(b.seatNumber, 10);
      if (!isNaN(seatA) && !isNaN(seatB)) {
        return seatA - seatB;
      }
      return a.name.localeCompare(b.name);
    });
}
