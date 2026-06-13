import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Alert } from 'antd';
import {
  ExperimentOutlined,
  WarningOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db from '../db';
import { formatDateTime } from '../utils/helpers';

export default function Dashboard() {
  const [stats, setStats] = useState({
    materialCount: 0,
    lowStockCount: 0,
    courseCount: 0,
    todayDispensingCount: 0,
  });
  const [lowStockMaterials, setLowStockMaterials] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [materials, courseCount, dispensingRecords, courses, students] =
        await Promise.all([
          db.materials.toArray(),
          db.courses.count(),
          db.dispensingRecords.toArray(),
          db.courses.toArray(),
          db.students.toArray(),
        ]);

      const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));
      const studentMap = Object.fromEntries(
        students.map((s) => [s.id, s.name])
      );
      const materialMap = Object.fromEntries(
        materials.map((m) => [m.id, m.name])
      );

      const lowStock = materials.filter((m) => m.stock <= m.minStock);
      const todayStart = dayjs().startOf('day').valueOf();
      const todayRecords = dispensingRecords.filter(
        (r) => r.createdAt >= todayStart
      );

      const recent = [...dispensingRecords]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map((r) => ({
          ...r,
          courseName: courseMap[r.courseId] || '-',
          studentName: studentMap[r.studentId] || '-',
          materialName: materialMap[r.materialId] || '-',
        }));

      setStats({
        materialCount: materials.length,
        lowStockCount: lowStock.length,
        courseCount,
        todayDispensingCount: todayRecords.length,
      });
      setLowStockMaterials(lowStock);
      setRecentRecords(recent);
      setLoading(false);
    }

    loadData();
  }, []);

  function getUrgencyTag(stock, minStock) {
    if (stock === 0) return <Tag color="red">缺货</Tag>;
    if (stock <= minStock * 0.5) return <Tag color="orange">紧急</Tag>;
    return <Tag color="gold">偏低</Tag>;
  }

  const lowStockColumns = [
    { title: '材料名称', dataIndex: 'name', key: 'name' },
    { title: '当前库存', dataIndex: 'stock', key: 'stock', align: 'center' },
    {
      title: '最低库存',
      dataIndex: 'minStock',
      key: 'minStock',
      align: 'center',
    },
    {
      title: '状态',
      key: 'status',
      align: 'center',
      render: (_, record) => getUrgencyTag(record.stock, record.minStock),
    },
  ];

  const recentColumns = [
    { title: '课程', dataIndex: 'courseName', key: 'courseName' },
    { title: '学生', dataIndex: 'studentName', key: 'studentName' },
    { title: '材料', dataIndex: 'materialName', key: 'materialName' },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => formatDateTime(val),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="材料总数"
              value={stats.materialCount}
              prefix={<ExperimentOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="低库存材料"
              value={stats.lowStockCount}
              prefix={<WarningOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="课程总数"
              value={stats.courseCount}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日领用"
              value={stats.todayDispensingCount}
              prefix={<ShoppingCartOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {lowStockMaterials.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Alert
            message={`低库存预警：共有 ${lowStockMaterials.length} 种材料库存不足`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Card title="低库存预警">
            <Table
              rowKey="id"
              columns={lowStockColumns}
              dataSource={lowStockMaterials}
              pagination={false}
              size="small"
              loading={loading}
            />
          </Card>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Card title="最近领用">
          <Table
            rowKey="id"
            columns={recentColumns}
            dataSource={recentRecords}
            pagination={false}
            size="small"
            loading={loading}
          />
        </Card>
      </div>
    </div>
  );
}
