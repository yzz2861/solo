import { useState, useEffect, useMemo } from 'react';
import { Card, Table, DatePicker, Select, Button, Statistic, Row, Col, Tag, Space } from 'antd';
import db from '../db';
import { formatMoney, exportCSV } from '../utils/helpers';

const { RangePicker } = DatePicker;

export default function CostReport() {
  const [dateRange, setDateRange] = useState(null);
  const [courseFilter, setCourseFilter] = useState(null);
  const [records, setRecords] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);

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
    }
    loadData();
  }, []);

  const materialMap = useMemo(
    () => Object.fromEntries(materials.map(m => [m.id, m])),
    [materials]
  );
  const courseMap = useMemo(
    () => Object.fromEntries(courses.map(c => [c.id, c])),
    [courses]
  );

  const filteredRecords = useMemo(() => {
    let result = records;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').valueOf();
      const end = dateRange[1].endOf('day').valueOf();
      result = result.filter(r => r.createdAt >= start && r.createdAt <= end);
    }
    if (courseFilter) {
      result = result.filter(r => r.courseId === courseFilter);
    }
    return result;
  }, [records, dateRange, courseFilter]);

  const courseStats = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const cid = r.courseId;
      if (!map[cid]) {
        map[cid] = { courseId: cid, cost: 0, giftCost: 0, recordCount: 0, studentSet: new Set() };
      }
      const mat = materialMap[r.materialId];
      const lineCost = (mat ? mat.unitPrice : 0) * r.quantity;
      if (r.isGift) {
        map[cid].giftCost += lineCost;
      } else {
        map[cid].cost += lineCost;
      }
      map[cid].recordCount += 1;
      map[cid].studentSet.add(r.studentId);
    });
    return Object.values(map).map(item => ({
      ...item,
      courseName: courseMap[item.courseId]?.name || '-',
      studentCount: item.studentSet.size,
    }));
  }, [filteredRecords, materialMap, courseMap]);

  const detailRows = useMemo(() => {
    return filteredRecords.map(r => {
      const mat = materialMap[r.materialId];
      return {
        id: r.id,
        courseName: courseMap[r.courseId]?.name || '-',
        materialName: mat ? `${mat.name}${mat.color ? ' - ' + mat.color : ''}` : '-',
        quantity: r.quantity,
        unitPrice: mat ? mat.unitPrice : 0,
        totalCost: mat ? mat.unitPrice * r.quantity : 0,
        isGift: r.isGift,
      };
    });
  }, [filteredRecords, materialMap, courseMap]);

  const totalCost = useMemo(() => courseStats.reduce((s, c) => s + c.cost, 0), [courseStats]);
  const totalGiftCost = useMemo(() => courseStats.reduce((s, c) => s + c.giftCost, 0), [courseStats]);
  const totalRecords = useMemo(() => courseStats.reduce((s, c) => s + c.recordCount, 0), [courseStats]);

  function handleExport() {
    const headers = ['课程', '材料费', '赠送费', '领用次数', '学生数'];
    const rows = courseStats.map(c => [
      c.courseName,
      c.cost.toFixed(2),
      c.giftCost.toFixed(2),
      c.recordCount,
      c.studentCount,
    ]);
    exportCSV('课程成本统计.csv', headers, rows);
  }

  const courseColumns = [
    {
      title: '课程',
      dataIndex: 'courseName',
      key: 'courseName',
    },
    {
      title: '材料费',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: v => formatMoney(v),
    },
    {
      title: '赠送成本',
      dataIndex: 'giftCost',
      key: 'giftCost',
      align: 'right',
      render: v => formatMoney(v),
    },
    {
      title: '领用次数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      align: 'center',
    },
    {
      title: '学生数',
      dataIndex: 'studentCount',
      key: 'studentCount',
      align: 'center',
    },
  ];

  const detailColumns = [
    {
      title: '课程',
      dataIndex: 'courseName',
      key: 'courseName',
    },
    {
      title: '材料名称',
      dataIndex: 'materialName',
      key: 'materialName',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: v => formatMoney(v),
    },
    {
      title: '费用合计',
      dataIndex: 'totalCost',
      key: 'totalCost',
      align: 'right',
      render: v => formatMoney(v),
    },
    {
      title: '类型',
      dataIndex: 'isGift',
      key: 'isGift',
      align: 'center',
      render: v => v ? <Tag color="orange">赠送</Tag> : <Tag>正常</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="成本报表" size="small">
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={val => setDateRange(val)}
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            style={{ width: 180 }}
            placeholder="筛选课程"
            allowClear
            value={courseFilter}
            onChange={val => setCourseFilter(val || null)}
            options={[
              { value: null, label: '全部课程' },
              ...courses.map(c => ({ value: c.id, label: c.name })),
            ]}
          />
          <Button type="primary" onClick={handleExport}>导出CSV</Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="材料费合计" value={totalCost} prefix="¥" precision={2} styles={{ content: { color: '#1890ff' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="赠送费合计" value={totalGiftCost} prefix="¥" precision={2} styles={{ content: { color: '#faad14' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="领用总次数" value={totalRecords} styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
      </Row>

      <Card title="按课程统计" size="small">
        <Table
          columns={courseColumns}
          dataSource={courseStats}
          rowKey="courseId"
          size="small"
          pagination={false}
        />
      </Card>

      <Card title="材料费用明细" size="small">
        <Table
          columns={detailColumns}
          dataSource={detailRows}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </Space>
  );
}
