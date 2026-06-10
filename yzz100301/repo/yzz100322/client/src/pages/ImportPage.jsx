import React, { useState, useEffect } from 'react';
import { Card, Upload, Button, message, List, Tag, Divider, Space, Typography } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import request from '../utils/request.js';

const { Title, Text } = Typography;

function ImportPage() {
  const [batches, setBatches] = useState([]);
  const [uploading, setUploading] = useState({
    reservation: false,
    recognition: false,
    manual: false
  });

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const res = await request.get('/import/batches');
      if (res.success) {
        setBatches(res.data || []);
      }
    } catch (err) {
      console.error('加载批次列表失败:', err);
    }
  };

  const handleUpload = async (type, file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      let url = '';
      if (type === 'reservation') url = '/import/reservation';
      else if (type === 'recognition') url = '/import/recognition';
      else if (type === 'manual') url = '/import/manual';

      const res = await request.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success) {
        message.success(res.message);
        loadBatches();
      } else {
        message.error(res.error || '导入失败');
      }
    } catch (err) {
      message.error('导入失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }

    return false;
  };

  const getTypeLabel = (type) => {
    const map = {
      'reservation': '预约记录',
      'recognition': '识别记录',
      'manual': '人工放行'
    };
    return map[type] || type;
  };

  const getTypeColor = (type) => {
    const map = {
      'reservation': 'green',
      'recognition': 'blue',
      'manual': 'orange'
    };
    return map[type] || 'default';
  };

  const getTypeIcon = (type) => {
    if (type === 'reservation') return <FileExcelOutlined />;
    if (type === 'recognition') return <FileImageOutlined />;
    if (type === 'manual') return <FileTextOutlined />;
    return <FileTextOutlined />;
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
          数据导入说明
        </Title>
        <Text type="secondary">
          系统支持导入三种数据源：预约 CSV、识别记录 JSON、人工放行表（CSV/JSON/Excel）。
          系统会自动按车牌和预约号关联数据，重复导入不会产生重复记录。
        </Text>
      </Card>

      <div className="import-section">
        <div className="import-section-title">
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          预约记录导入
        </div>
        <Space size="large" style={{ width: '100%' }}>
          <Upload
            accept=".csv"
            showUploadList={false}
            beforeUpload={(file) => handleUpload('reservation', file)}
            disabled={uploading.reservation}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading.reservation}
              size="large"
            >
              上传预约CSV
            </Button>
          </Upload>
          <div style={{ flex: 1, color: '#666', fontSize: '13px' }}>
            <p style={{ marginBottom: 4 }}><strong>支持的字段：</strong></p>
            <p style={{ margin: 0 }}>
              预约号、车牌号、访客姓名、访客电话、来访事由、来访日期、预计入场时间、预计离场时间、被访部门、被访人
            </p>
          </div>
        </Space>
      </div>

      <div className="import-section">
        <div className="import-section-title">
          <FileImageOutlined style={{ color: '#1677ff' }} />
          车牌识别记录导入
        </div>
        <Space size="large" style={{ width: '100%' }}>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={(file) => handleUpload('recognition', file)}
            disabled={uploading.recognition}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading.recognition}
              size="large"
            >
              上传识别JSON
            </Button>
          </Upload>
          <div style={{ flex: 1, color: '#666', fontSize: '13px' }}>
            <p style={{ marginBottom: 4 }}><strong>支持的字段：</strong></p>
            <p style={{ margin: 0 }}>
              plateNumber / 车牌号、recognizeTime / 识别时间、gate / 门岗、direction / 方向、confidence / 置信度
            </p>
          </div>
        </Space>
      </div>

      <div className="import-section">
        <div className="import-section-title">
          <FileTextOutlined style={{ color: '#faad14' }} />
          人工放行记录导入
        </div>
        <Space size="large" style={{ width: '100%' }}>
          <Upload
            accept=".csv,.json,.xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => handleUpload('manual', file)}
            disabled={uploading.manual}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading.manual}
              size="large"
            >
              上传人工放行表
            </Button>
          </Upload>
          <div style={{ flex: 1, color: '#666', fontSize: '13px' }}>
            <p style={{ marginBottom: 4 }}><strong>支持格式：</strong>CSV / JSON / Excel</p>
            <p style={{ margin: 0 }}>
              支持字段：车牌号、预约号、放行时间、门岗、操作员、放行原因、访客姓名
            </p>
          </div>
        </Space>
      </div>

      <Card title="导入批次记录">
        <List
          dataSource={batches}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tag key="status" color="green">
                  <CheckCircleOutlined /> {item.status === 'completed' ? '完成' : item.status}
                </Tag>
              ]}
            >
              <List.Item.Meta
                avatar={<Tag color={getTypeColor(item.type)} icon={getTypeIcon(item.type)}>
                  {getTypeLabel(item.type)}
                </Tag>}
                title={
                  <Space>
                    <span>{item.file_name}</span>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      批次号: {item.batch_no}
                    </Text>
                  </Space>
                }
                description={
                  <Space size="large">
                    <span><ClockCircleOutlined /> {item.created_at}</span>
                    <span>共 {item.record_count} 条记录</span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
        {batches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            暂无导入记录
          </div>
        )}
      </Card>
    </div>
  );
}

export default ImportPage;
