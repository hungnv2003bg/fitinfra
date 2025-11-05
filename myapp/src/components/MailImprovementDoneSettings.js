import React, { useEffect, useState } from "react";
import { Card, Form, Input, Button, notification, Spin } from "antd";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";

export default function MailImprovementDoneSettings() {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const labels = {
    vi: {
      title: "Thông báo mail cải thiện",
      save: "Lưu",
      saved: "Đã lưu cấu hình",
      to: "Danh sách mail nhận (TO)",
      cc: "Danh sách mail cc (CC)",
      bcc: "Danh sách mail bcc (BCC)",
    },
    en: {
      title: "Improvement completion notification",
      save: "Save",
      saved: "Saved",
      to: "To",
      cc: "Cc",
      bcc: "Bcc",
    },
    zh: {
      title: "改善完成通知",
      save: "保存",
      saved: "已保存",
      to: "收件人 (TO)",
      cc: "抄送 (CC)",
      bcc: "密送 (BCC)",
    },
  };
  const t = labels[lang] || labels.vi;

  useEffect(() => {
    if (dataLoaded) return;
    (async () => {
      try {
        const res = await axios.get("/api/mail-recipients-improvement-done");
        const list = Array.isArray(res.data) ? res.data : [];
        const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
        const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
        const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
        form.setFieldsValue({ mailTo, mailCc, mailBcc });
        setDataLoaded(true);
      } catch (e) {
        setDataLoaded(true);
      }
    })();
  }, [dataLoaded, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/mail-recipients-improvement-done/replace', null, {
        params: {
          to: values.mailTo || '',
          cc: values.mailCc || '',
          bcc: values.mailBcc || ''
        }
      });
      notification.success({ message: t.saved, placement: 'bottomRight' });
    } catch (e) {
      notification.error({ message: 'Lỗi', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t.title} bordered>
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="mailTo" label={t.to}>
            <Input.TextArea rows={2} placeholder="user1@example.com, user2@example.com" />
          </Form.Item>
          <Form.Item name="mailCc" label={t.cc}>
            <Input.TextArea rows={2} placeholder="cc1@example.com, cc2@example.com" />
          </Form.Item>
          <Form.Item name="mailBcc" label={t.bcc}>
            <Input.TextArea rows={2} placeholder="bcc1@example.com, bcc2@example.com" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">{t.save}</Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
}


