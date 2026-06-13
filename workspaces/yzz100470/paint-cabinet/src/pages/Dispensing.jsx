import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, InputNumber, Checkbox, Button, Table, Tag, DatePicker, Space, message } from 'antd';
import dayjs from 'dayjs';
import db from '../db';
import { formatDateTime, MATERIAL_TYPES, resolveColorAlias } from '../utils/helpers';

const { RangePicker } = DatePicker;

export default function Dispensing() {
  const [form] = Form.useForm();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [colorAliases, setColorAliases] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [todayRecords, setTodayRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredStudents = students.filter(s => s.courseId === selectedCourseId);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const loadTodayRecords = useCallback(async () => {
    const start = dayjs().startOf('day').valueOf();
    const end = dayjs().endOf('day').valueOf();
    const records = await db.dispensingRecords
      .where('createdAt')
      .between(start, end)
      .reverse()
      .toArray();
    setTodayRecords(records);
  }, []);

  const loadAllRecords = useCallback(async () => {
    let records;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').valueOf();
      const end = dateRange[1].endOf('day').valueOf();
      records = await db.dispensingRecords
        .where('createdAt')
        .between(start, end)
        .reverse()
        .toArray();
    } else {
      records = await db.dispensingRecords.reverse().toArray();
    }
    setAllRecords(records);
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, s, m, ca] = await Promise.all([
        db.courses.toArray(),
        db.students.toArray(),
        db.materials.toArray(),
        db.colorAliases.toArray(),
      ]);
      if (!cancelled) {
        setCourses(c);
        setStudents(s);
        setMaterials(m);
        setColorAliases(ca);
        loadTodayRecords();
        loadAllRecords();
      }
    })();
    return () => { cancelled = true; };
  }, [loadTodayRecords, loadAllRecords]);

  useEffect(() => {
    loadAllRecords();
  }, [loadAllRecords]);

  function getCourseName(id) {
    return courses.find(c => c.id === id)?.name || '-';
  }

  function getStudentName(id) {
    return students.find(s => s.id === id)?.name || '-';
  }

  function getMaterialLabel(id) {
    const m = materials.find(m => m.id === id);
    if (!m) return '-';
    const typeLabel = MATERIAL_TYPES.find(t => t.value === m.type)?.label || '';
    return `${m.name}${m.color ? ' - ' + m.color : ''}${typeLabel ? ' (' + typeLabel + ')' : ''}`;
  }

  async function handleSubmit(values) {
    const { courseId, studentId, materialId, quantity, isGift, note } = values;
    const mat = materials.find(m => m.id === materialId);
    if (!mat) {
      message.error('未找到所选材料');
      return;
    }
    if (quantity > mat.stock) {
      message.error(`库存不足，当前库存：${mat.stock}`);
      return;
    }
    setSubmitting(true);
    try {
      await db.transaction('rw', [db.dispensingRecords, db.materials], async () => {
        await db.dispensingRecords.add({
          courseId,
          studentId,
          materialId,
          quantity,
          isGift: isGift || false,
          note: note || '',
          createdAt: Date.now(),
        });
        await db.materials.update(materialId, {
          stock: mat.stock - quantity,
          updatedAt: Date.now(),
        });
      });
      message.success('领用登记成功');
      form.resetFields();
      setSelectedCourseId(null);
      setSelectedMaterialId(null);
      const updatedMaterials = await db.materials.toArray();
      setMaterials(updatedMaterials);
      loadTodayRecords();
      loadAllRecords();
    } catch (err) {
      message.error('登记失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleMaterialSearch(input) {
    if (!input) return;
    const resolved = resolveColorAlias(input, colorAliases);
    if (resolved !== input.trim()) {
      const matched = materials.find(m => m.color === resolved);
      if (matched) {
        setSelectedMaterialId(matched.id);
        form.setFieldValue('materialId', matched.id);
      }
    }
  }

  const columns = [
    {
      title: '课程',
      dataIndex: 'courseId',
      key: 'course',
      render: id => getCourseName(id),
    },
    {
      title: '学生',
      dataIndex: 'studentId',
      key: 'student',
      render: id => getStudentName(id),
    },
    {
      title: '材料',
      dataIndex: 'materialId',
      key: 'material',
      render: id => getMaterialLabel(id),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '赠送',
      dataIndex: 'isGift',
      key: 'isGift',
      render: v => v ? <Tag color="orange">赠送</Tag> : <Tag>正常</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'time',
      render: ts => formatDateTime(ts),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="领用登记" size="small">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSubmit}
          style={{ flexWrap: 'wrap', gap: '8px 0' }}
        >
          <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              style={{ width: 160 }}
              placeholder="选择课程"
              onChange={val => {
                setSelectedCourseId(val);
                form.setFieldValue('studentId', undefined);
              }}
              options={courses.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="studentId" label="学生" rules={[{ required: true, message: '请选择学生' }]}>
            <Select
              style={{ width: 140 }}
              placeholder="选择学生"
              options={filteredStudents.map(s => ({ value: s.id, label: s.name }))}
              disabled={!selectedCourseId}
            />
          </Form.Item>
          <Form.Item name="materialId" label="材料" rules={[{ required: true, message: '请选择材料' }]}>
            <Select
              style={{ width: 240 }}
              placeholder="选择材料"
              showSearch
              optionFilterProp="label"
              onSearch={handleMaterialSearch}
              onChange={val => setSelectedMaterialId(val)}
              options={materials.map(m => ({
                value: m.id,
                label: `${m.name}${m.color ? ' - ' + m.color : ''}（库存: ${m.stock}）`,
              }))}
            />
          </Form.Item>
          {selectedMaterial && (
            <span style={{ color: '#888', fontSize: 12, alignSelf: 'center' }}>
              当前库存：{selectedMaterial.stock}
            </span>
          )}
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={0.5} step={0.5} style={{ width: 100 }} placeholder="数量" />
          </Form.Item>
          <Form.Item name="isGift" valuePropName="checked">
            <Checkbox>赠送</Checkbox>
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Select
              style={{ width: 160 }}
              placeholder="可选备注"
              allowClear
              mode="tags"
              maxCount={1}
              options={[]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>登记</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="今日领用记录" size="small">
        <Table
          columns={columns}
          dataSource={todayRecords}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      <Card title="全部领用记录" size="small">
        <div style={{ marginBottom: 12 }}>
          <RangePicker
            value={dateRange}
            onChange={val => setDateRange(val)}
            placeholder={['开始日期', '结束日期']}
          />
        </div>
        <Table
          columns={columns}
          dataSource={allRecords}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </Space>
  );
}
