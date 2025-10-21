import React, { useEffect, useState } from "react";
import { Layout, Menu, Form, InputNumber, Card, message, Button, Spin } from "antd";
import { SettingOutlined, MailOutlined, HddOutlined, ReloadOutlined } from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";
import { limitSizeService } from "../services/limitSizeService";

const { Sider, Content } = Layout;

function FileLimitSection() {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(null);
  const [limitId, setLimitId] = useState(null);

  const labels = {
    vi: {
      title: "Giới hạn kích thước file upload (MB)",
      placeholder: "Nhập giới hạn kích thước file (MB)",
      saved: "Cài đặt đã được lưu thành công!",
      required: "Vui lòng nhập giới hạn kích thước file!",
      range: "Giới hạn phải từ 1 đến 1000 MB!",
      loading: "Đang tải...",
      error: "Có lỗi xảy ra khi tải cài đặt!",
      refresh: "Làm mới",
    },
    zh: {
      title: "文件上传大小限制 (MB)",
      placeholder: "输入文件大小限制 (MB)",
      saved: "设置已保存成功！",
      required: "请输入文件大小限制！",
      range: "限制必须在1到1000 MB之间！",
      loading: "加载中...",
      error: "加载设置时出错！",
      refresh: "刷新",
    },
  };
  const t = labels[lang];

  const loadCurrentLimit = async () => {
    setLoading(true);
    try {
      const response = await limitSizeService.getFileUploadLimit();
      setCurrentLimit(response.maxSizeMb);
      form.setFieldsValue({ maxFileSize: response.maxSizeMb });
      
      // Also try to get the limit ID for updating
      const allLimits = await limitSizeService.getActiveLimitSizes();
      const fileUploadLimit = allLimits.find(limit => limit.settingName === 'FILE_UPLOAD_LIMIT');
      if (fileUploadLimit) {
        setLimitId(fileUploadLimit.id);
      }
    } catch (error) {
      console.error('Error loading file upload limit:', error);
      // Fallback to localStorage
      const fallbackLimit = parseInt(localStorage.getItem("maxFileSizeMB") || "10");
      setCurrentLimit(fallbackLimit);
      form.setFieldsValue({ maxFileSize: fallbackLimit });
      message.warning(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentLimit();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (limitId) {
        // Update existing limit
        await limitSizeService.updateLimitSize(limitId, {
          settingName: 'FILE_UPLOAD_LIMIT',
          maxSizeMb: values.maxFileSize,
          description: 'Giới hạn kích thước file upload',
          isActive: true,
          updatedBy: 1 // Admin user ID
        });
      } else {
        // Create new limit
        await limitSizeService.createLimitSize({
          settingName: 'FILE_UPLOAD_LIMIT',
          maxSizeMb: values.maxFileSize,
          description: 'Giới hạn kích thước file upload',
          isActive: true,
          createdBy: 1 // Admin user ID
        });
      }
      
      // Update localStorage as fallback
      localStorage.setItem("maxFileSizeMB", values.maxFileSize.toString());
      setCurrentLimit(values.maxFileSize);
      message.success(t.saved);
    } catch (error) {
      console.error('Error saving file upload limit:', error);
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi lưu cài đặt!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t.title}</span>
          {/* Refresh button removed */}
        </div>
      } 
      bordered
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="maxFileSize"
            rules={[
              { required: true, message: t.required },
              { type: "number", min: 1, max: 1000, message: t.range },
            ]}
          >
            <InputNumber 
              style={{ width: 240 }} 
              min={1} 
              max={1000} 
              addonAfter="MB" 
              placeholder={t.placeholder}
              disabled={loading}
            />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              disabled={loading}
            >
              {lang === 'vi' ? 'Lưu' : '保存'}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
}

export default function SettingsPage() {
  const { lang } = useLanguage();

  const labels = {
    vi: {
      menuTitle: "Cài đặt hệ thống",
      fileLimit: "Giới hạn kích thước file upload (MB)",
      mail: "Cài đặt thông báo mail sops",
      building: "Tính năng đang được phát triển.",
    },
    zh: {
      menuTitle: "系统设置",
      fileLimit: "文件上传大小限制 (MB)",
      mail: "SOPS 邮件通知设置",
      building: "该功能正在开发中。",
    },
  };
  const t = labels[lang];

  const [selectedKey, setSelectedKey] = React.useState("file");

  const menuItems = [
    { key: "file", icon: <HddOutlined />, label: t.fileLimit },
    { key: "mail", icon: <MailOutlined />, label: t.mail },
  ];

  const renderContent = () => {
    if (selectedKey === "file") return <FileLimitSection />;
    return (
      <Card title={t.mail} bordered>
        <div>{t.building}</div>
      </Card>
    );
  };

  return (
    <Layout style={{ background: "transparent" }}>
      <Sider width={280} style={{ background: "#fff", padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <SettingOutlined /> {t.menuTitle}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(info) => setSelectedKey(info.key)}
          items={menuItems}
        />
      </Sider>
      <Content style={{ padding: 16 }}>{renderContent()}</Content>
    </Layout>
  );
}


