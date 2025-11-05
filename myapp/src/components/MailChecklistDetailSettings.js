import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Spin, notification } from "antd";
import { MailOutlined } from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";

export default function MailChecklistDetailSettings() {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const labels = {
    vi: {
      title: "Thông báo nhận mail hoàn thành checklistdetail",
      mailTo: "Danh sách mail nhận",
      mailCc: "Danh sách mail cc", 
      mailBcc: "Danh sách mail bcc",
      mailToPlaceholder: "user1@example.com, user2@example.com",
      mailCcPlaceholder: "cc1@example.com, cc2@example.com",
      mailBccPlaceholder: "bcc1@example.com, bcc2@example.com",
      save: "Lưu",
      cancel: "Hủy",
      saved: "Cài đặt đã được lưu thành công!",
      error: "Có lỗi xảy ra khi lưu cài đặt!",
      loading: "Đang tải...",
    },
    zh: {
      title: "事件管理详情完成邮件通知设置",
      mailTo: "收件人邮件列表",
      mailCc: "抄送邮件列表",
      mailBcc: "密送邮件列表", 
      mailToPlaceholder: "user1@example.com, user2@example.com",
      mailCcPlaceholder: "cc1@example.com, cc2@example.com",
      mailBccPlaceholder: "bcc1@example.com, bcc2@example.com",
      save: "保存",
      cancel: "取消",
      saved: "设置已保存成功！",
      error: "保存设置时出错！",
      loading: "加载中...",
    },
  };
  const t = labels[lang];

  const loadMailRecipients = async () => {
    if (dataLoaded) return;
    try {
      const res = await axios.get('/api/mail-recipients-checklist-detail');
      const list = Array.isArray(res.data) ? res.data : [];
      // The API already returns CHECKLISTDONE recipients, so no need to filter
      const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
      const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
      const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
      form.setFieldsValue({ mailTo, mailCc, mailBcc });
      setDataLoaded(true);
    } catch (e) {
      console.error('Error loading mail recipients:', e);
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    loadMailRecipients();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/mail-recipients-checklist-detail/replace', null, {
        params: {
          to: values.mailTo || '',
          cc: values.mailCc || '',
          bcc: values.mailBcc || ''
        }
      });
      notification.success({
        message: 'Hệ thống',
        description: t.saved,
        placement: 'bottomRight'
      });
    } catch (e) {
      console.error('Error saving mail recipients:', e);
      notification.error({
        message: 'Lỗi',
        description: t.error,
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined />
          <span>{t.title}</span>
        </div>
      }
      bordered
    >
      <Spin spinning={loading && !dataLoaded}>
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          disabled={loading}
        >
          <Form.Item 
            name="mailTo" 
            label={t.mailTo}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t.mailToPlaceholder}
              disabled={loading}
            />
          </Form.Item>
          
          <Form.Item 
            name="mailCc" 
            label={t.mailCc}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t.mailCcPlaceholder}
              disabled={loading}
            />
          </Form.Item>
          
          <Form.Item 
            name="mailBcc" 
            label={t.mailBcc}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t.mailBccPlaceholder}
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
              {t.save}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
}
