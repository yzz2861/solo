import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, InputNumber, Button, Statistic, Row, Col, Space, message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import db from '../db';
import { formatMoney, exportCSV, MATERIAL_TYPES } from '../utils/helpers';

const TYPE_MAP = Object.fromEntries(MATERIAL_TYPES.map(t => [t.value, t.label]));

export default function Procurement() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [gapItems, setGapItems] = useState([]);
  const [days, setDays] = useState(2);

  const calcGap = useCallback(async (materialsArg) => {
    const materials = materialsArg || await db.materials.toArray();
    const fourWeeksAgo = dayjs().subtract(4, 'week').valueOf();
    const records = await db.dispensingRecords
      .where('createdAt')
      .aboveOrEqual(fourWeeksAgo)
      .toArray();

    const usageMap = {};
    const daySet = new Set();
    records.forEach(r => {
      const day = dayjs(r.createdAt).format('YYYY-MM-DD');
      daySet.add(day);
      if (!usageMap[r.materialId]) usageMap[r.materialId] = 0;
      usageMap[r.materialId] += r.quantity || 0;
    });

    const totalDays = daySet.size || 1;

    const gaps = materials
      .map(m => {
        const totalUsed = usageMap[m.id] || 0;
        const avgDaily = totalUsed / totalDays;
        const weeklyNeed = avgDaily * days;
        const gap = Math.max(0, weeklyNeed - m.stock);
        return {
          ...m,
          avgDaily: Math.round(avgDaily * 100) / 100,
          weeklyNeed: Math.round(weeklyNeed * 100) / 100,
          gap: Math.round(gap * 100) / 100,
          estimatedProcurementCost: Math.round(gap * (m.unitPrice || 0) * 100) / 100,
        };
      })
      .filter(m => m.gap > 0);

    setGapItems(gaps);
  }, [days]);

  const loadData = useCallback(async () => {
    const materials = await db.materials.toArray();
    const items = materials
      .filter(m => m.stock <= m.minStock)
      .map(m => {
        const suggestedQty = m.minStock * 2 - m.stock;
        return { ...m, suggestedQty, estimatedCost: suggestedQty * (m.unitPrice || 0) };
      });
    setLowStockItems(items);
    calcGap(materials);
  }, [calcGap]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    calcGap();
  }, [calcGap]);

  const lowStockTotal = lowStockItems.reduce((sum, m) => sum + m.estimatedCost, 0);

  const gapTotal = gapItems.reduce((sum, m) => sum + m.estimatedProcurementCost, 0);

  function handleExportLowStock() {
    const headers = ['名称', '颜色', '类型', '当前库存', '最低库存', '建议采购量', '单价', '预估费用'];
    const rows = lowStockItems.map(m => [
      m.name,
      m.color || '',
      TYPE_MAP[m.type] || m.type || '',
      m.stock,
      m.minStock,
      m.suggestedQty,
      m.unitPrice,
      m.estimatedCost,
    ]);
    exportCSV('低量采购清单.csv', headers, rows);
    message.success('导出成功');
  }

  function handleExportGap() {
    const headers = ['名称', '颜色', '日均用量', '预估周需求', '当前库存', '缺口', '预估采购费用'];
    const rows = gapItems.map(m => [
      m.name,
      m.color || '',
      m.avgDaily,
      m.weeklyNeed,
      m.stock,
      m.gap,
      m.estimatedProcurementCost,
    ]);
    exportCSV('下周缺口估算.csv', headers, rows);
    message.success('导出成功');
  }

  const lowStockColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '颜色', dataIndex: 'color', key: 'color', render: v => v || '-' },
    { title: '类型', dataIndex: 'type', key: 'type', render: v => TYPE_MAP[v] || v },
    { title: '当前库存', dataIndex: 'stock', key: 'stock' },
    { title: '最低库存', dataIndex: 'minStock', key: 'minStock' },
    { title: '建议采购量', dataIndex: 'suggestedQty', key: 'suggestedQty' },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', render: v => formatMoney(v) },
    { title: '预估费用', dataIndex: 'estimatedCost', key: 'estimatedCost', render: v => formatMoney(v) },
  ];

  const gapColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '颜色', dataIndex: 'color', key: 'color', render: v => v || '-' },
    { title: '日均用量', dataIndex: 'avgDaily', key: 'avgDaily' },
    { title: '预估周需求', dataIndex: 'weeklyNeed', key: 'weeklyNeed' },
    { title: '当前库存', dataIndex: 'stock', key: 'stock' },
    { title: '缺口', dataIndex: 'gap', key: 'gap' },
    { title: '预估采购费用', dataIndex: 'estimatedProcurementCost', key: 'estimatedProcurementCost', render: v => formatMoney(v) },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="低量采购清单" size="small">
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Statistic title="预估采购总费用" value={lowStockTotal} prefix="¥" precision={2} />
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleExportLowStock}>导出 CSV</Button>
          </Col>
        </Row>
        <Table
          rowKey="id"
          dataSource={lowStockItems}
          columns={lowStockColumns}
          size="small"
          pagination={false}
        />
      </Card>

      <Card title="下周缺口估算" size="small">
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <span>预计下周上课天数：</span>
              <InputNumber min={1} max={7} value={days} onChange={v => v && setDays(v)} />
            </Space>
          </Col>
          <Col>
            <Statistic title="预估采购总费用" value={gapTotal} prefix="¥" precision={2} />
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleExportGap}>导出 CSV</Button>
          </Col>
        </Row>
        <Table
          rowKey="id"
          dataSource={gapItems}
          columns={gapColumns}
          size="small"
          pagination={false}
        />
      </Card>
    </Space>
  );
}
