import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, List, Tag, Space } from 'antd';
import {
  CarOutlined,
  ScheduleOutlined,
  CameraOutlined,
  UserOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  RiseOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import request from '../utils/request.js';

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    loadOverview();
    loadDailyData();
  }, []);

  const loadOverview = async () => {
    try {
      const res = await request.get('/stats/overview');
      if (res.success) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('加载概览数据失败:', err);
    }
  };

  const loadDailyData = async () => {
    try {
      const res = await request.get('/stats/daily?days=7');
      if (res.success) {
        setDailyData(res.data || []);
      }
    } catch (err) {
      console.error('加载每日数据失败:', err);
    }
  };

  const getChartOption = () => {
    const dates = dailyData.map(d => d.date);
    const totals = dailyData.map(d => d.total);
    const reservations = dailyData.map(d => d.reservation_count);
    const manuals = dailyData.map(d => d.manual_count);
    const anomalies = dailyData.map(d => d.no_reservation_count + d.mismatch_count + d.overtime_count);

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['总访客', '有预约', '人工放行', '异常记录']
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      series: [
        { name: '总访客', type: 'line', smooth: true, data: totals, itemStyle: { color: '#1677ff' } },
        { name: '有预约', type: 'line', smooth: true, data: reservations, itemStyle: { color: '#52c41a' } },
        { name: '人工放行', type: 'line', smooth: true, data: manuals, itemStyle: { color: '#faad14' } },
        { name: '异常记录', type: 'line', smooth: true, data: anomalies, itemStyle: { color: '#ff4d4f' } }
      ]
    };
  };

  const getPieOption = () => {
    if (!overview) return {};
    return {
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [
        {
          name: '放行方式',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: 'bold' }
          },
          data: [
            { value: overview.reservationCount, name: '有预约', itemStyle: { color: '#52c41a' } },
            { value: overview.manualCount, name: '人工放行', itemStyle: { color: '#faad14' } },
            { value: overview.noReservationCount, name: '无预约', itemStyle: { color: '#ff4d4f' } }
          ]
        }
      ]
    };
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="访客记录总数"
              value={overview?.totalRecords || 0}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="有预约记录"
              value={overview?.reservationCount || 0}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="车牌识别记录"
              value={overview?.recognitionCount || 0}
              prefix={<CameraOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="人工放行记录"
              value={overview?.manualCount || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="无预约放行"
              value={overview?.noReservationCount || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="车牌识别不一致"
              value={overview?.plateMismatchCount || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="超时停留"
              value={overview?.overtimeCount || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="近7日访客趋势" extra={<Tag color="blue">趋势分析</Tag>}>
            <ReactECharts option={getChartOption()} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="放行方式分布">
            <ReactECharts option={getPieOption()} style={{ height: 280 }} />
          </Card>
          <Card title="待复核记录" style={{ marginTop: 16 }}>
            <Statistic
              value={overview?.pendingCount || 0}
              prefix={<AuditOutlined />}
              valueStyle={{ color: '#faad14', fontSize: '36px' }}
            />
            <div style={{ color: '#666', fontSize: '13px', marginTop: 8 }}>
              请及时处理待复核的访客记录
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="热门门岗">
            <List
              dataSource={overview?.topGates || []}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Tag color="blue">{item.gate || '未知门岗'}</Tag>
                    <span>{item.count} 次放行</span>
                  </Space>
                  <RiseOutlined style={{ color: '#52c41a' }} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="操作员放行排行">
            <List
              dataSource={overview?.topOperators || []}
              renderItem={(item, index) => (
                <List.Item>
                  <Space>
                    <Tag color={index === 0 ? 'gold' : index === 1 ? 'default' : 'blue'}>
                      {index + 1}
                    </Tag>
                    <span>{item.operator || '未知'}</span>
                  </Space>
                  <span>{item.count} 次操作</span>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
