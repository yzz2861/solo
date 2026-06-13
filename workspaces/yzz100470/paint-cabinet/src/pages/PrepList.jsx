import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Select, Table, Button, InputNumber, Space, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import db from '../db';
import { formatDate } from '../utils/helpers';

const { Title } = Typography;

export default function PrepList() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [prepData, setPrepData] = useState([]);
  const [prepQuantities, setPrepQuantities] = useState({});
  const [todayStr] = useState(() => formatDate(Date.now()));

  const selectedCourse = useMemo(
    () => courses.find(c => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );
  const courseStudents = useMemo(
    () => students.filter(s => s.courseId === selectedCourseId),
    [students, selectedCourseId]
  );

  const calcPrepData = useCallback(async (courseId, mats) => {
    const records = await db.dispensingRecords
      .where('courseId')
      .equals(courseId)
      .toArray();

    if (records.length === 0) {
      setPrepData([]);
      setPrepQuantities({});
      return;
    }

    const dateSet = new Set();
    records.forEach(r => {
      dateSet.add(formatDate(r.createdAt));
    });
    const sessionCount = dateSet.size;

    const grouped = {};
    records.forEach(r => {
      if (!grouped[r.materialId]) {
        grouped[r.materialId] = { materialId: r.materialId, totalQty: 0 };
      }
      grouped[r.materialId].totalQty += r.quantity;
    });

    const result = Object.values(grouped).map(g => {
      const mat = mats.find(m => m.id === g.materialId);
      const avgUsage = Math.ceil((g.totalQty / sessionCount) * 10) / 10;
      const currentStock = mat ? mat.stock : 0;
      const gap = Math.max(0, avgUsage - currentStock);
      return {
        key: g.materialId,
        materialId: g.materialId,
        name: mat ? mat.name : '-',
        color: mat ? mat.color : '-',
        unit: mat ? mat.unit : '-',
        avgUsage,
        currentStock,
        gap,
        shortStock: currentStock < avgUsage,
      };
    });

    result.sort((a, b) => (b.shortStock ? 1 : 0) - (a.shortStock ? 1 : 0));

    const initialQty = {};
    result.forEach(r => {
      initialQty[r.materialId] = r.gap;
    });
    setPrepQuantities(initialQty);
    setPrepData(result);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, s, m] = await Promise.all([
        db.courses.toArray(),
        db.students.toArray(),
        db.materials.toArray(),
      ]);
      if (!cancelled) {
        setCourses(c);
        setStudents(s);
        setMaterials(m);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      calcPrepData(selectedCourseId, materials);
    } else {
      setPrepData([]);
      setPrepQuantities({});
    }
  }, [selectedCourseId, materials, calcPrepData]);

  function handlePrepQtyChange(materialId, value) {
    setPrepQuantities(prev => ({ ...prev, [materialId]: value ?? 0 }));
  }

  const columns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '平均用量/次',
      dataIndex: 'avgUsage',
      key: 'avgUsage',
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (val, record) => (
        <span style={record.shortStock ? { color: '#f5222d', fontWeight: 600 } : {}}>
          {val}
        </span>
      ),
    },
    {
      title: '缺口',
      dataIndex: 'gap',
      key: 'gap',
      render: (val, record) =>
        record.shortStock ? (
          <span style={{ color: '#f5222d', fontWeight: 600 }}>{val}</span>
        ) : (
          '库存充足'
        ),
    },
    {
      title: '准备数量',
      key: 'prepQty',
      className: 'no-print',
      render: (_, record) => (
        <InputNumber
          min={0}
          step={1}
          value={prepQuantities[record.materialId]}
          onChange={val => handlePrepQtyChange(record.materialId, val)}
          style={{ width: 90 }}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" className="no-print">
        <Space>
          <span>选择课程：</span>
          <Select
            style={{ width: 240 }}
            placeholder="请选择课程"
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            options={courses.map(c => ({ value: c.id, label: c.name }))}
          />
          {selectedCourseId && (
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              打印备料单
            </Button>
          )}
        </Space>
      </Card>

      {selectedCourseId && selectedCourse && (
        <div id="print-area">
          <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>备料单</Title>
          <div style={{ marginBottom: 16, lineHeight: '2em' }}>
            <div>课程名称：{selectedCourse.name}</div>
            <div>上课时间：{selectedCourse.schedule || '-'}</div>
            <div>日期：{todayStr}</div>
            <div>
              学生名单（{courseStudents.length}人）：
              {courseStudents.map(s => s.name).join('、') || '暂无学生'}
            </div>
          </div>

          {prepData.length > 0 ? (
            <Table
              columns={columns}
              dataSource={prepData}
              rowKey="key"
              size="small"
              pagination={false}
              bordered
              rowClassName={record => record.shortStock ? 'row-short-stock' : ''}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 32 }}>
              该课程暂无领用记录，无法计算平均用量
            </div>
          )}
        </div>
      )}

      <style>{`
        @media print {
          .ant-layout-sider,
          .no-print,
          .ant-layout-content > .no-print {
            display: none !important;
          }
          #print-area {
            padding: 0 !important;
          }
          .row-short-stock td {
            color: #f5222d !important;
            font-weight: 600 !important;
          }
        }
      `}</style>
    </Space>
  );
}
