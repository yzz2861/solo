import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Upload,
  Select,
  message,
  Typography,
  Alert,
  List,
  Tag,
  Progress
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  InboxOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { documentAPI, claimAPI } from '../api';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const docTypeOptions = [
  { value: 'medical', label: '病历/诊断证明', color: 'blue' },
  { value: 'invoice', label: '医疗费用发票', color: 'green' },
  { value: 'accident', label: '事故说明/出险经过', color: 'orange' },
  { value: 'photo', label: '事故/伤情照片', color: 'purple' },
  { value: 'other', label: '其他材料', color: 'default' }
];

const UploadDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docType, setDocType] = useState('medical');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState([]);
  const [claim, setClaim] = useState(null);
  const fileInputRef = useRef(null);

  const loadClaim = async () => {
    try {
      const res = await claimAPI.get(id);
      setClaim(res.data.claim);
    } catch (err) {
      message.error('获取案件信息失败');
    }
  };

  useState(() => {
    loadClaim();
  }, []);

  const customRequest = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('doc_type', docType);
      
      const res = await documentAPI.upload(id, formData);
      
      setUploadProgress(100);
      setUploadResults(prev => [...prev, ...res.data]);
      onSuccess(res.data);
      message.success(`${file.name} 上传成功`);
    } catch (err) {
      onError(err);
      message.error(`${file.name} 上传失败: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    name: 'files',
    multiple: true,
    customRequest,
    showUploadList: false,
    accept: '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.txt,.doc,.docx',
    onChange(info) {
      const { status } = info.file;
      if (status === 'uploading') {
        setUploadProgress(Math.min(50, info.file.percent || 30));
      }
    }
  };

  const typeInfo = docTypeOptions.find(t => t.value === docType);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/claims/${id}`)}>
          返回案件详情
        </Button>
      </Space>

      <Card title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            上传材料
            {claim && <Tag color="blue" style={{ marginLeft: 8 }}>{claim.claim_no}</Tag>}
          </Title>
        </Space>
      }>
        <Alert
          message="上传说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 4 }}>
                <strong>1. 选择材料类型：</strong>请先选择正确的材料类型，系统将根据类型进行智能分析。
              </Paragraph>
              <Paragraph style={{ marginBottom: 4 }}>
                <strong>2. 支持的格式：</strong>PDF、JPG、PNG、GIF、BMP、TXT、DOC、DOCX（最大50MB）。
              </Paragraph>
              <Paragraph style={{ marginBottom: 4 }}>
                <strong>3. 内容录入：</strong>上传后请为每份材料录入文字内容，或粘贴OCR识别结果。
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>4. 重复检测：</strong>系统会自动检测重复文件，避免重复上传。
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Space align="center">
            <span style={{ fontWeight: 500 }}>材料类型：</span>
            <Select
              value={docType}
              onChange={setDocType}
              style={{ width: 240 }}
              size="large"
            >
              {docTypeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={opt.color}>{opt.label}</Tag>
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        <Dragger {...uploadProps} className="upload-area">
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
            点击或将文件拖拽到此处上传
          </p>
          <p className="ant-upload-hint">
            当前类型：<Tag color={typeInfo?.color}>{typeInfo?.label}</Tag>
          </p>
          <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
            支持多文件同时上传，单文件最大50MB
          </p>
          {uploading && (
            <div style={{ marginTop: 16, width: 300, margin: '0 auto' }}>
              <Progress percent={uploadProgress} status="active" />
            </div>
          )}
        </Dragger>

        {uploadResults.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>上传结果</Title>
            <List
              dataSource={uploadResults}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      icon={<FileTextOutlined />}
                      onClick={() => navigate(`/claims/${id}`)}
                    >
                      录入内容
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.is_duplicate ?
                        <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} /> :
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                    }
                    title={
                      <Space>
                        {item.file_name}
                        {item.is_duplicate && <Tag color="warning">重复文件，已跳过</Tag>}
                      </Space>
                    }
                    description={
                      <Space>
                        <Tag color={typeInfo?.color}>{typeInfo?.label}</Tag>
                        {item.file_size && `${(item.file_size / 1024).toFixed(1)} KB`}
                        {item.message}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Space>
                <Button onClick={() => navigate(`/claims/${id}`)}>
                  继续上传其他类型
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => navigate(`/claims/${id}`)}
                >
                  返回案件详情
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UploadDocuments;
