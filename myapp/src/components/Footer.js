import React from 'react';
import { Layout, Row, Col, Typography, Divider } from 'antd';
import { 
  FacebookOutlined, 
  LinkedinOutlined, 
  TwitterOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined 
} from '@ant-design/icons';

const { Footer: AntFooter } = Layout;
const { Text, Title } = Typography;

const Footer = () => {
  return (
    <AntFooter style={{ 
      background: '#ffffff', 
      color: '#333333', 
      padding: '24px 24px 16px 224px',
      marginTop: 'auto',
      borderTop: '1px solid #f0f0f0'
    }}>
      <div style={{ padding: '0 0' }}>
        {}
        <Row gutter={[32, 16]}>
          <Col xs={12} sm={6} md={6}>
            <Title level={5} style={{ color: '#333333', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              Về chúng tôi
            </Title>
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Tầm nhìn và sứ mệnh</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Tổng quan công ty</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Lịch sử phát triển</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={6}>
            <Title level={5} style={{ color: '#333333', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              Sản phẩm & Dịch vụ
            </Title>
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Giải pháp phần mềm</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Tư vấn công nghệ</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Hỗ trợ kỹ thuật</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={6}>
            <Title level={5} style={{ color: '#333333', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              Tin tức & Sự kiện
            </Title>
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Tin tức công nghệ</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Sự kiện nổi bật</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Thông báo</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={6}>
            <Title level={5} style={{ color: '#333333', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              Hỗ trợ
            </Title>
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Trung tâm trợ giúp</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Tài liệu hướng dẫn</div>
              <div style={{ marginBottom: '6px', cursor: 'pointer' }}>Liên hệ hỗ trợ</div>
            </div>
          </Col>
        </Row>

        <Divider style={{ borderColor: '#f0f0f0', margin: '20px 0' }} />

        {}
        <Row justify="start" align="middle">
          <Col>
            <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
              © 2024 FIT - Flexible IT Solutions. Tất cả quyền được bảo lưu.
            </Text>
          </Col>
        </Row>
      </div>
    </AntFooter>
  );
};

export default Footer;

