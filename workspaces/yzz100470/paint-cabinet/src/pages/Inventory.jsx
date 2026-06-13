import { useState, useEffect } from 'react';
import { Card, Form, Select, InputNumber, Input, Button, Table, DatePicker, Space, message } from 'antd';
import dayjs from 'dayjs';
import db from '../db';
import { formatDateTime, exportCSV } from '../utils/helpers';

const { RangePicker } = DatePicker;

export default function Inventory() {
  const [materials, setMaterials] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();

  const loadMaterials = () => db.materials.toArray().then(setMaterials);
  const loadAdjustments = () => db.inventoryAdjustments.orderBy('createdAt').reverse().toArray().then(setAdjustments);

  useEffect(() => {
    loadMaterials();
    loadAdjustments();
  }, []);

  const handleSubmit = async (values) => {
    const { materialId, newStock, reason } = values;
    const mat = materials.find(m => m.id === materialId);
    if (!mat) {
      message.error('未找到所选材料');
      return;
    }
    const oldStock = mat.stock;
    if (newStock === oldStock) {
      message.warning('新库存与当前库存相同，无需调整');
      return;
    }
    setSubmitting(true);
    try {
      await db.transaction('rw', [db.materials, db.inventoryAdjustments], async () => {
        await db.materials.update(materialId, { stock: newStock, updatedAt: Date.now() });
        await db.inventoryAdjustments.add({
          materialId,
          oldStock,
          newStock,
          reason,
          createdAt: Date.now(),
        });
      });
      message.success('库存调整成功');
      form.resetFields();
      await loadMaterials();
      await loadAdjustments();
    } catch (err) {
      message.error('调整失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdjustments = dateRange
    ? adjustments.filter(a => {
        const d = dayjs(a.createdAt);
        return d.isSameOrAfter(dateRange[0], 'day') && d.isSameOrBefore(dateRange[1], 'day');
      })
    : adjustments;

  const handleExport = () => {
    const headers = ['材料', '原库存', '新库存', '变动量', '原因', '时间'];
    const rows = filteredAdjustments.map(a => {
      const mat = materials.find(m => m.id === a.materialId);
      const change = a.newStock - a.oldStock;
      return [
        mat ? `${mat.name}${mat.color ? ' - ' + mat.color : ''}` : '未知材料',
        a.oldStock,
        a.newStock,
        change > 0 ? `+${change}` : String(change),
        a.reason,
        formatDateTime(a.createdAt),
      ];
    });
    exportCSV('库存调整记录.csv', headers, rows);
    message.success('导出成功');
  };

  const columns = [
    {
      title: '材料名',
      dataIndex: 'materialId',
      key: 'materialName',
      render: (materialId) => {
        const mat = materials.find(m => m.id === materialId);
        return mat ? `${mat.name}${mat.color ? ' - ' + mat.color : ''}` : '未知材料';
      },
    },
    { title: '原库存', dataIndex: 'oldStock', key: 'oldStock' },
    { title: '新库存', dataIndex: 'newStock', key: 'newStock' },
    {
      title: '变动量',
      key: 'change',
      render: (_, r) => {
        const change = r.newStock - r.oldStock;
        const color = change > 0 ? 'green' : change < 0 ? 'red' : undefined;
        const text = change > 0 ? `+${change}` : String(change);
        return <span style={{ color, fontWeight: 600 }}>{text}</span>;
      },
    },
    { title: '调整原因', dataIndex: 'reason', key: 'reason' },
    {
      title: '调整时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: v => formatDateTime(v),
    },
  ];

  return (
    <div>
      <Card title="库存调整" style={{ marginBottom: 24 }}>
        <Form form={form} layout="inline" onFinish={handleSubmit}>
          <Form.Item name="materialId" rules={[{ required: true, message: '请选择材料' }]}>
            <Select
              style={{ width: 280 }}
              placeholder="选择材料"
              showSearch
              optionFilterProp="label"
              options={materials.map(m => ({
                value: m.id,
                label: `${m.name}${m.color ? ' - ' + m.color : ''}（库存: ${m.stock}）`,
              }))}
            />
          </Form.Item>
          <Form.Item name="newStock" rules={[{ required: true, message: '请输入新库存' }]}>
            <InputNumber min={0} step={0.5} style={{ width: 140 }} placeholder="新库存值" />
          </Form.Item>
          <Form.Item name="reason" rules={[{ required: true, message: '请输入调整原因' }]}>
            <Input style={{ width: 200 }} placeholder="调整原因，如：盘点校正" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交调整
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="调整记录">
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={['开始日期', '结束日期']}
          />
          <Button onClick={handleExport}>导出 CSV</Button>
        </Space>
        <Table
          rowKey="id"
          dataSource={filteredAdjustments}
          columns={columns}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
