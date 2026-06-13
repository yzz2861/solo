import { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Popconfirm, Space, Empty, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import db from '../db';
import { formatDateTime } from '../utils/helpers';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseForm] = Form.useForm();
  const [studentForm] = Form.useForm();

  const loadCourses = useCallback(async () => {
    const list = await db.courses.orderBy('id').reverse().toArray();
    setCourses(list);
  }, []);

  const loadStudents = useCallback(async () => {
    const list = await db.students.orderBy('id').reverse().toArray();
    setStudents(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, s] = await Promise.all([
        db.courses.orderBy('id').reverse().toArray(),
        db.students.orderBy('id').reverse().toArray(),
      ]);
      if (!cancelled) {
        setCourses(c);
        setStudents(s);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getStudentCount = (courseId) => students.filter((s) => s.courseId === courseId).length;

  const handleSaveCourse = async () => {
    try {
      const values = await courseForm.validateFields();
      if (editingCourse) {
        await db.courses.update(editingCourse.id, values);
        message.success('课程已更新');
      } else {
        await db.courses.add({ ...values, createdAt: Date.now() });
        message.success('课程已添加');
      }
      setCourseModalOpen(false);
      setEditingCourse(null);
      courseForm.resetFields();
      loadCourses();
    } catch (err) {
      message.error('保存失败：' + (err.message || '未知错误'));
    }
  };

  const handleDeleteCourse = async (id) => {
    await db.students.where('courseId').equals(id).delete();
    await db.courses.delete(id);
    message.success('课程及关联学生已删除');
    loadCourses();
    loadStudents();
    if (selectedCourseId === id) setSelectedCourseId(null);
  };

  const openCourseModal = (course = null) => {
    setEditingCourse(course);
    if (course) {
      courseForm.setFieldsValue(course);
    } else {
      courseForm.resetFields();
    }
    setCourseModalOpen(true);
  };

  const handleSaveStudent = async () => {
    try {
      const values = await studentForm.validateFields();
      await db.students.add({ ...values, createdAt: Date.now() });
      message.success('学生已添加');
      setStudentModalOpen(false);
      studentForm.resetFields();
      loadStudents();
    } catch (err) {
      message.error('保存失败：' + (err.message || '未知错误'));
    }
  };

  const handleDeleteStudent = async (id) => {
    await db.students.delete(id);
    message.success('学生已删除');
    loadStudents();
  };

  const courseColumns = [
    { title: '课程名称', dataIndex: 'name', key: 'name' },
    { title: '上课时间', dataIndex: 'schedule', key: 'schedule' },
    { title: '备注', dataIndex: 'notes', key: 'notes', ellipsis: true },
    {
      title: '学生数',
      key: 'studentCount',
      render: (_, record) => getStudentCount(record.id),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => formatDateTime(v),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openCourseModal(record)}>编辑</Button>
          <Popconfirm
            title="删除课程将同时删除该课程下所有学生，确认删除？"
            onConfirm={() => handleDeleteCourse(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredStudents = selectedCourseId
    ? students.filter((s) => s.courseId === selectedCourseId)
    : [];

  const getCourseName = (courseId) => {
    const c = courses.find((item) => item.id === courseId);
    return c ? c.name : '-';
  };

  const studentColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '课程', dataIndex: 'courseId', key: 'courseId', render: getCourseName },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => formatDateTime(v),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确认删除该学生？"
          onConfirm={() => handleDeleteStudent(record.id)}
          okText="确认"
          cancelText="取消"
        >
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="courses"
        items={[
          {
            key: 'courses',
            label: '课程管理',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openCourseModal()}>
                    新增课程
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  columns={courseColumns}
                  dataSource={courses}
                  pagination={false}
                  size="middle"
                />
              </>
            ),
          },
          {
            key: 'students',
            label: '学生管理',
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <span>选择课程：</span>
                  <Select
                    style={{ width: 240 }}
                    placeholder="请选择课程"
                    allowClear
                    value={selectedCourseId}
                    onChange={setSelectedCourseId}
                    options={courses.map((c) => ({ value: c.id, label: c.name }))}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      studentForm.resetFields();
                      if (selectedCourseId) {
                        studentForm.setFieldsValue({ courseId: selectedCourseId });
                      }
                      setStudentModalOpen(true);
                    }}
                  >
                    新增学生
                  </Button>
                </Space>
                {selectedCourseId ? (
                  <Table
                    rowKey="id"
                    columns={studentColumns}
                    dataSource={filteredStudents}
                    pagination={false}
                    size="middle"
                  />
                ) : (
                  <Empty description="请先选择课程" />
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editingCourse ? '编辑课程' : '新增课程'}
        open={courseModalOpen}
        onOk={handleSaveCourse}
        onCancel={() => {
          setCourseModalOpen(false);
          setEditingCourse(null);
          courseForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={courseForm} layout="vertical">
          <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input placeholder="请输入课程名称" />
          </Form.Item>
          <Form.Item name="schedule" label="上课时间">
            <Input placeholder="例如：周六上午" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增学生"
        open={studentModalOpen}
        onOk={handleSaveStudent}
        onCancel={() => {
          setStudentModalOpen(false);
          studentForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={studentForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入学生姓名' }]}>
            <Input placeholder="请输入学生姓名" />
          </Form.Item>
          <Form.Item name="courseId" label="所属课程" rules={[{ required: true, message: '请选择所属课程' }]}>
            <Select
              placeholder="请选择课程"
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
