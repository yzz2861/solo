import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { StatusColumn } from '@/components/StatusColumn';
import { StudentForm } from '@/components/StudentForm';
import { PrintView } from '@/components/PrintView';
import { useStudentStore } from '@/store/useStudentStore';
import { computeStudentStatus, generateAlerts } from '@/utils/validators';
import { exportIncompleteToCSV } from '@/utils/export';
import type { PrintMode } from '@/types';

export default function Home() {
  const { students, initFromStorage } = useStudentStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [printMode, setPrintMode] = useState<PrintMode>(null);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const { incompleteStudents, pendingStudents, completedStudents } = useMemo(() => {
    const incomplete: typeof students = [];
    const pending: typeof students = [];
    const completed: typeof students = [];

    students.forEach((student) => {
      const status = computeStudentStatus(student, students);
      if (status === 'incomplete') {
        incomplete.push(student);
      } else if (status === 'pending') {
        pending.push(student);
      } else {
        completed.push(student);
      }
    });

    return {
      incompleteStudents: incomplete,
      pendingStudents: pending,
      completedStudents: completed,
    };
  }, [students]);

  const alertCount = useMemo(() => {
    let count = 0;
    students.forEach((s) => {
      count += generateAlerts(s, students).length;
    });
    return count;
  }, [students]);

  const handleAddStudent = () => {
    setEditingId(undefined);
    setShowForm(true);
  };

  const handleEditStudent = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handlePrintBusList = () => {
    setPrintMode('bus-list');
  };

  const handlePrintHealthNote = () => {
    setPrintMode('health-note');
  };

  const handleClosePrint = () => {
    setPrintMode(null);
  };

  const handleExportIncomplete = () => {
    exportIncompleteToCSV(students);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        students={students}
        incompleteCount={incompleteStudents.length}
        pendingCount={pendingStudents.length}
        completedCount={completedStudents.length}
        alertCount={alertCount}
        onAddStudent={handleAddStudent}
        onPrintBusList={handlePrintBusList}
        onPrintHealthNote={handlePrintHealthNote}
        onExportIncomplete={handleExportIncomplete}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-4 h-[calc(100vh-260px)] min-h-96">
          <StatusColumn
            title="缺材料"
            status="incomplete"
            students={incompleteStudents}
            count={incompleteStudents.length}
            onEdit={handleEditStudent}
          />
          <StatusColumn
            title="待确认"
            status="pending"
            students={pendingStudents}
            count={pendingStudents.length}
            onEdit={handleEditStudent}
          />
          <StatusColumn
            title="已完成"
            status="completed"
            students={completedStudents}
            count={completedStudents.length}
            onEdit={handleEditStudent}
          />
        </div>
      </main>

      {showForm && (
        <StudentForm studentId={editingId} onClose={handleCloseForm} />
      )}

      {printMode && (
        <PrintView mode={printMode} students={students} onClose={handleClosePrint} />
      )}
    </div>
  );
}
