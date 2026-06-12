import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isSupervisor } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.username, values.password);
      message.success(`登录成功！欢迎，${user.name}`);
      
      if (isSupervisor()) {
        navigate('/');
      } else {
        navigate('/claims');
      }
    } catch (err) {
      message.error(err.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ 
          width: 400, 
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)' 
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 8, color: '#1890ff' }}>
            理赔材料摘要核对系统
          </Title>
          <Paragraph type="secondary">
            智能提取 · 自动核对 · 风险预警
          </Paragraph>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              style={{ height: 44, fontSize: 16 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
            测试账号：
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            理赔员：adjuster1 / adjuster123
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            主　管：supervisor1 / supervisor123
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default Login;
