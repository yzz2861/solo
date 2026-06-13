import { useState, useEffect, useMemo } from 'react';
import { Card, Table, DatePicker, Tag, Row, Col, Statistic, Space } from 'antd';
import dayjs from 'dayjs';
import db from '../db';
import { formatMoney, MATERIAL_TYPES } from '../utils/helpers';

const { RangePicker } = DatePicker;

export default function Consumption() {
  const [records, setRecords] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [r, m, c] = await Promise.all([
        db.dispensingRecords.toArray(),
        db.materials.toArray(),
        db.courses.toArray(),
      ]);
      setRecords(r);
      setMaterials(m);
      setCourses(c);
      setLoading(false);
    }
    loadData();
  }, []);

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c.name])),
    [courses]
  );
  const materialMap = useMemo(
    () => Object.fromEntries(materials.map((m) => [m.id, m])),
    [materials]
  );
  const filteredRecords = useMemo(() => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return records;
    const start = dateRange[0].startOf('day').valueOf();
    const end = dateRange[1].endOf('day').valueOf();
    return records.filter((r) => r.createdAt >= start && r.createdAt <= end);
  }, [records, dateRange]);

  const consumptionData = useMemo(() => {
    const grouped = {};
    filteredRecords.forEach((r) => {
      const key = `${r.courseId}_${r.materialId}`;
      if (!grouped[key]) {
        grouped[key] = {
          courseId: r.courseId,
          materialId: r.materialId,
          totalQty: 0,
          totalCost: 0,
          studentIds: new Set(),
          sessionDates: new Set(),
        };
      }
      grouped[key].totalQty += r.quantity;
      const mat = materialMap[r.materialId];
      grouped[key].totalCost += r.quantity * (mat?.unitPrice || 0);
      grouped[key].studentIds.add(r.studentId);
      if (r.createdAt) {
        grouped[key].sessionDates.add(dayjs(r.createdAt).format('YYYY-MM-DD'));
      }
    });

    const list = Object.values(grouped).map((item) => {
      const studentCount = item.studentIds.size || 1;
      const sessionCount = item.sessionDates.size || 1;
      const mat = materialMap[item.materialId];
      return {
        key: `${item.courseId}_${item.materialId}`,
        courseId: item.courseId,
        courseName: courseMap[item.courseId] || '-',
        materialId: item.materialId,
        materialName: mat?.name || '-',
        materialType: mat?.type || '-',
        totalQty: item.totalQty,
        totalCost: item.totalCost,
        avgPerStudent: item.totalQty / studentCount,
        sessionCount,
        avgPerSession: item.totalQty / sessionCount,
      };
    });

    list.sort((a, b) => b.totalQty - a.totalQty);

    const qtyThreshold = list.length > 0
      ? list[Math.floor(list.length * 0.25)]?.totalQty ?? 0
      : 0;
    list.forEach((item) => {
      item.isHighConsumption = item.totalQty >= qtyThreshold && qtyThreshold > 0;
    });

    return list;
  }, [filteredRecords, courseMap, materialMap]);

  const bulkSuggestions = useMemo(() => {
    const suggestions = [];
    const byMaterialCourse = {};
    filteredRecords.forEach((r) => {
      const key = `${r.materialId}_${r.courseId}`;
      if (!byMaterialCourse[key]) {
        byMaterialCourse[key] = {
          materialId: r.materialId,
          courseId: r.courseId,
          totalQty: 0,
          sessionDates: new Set(),
        };
      }
      byMaterialCourse[key].totalQty += r.quantity;
      if (r.createdAt) {
        byMaterialCourse[key].sessionDates.add(dayjs(r.createdAt).format('YYYY-MM-DD'));
      }
    });

    Object.values(byMaterialCourse).forEach((item) => {
      const sessionCount = item.sessionDates.size || 1;
      const avgPerSession = item.totalQty / sessionCount;
      if (avgPerSession > 2) {
        const mat = materialMap[item.materialId];
        if (mat && (mat.type === 'paint' || mat.type === 'other')) {
          suggestions.push({
            key: `${item.materialId}_${item.courseId}`,
            materialName: mat.name,
            courseName: courseMap[item.courseId] || '-',
            avgPerSession: Number(avgPerSession.toFixed(2)),
            suggestion: '建议采购大包装',
          });
        }
      }
    });

    return suggestions;
  }, [filteredRecords, materialMap, courseMap]);

  const typeSummary = useMemo(() => {
    const summary = {};
    filteredRecords.forEach((r) => {
      const mat = materialMap[r.materialId];
      const type = mat?.type || 'other';
      if (!summary[type]) {
        summary[type] = { type, totalQty: 0, totalCost: 0 };
      }
      summary[type].totalQty += r.quantity;
      summary[type].totalCost += r.quantity * (mat?.unitPrice || 0);
    });
    return Object.values(summary);
  }, [filteredRecords, materialMap]);

  const typeLabelMap = useMemo(
    () => Object.fromEntries(MATERIAL_TYPES.map((t) => [t.value, t.label])),
    []
  );

  const consumptionColumns = [
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
    },
    {
      title: '材料名称',
      dataIndex: 'materialName',
      key: 'materialName',
    },
    {
      title: '消耗总量',
      dataIndex: 'totalQty',
      key: 'totalQty',
      sorter: (a, b) => a.totalQty - b.totalQty,
      defaultSortOrder: 'descend',
      render: (val, record) =>
        record.isHighConsumption ? (
          <span style={{ fontWeight: 'bold', color: '#f5222d' }}>{val}</span>
        ) : (
          val
        ),
    },
    {
      title: '总费用',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val) => formatMoney(val),
    },
    {
      title: '人均消耗',
      dataIndex: 'avgPerStudent',
      key: 'avgPerStudent',
      render: (val) => Number(val.toFixed(2)),
    },
  ];

  const bulkColumns = [
    {
      title: '材料名称',
      dataIndex: 'materialName',
      key: 'materialName',
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
    },
    {
      title: '场均用量',
      dataIndex: 'avgPerSession',
      key: 'avgPerSession',
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      render: () => <Tag color="orange">建议大包装</Tag>,
    },
  ];

  const summaryColumns = [
    {
      title: '材料类型',
      dataIndex: 'type',
      key: 'type',
      render: (val) => typeLabelMap[val] || val,
    },
    {
      title: '消耗总量',
      dataIndex: 'totalQty',
      key: 'totalQty',
    },
    {
      title: '总费用',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val) => formatMoney(val),
    },
  ];

  const totalConsumption = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
  const totalCost = filteredRecords.reduce((sum, r) => {
    const mat = materialMap[r.materialId];
    return sum + r.quantity * (mat?.unitPrice || 0);
  }, 0);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="消耗分析" size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(val) => setDateRange(val)}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col>
            <Statistic title="总消耗量" value={Number(totalConsumption.toFixed(2))} />
          </Col>
          <Col>
            <Statistic title="总费用" value={formatMoney(totalCost)} />
          </Col>
        </Row>
      </Card>

      <Card title="按课程材料消耗" size="small">
        <Table
          columns={consumptionColumns}
          dataSource={consumptionData}
          rowKey="key"
          size="small"
          loading={loading}
          pagination={{ pageSize: 15 }}
          rowClassName={(record) =>
            record.isHighConsumption ? 'high-consumption-row' : ''
          }
        />
      </Card>

      <Card title="大包装采购建议" size="small">
        {bulkSuggestions.length > 0 ? (
          <Table
            columns={bulkColumns}
            dataSource={bulkSuggestions}
            rowKey="key"
            size="small"
            pagination={false}
          />
        ) : (
          <span style={{ color: '#999' }}>暂无大包装采购建议</span>
        )}
      </Card>

      <Card title="按材料类型汇总" size="small">
        <Table
          columns={summaryColumns}
          dataSource={typeSummary}
          rowKey="type"
          size="small"
          pagination={false}
        />
      </Card>
    </Space>
  );
}
