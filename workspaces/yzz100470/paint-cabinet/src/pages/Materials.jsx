import { useState, useEffect } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, InputNumber,
  Select, Popconfirm, Tag, Space, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import db from '../db';
import {
  formatMoney, MATERIAL_TYPES, MATERIAL_UNITS,
  PAINT_COLORS, resolveColorAlias,
} from '../utils/helpers';

const TYPE_MAP = Object.fromEntries(MATERIAL_TYPES.map(t => [t.value, t.label]));
const UNIT_MAP = Object.fromEntries(MATERIAL_UNITS.map(u => [u.value, u.label]));

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState(null);
  const [editingAlias, setEditingAlias] = useState(null);
  const [matForm] = Form.useForm();
  const [aliasForm] = Form.useForm();
  const matType = Form.useWatch('type', matForm);

  const loadMaterials = () => db.materials.toArray().then(setMaterials);
  const loadAliases = () => db.colorAliases.toArray().then(setAliases);

  useEffect(() => { loadMaterials(); loadAliases(); }, []);

  const openMatModal = (record = null) => {
    setEditingMat(record);
    if (record) {
      matForm.setFieldsValue(record);
    } else {
      matForm.resetFields();
    }
    setMatModalOpen(true);
  };

  const saveMat = async () => {
    const values = await matForm.validateFields();
    const now = Date.now();
    if (editingMat) {
      await db.materials.put({ ...editingMat, ...values, updatedAt: now });
    } else {
      await db.materials.put({ ...values, stock: values.stock ?? 0, minStock: values.minStock ?? 0, createdAt: now, updatedAt: now });
    }
    setMatModalOpen(false);
    loadMaterials();
    message.success('保存成功');
  };

  const deleteMat = async (id) => {
    await db.materials.delete(id);
    loadMaterials();
    message.success('已删除');
  };

  const openAliasModal = (record = null) => {
    setEditingAlias(record);
    if (record) {
      aliasForm.setFieldsValue(record);
    } else {
      aliasForm.resetFields();
    }
    setAliasModalOpen(true);
  };

  const saveAlias = async () => {
    const values = await aliasForm.validateFields();
    if (editingAlias) {
      await db.colorAliases.put({ ...editingAlias, ...values });
    } else {
      await db.colorAliases.put(values);
    }
    setAliasModalOpen(false);
    loadAliases();
    message.success('保存成功');
  };

  const deleteAlias = async (id) => {
    await db.colorAliases.delete(id);
    loadAliases();
    message.success('已删除');
  };

  const matColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: v => TYPE_MAP[v] || v },
    {
      title: '颜色', dataIndex: 'color', key: 'color',
      render: v => {
        if (!v) return '-';
        const resolved = resolveColorAlias(v, aliases);
        return resolved !== v ? <span>{resolved}（{v}）</span> : resolved;
      },
    },
    { title: '规格', dataIndex: 'specs', key: 'specs', render: v => v || '-' },
    { title: '单位', dataIndex: 'unit', key: 'unit', render: v => UNIT_MAP[v] || v },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', render: v => formatMoney(v) },
    {
      title: '当前库存', dataIndex: 'stock', key: 'stock',
      render: (v, r) => (
        <Space>
          <span>{v}</span>
          {v <= r.minStock && <Tag color="error">库存不足</Tag>}
        </Space>
      ),
    },
    { title: '最低库存', dataIndex: 'minStock', key: 'minStock' },
    {
      title: '操作', key: 'action',
      render: (_, r) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openMatModal(r)}>编辑</Button>
          <Popconfirm title="确定删除该材料？" onConfirm={() => deleteMat(r.id)} okText="确定" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const aliasColumns = [
    { title: '别名', dataIndex: 'alias', key: 'alias' },
    { title: '标准颜色', dataIndex: 'canonicalColor', key: 'canonicalColor' },
    {
      title: '操作', key: 'action',
      render: (_, r) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openAliasModal(r)}>编辑</Button>
          <Popconfirm title="确定删除该别名？" onConfirm={() => deleteAlias(r.id)} okText="确定" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Tabs
      defaultActiveKey="materials"
      items={[
        {
          key: 'materials',
          label: '材料列表',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => openMatModal()}>
                添加材料
              </Button>
              <Table rowKey="id" dataSource={materials} columns={matColumns} size="small" />
            </>
          ),
        },
        {
          key: 'aliases',
          label: '颜色别名',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => openAliasModal()}>
                添加别名
              </Button>
              <Table rowKey="id" dataSource={aliases} columns={aliasColumns} size="small" />
            </>
          ),
        },
      ]}
    />

    <Modal
      title={editingMat ? '编辑材料' : '添加材料'}
      open={matModalOpen}
      onOk={saveMat}
      onCancel={() => setMatModalOpen(false)}
      destroyOnClose
    >
      <Form form={matForm} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
          <Select options={MATERIAL_TYPES.map(t => ({ value: t.value, label: t.label }))} placeholder="请选择类型" />
        </Form.Item>
        {matType === 'paint' && (
          <Form.Item name="color" label="颜色" rules={[{ required: true, message: '请选择颜色' }]}>
            <Select
              showSearch
              options={PAINT_COLORS.map(c => ({ value: c, label: c }))}
              placeholder="请选择颜色"
            />
          </Form.Item>
        )}
        <Form.Item name="unit" label="单位" rules={[{ required: true, message: '请选择单位' }]}>
          <Select options={MATERIAL_UNITS.map(u => ({ value: u.value, label: u.label }))} placeholder="请选择单位" />
        </Form.Item>
        <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请输入单价' }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
        </Form.Item>
        <Form.Item name="stock" label="当前库存">
          <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="minStock" label="最低库存">
          <InputNumber min={0} step={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="specs" label="规格">
          <Input />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title={editingAlias ? '编辑别名' : '添加别名'}
      open={aliasModalOpen}
      onOk={saveAlias}
      onCancel={() => setAliasModalOpen(false)}
      destroyOnClose
    >
      <Form form={aliasForm} layout="vertical">
        <Form.Item name="alias" label="别名" rules={[{ required: true, message: '请输入别名' }]}>
          <Input placeholder="如：温莎红" />
        </Form.Item>
        <Form.Item name="canonicalColor" label="标准颜色" rules={[{ required: true, message: '请选择标准颜色' }]}>
          <Select
            showSearch
            options={PAINT_COLORS.map(c => ({ value: c, label: c }))}
            placeholder="请选择标准颜色"
          />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
