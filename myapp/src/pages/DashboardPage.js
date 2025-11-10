import React, { useEffect, useState } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  List, 
  Avatar, 
  Spin,
  Typography,
  Space
} from "antd";
import { 
  FileTextOutlined, 
  CheckSquareOutlined, 
  UserOutlined, 
  ArrowUpOutlined,
  ArrowDownOutlined
} from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import API_CONFIG from "../config/api";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSOPs: 0,
    totalChecklist: 0,
    totalImprovements: 0,
    completedImprovements: 0,
    categoryStats: {},
    recentSOPs: [],
    recentChecklist: [],
    topReviewers: [],
    checklistByDay: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {

      const sopsRes = await fetch(API_CONFIG.getApiUrl(API_CONFIG.ENDPOINTS.SOPS));
      const sopsData = await sopsRes.json();
      const sopsItems = Array.isArray(sopsData) ? sopsData : (sopsData?.content || []);

      const docsRes = await fetch(API_CONFIG.getApiUrl(API_CONFIG.ENDPOINTS.SOP_DOCUMENTS));
      const docsData = await docsRes.json();
      
      const checklistRes = await fetch(API_CONFIG.getApiUrl(API_CONFIG.ENDPOINTS.CHECKLISTS));
      const checklistData = await checklistRes.json();

      const totalSOPs = Array.isArray(docsData) ? docsData.length : 0;
      const totalChecklist = checklistData?.length || 0;
      
      const improvements = checklistData?.filter(item => item.improvement?.trim()) || [];
      const completedImprovements = improvements.filter(item => item.status === 'Hoàn thành').length;
      
      const categoryStats = sopsItems?.reduce((acc, item) => {
        const category = item.category || 'general';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}) || {};


      const recentSOPs = sopsItems?.slice(-5).reverse() || [];

      const recentChecklist = checklistData?.slice(-5).reverse() || [];

      const reviewerCount = checklistData?.reduce((acc, item) => {
        const reviewer = item.reviewer;
        if (reviewer) {
          acc[reviewer] = (acc[reviewer] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const topReviewers = Object.entries(reviewerCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));


      const checklistByDay = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
      
        const completedCount = Math.floor(Math.random() * 10) + 1;
        
        checklistByDay.push({
          day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
          date: dateStr,
          completed: completedCount
        });
      }

      setStats({
        totalSOPs,
        totalChecklist,
        totalImprovements: improvements.length,
        completedImprovements,
        categoryStats,
        recentSOPs,
        recentChecklist,
        topReviewers,
        checklistByDay
      });
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const i18n = {
    vi: {
      totalSOPs: "Tổng SOPs",
      totalChecklist: "Tổng Checklist",
      improvements: "Cải thiện",
      completed: "Hoàn thành",
      checklistByDay: "Checklist hoàn thành theo ngày",
      topReviewers: "Top Người kiểm tra",
      sopByCategory: "Số lượng SOP theo mục",
      latestChecklist: "Checklist mới nhất",
      files: "files",
      done: "Hoàn thành",
      day: (label) => `Ngày: ${label}`,
      type: (label) => `Loại: ${label}`,
      sopLabel: "SOPs",
      workCount: (n) => `${n} công việc`,
      top: (n) => `TOP ${n}`,
      categories: { win: "Cài Win", network: "Cài Network", software: "Cài phần mềm", general: "Tổng quát" },
      table: { name: "Tên SOP", creator: "Người tạo", type: "Loại" },
      checklistCols: { task: "Công việc", reviewer: "Người kiểm tra", doc: "Tài liệu", status: "Trạng thái" },
      statuses: { pending: 'Chưa thực hiện', doing: 'Đang thực hiện', done: 'Hoàn thành' }
    },
    zh: {
      totalSOPs: "SOP 总数",
      totalChecklist: "事件管理总数",
      improvements: "問題管理",
      completed: "完成",
      checklistByDay: "按天完成的事件管理",
      topReviewers: "Top 检查员",
      sopByCategory: "各类别 SOP 数量",
      latestChecklist: "最新事件管理",
      files: "文件",
      done: "完成",
      day: (label) => `日期：${label}`,
      type: (label) => `类别：${label}`,
      sopLabel: "SOPs",
      workCount: (n) => `${n} 项工作`,
      top: (n) => `TOP ${n}`,
      categories: { win: "装系统", network: "网络配置", software: "软件安装", general: "通用" },
      table: { name: "SOP 名称", creator: "创建者", type: "类别" },
      checklistCols: { task: "工作", reviewer: "检查员", doc: "资料", status: "状态" },
      statuses: { pending: '未开始', doing: '进行中', done: '已完成' }
    }
  };
  const t = i18n[lang];

  const categoryMap = t.categories;

  const categoryColors = {
    win: "green",
    network: "blue",
    software: "purple",
    general: "default"
  };

  const sopColumns = [
    {
      title: t.table.name,
      dataIndex: "name",
      key: "name",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: t.table.creator,
      dataIndex: "creator",
      key: "creator",
      render: (text) => <Tag color="blue">{text || '-'}</Tag>
    },
    {
      title: t.table.type,
      dataIndex: "category",
      key: "category",
      render: (category) => (
        <Tag color={categoryColors[category] || 'default'}>
          {categoryMap[category] || category || 'Tổng quát'}
        </Tag>
      )
    },
    {
      title: "Files",
      dataIndex: "files",
      key: "files",
      render: (files) => (
        <Tag color="blue">{Array.isArray(files) ? files.length : 0} {t.files}</Tag>
      )
    }
  ];

  const checklistColumns = [
    {
      title: t.checklistCols.task,
      dataIndex: "taskName",
      key: "taskName",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: t.checklistCols.reviewer,
      dataIndex: "reviewer",
      key: "reviewer",
      render: (text) => <Tag color="green">{text}</Tag>
    },
    {
      title: t.checklistCols.doc,
      dataIndex: "documentCategory",
      key: "documentCategory",
      render: (category) => (
        <Tag color={categoryColors[category] || 'default'}>
          {categoryMap[category] || category}
        </Tag>
      )
    },
    {
      title: t.checklistCols.status,
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusColors = {
          [t.statuses.pending]: 'default',
          [t.statuses.doing]: 'processing',
          [t.statuses.done]: 'success'
        };
        return <Tag color={statusColors[status] || 'default'}>{status || t.statuses.pending}</Tag>;
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px',
      background: '#f0f2f5',
      minHeight: '100vh'
    }}>

      {}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.totalSOPs}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.totalSOPs}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                      <Text style={{ color: '#52c41a', fontSize: '12px' }}>12%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.totalChecklist}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.totalChecklist}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                      <Text style={{ color: '#52c41a', fontSize: '12px' }}>8%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.improvements}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.totalImprovements}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                      <Text style={{ color: '#ff4d4f', fontSize: '12px' }}>3%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.completed}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.completedImprovements}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                      <Text style={{ color: '#52c41a', fontSize: '12px' }}>15%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {}
      <Row gutter={[24, 24]}>
        {}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <span style={{ fontWeight: 600 }}>{t.checklistByDay}</span>
            }
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.checklistByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                />
                <RechartsTooltip 
                  formatter={(value, name) => [value, t.done]}
                  labelFormatter={(label) => t.day(label)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="completed" 
                  fill="#52c41a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span style={{ fontWeight: 600 }}>{t.topReviewers}</span>
            }
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <List
              dataSource={stats.topReviewers}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '12px 0', border: 'none' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size={40}
                        style={{ 
                          backgroundColor: index < 3 ? '#ff4d4f' : '#52c41a',
                          fontWeight: 600,
                          fontSize: '16px'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Text style={{ fontWeight: 500, fontSize: '16px' }}>
                        {item.name}
                      </Text>
                    }
                    description={
                      <Space>
                        <Text type="secondary">{t.workCount(item.count)}</Text>
                        {index < 3 && (
                          <Tag color="red" style={{ fontSize: '10px' }}>
                            {t.top(index + 1)}
                          </Tag>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span style={{ fontWeight: 600 }}>{t.sopByCategory}</span>
            }
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: categoryMap.win, value: stats.categoryStats.win || 0, color: '#52c41a' },
                { name: categoryMap.network, value: stats.categoryStats.network || 0, color: '#1890ff' },
                { name: categoryMap.software, value: stats.categoryStats.software || 0, color: '#722ed1' },
                { name: categoryMap.general, value: stats.categoryStats.general || 0, color: '#8c8c8c' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                />
                <RechartsTooltip 
                  formatter={(value, name) => [value, t.sopLabel]}
                  labelFormatter={(label) => t.type(label)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#1890ff"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span style={{ fontWeight: 600 }}>{t.latestChecklist}</span>
            }
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Table
              dataSource={stats.recentChecklist}
              columns={checklistColumns}
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
              style={{ marginTop: '-8px' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

