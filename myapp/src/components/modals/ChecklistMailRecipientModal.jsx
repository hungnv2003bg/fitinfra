import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, message, Form } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import axios from '../../plugins/axios';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ChecklistMailRecipientModal({ 
  visible, 
  onCancel, 
  checklist 
}) {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [toEmails, setToEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [form] = Form.useForm();

  const t = lang === 'zh' ? {
    title: (taskName) => `邮件列表管理 - ${taskName || ''}`,
    ok: '保存',
    cancel: '取消',
    toLabel: '收件人列表 (TO)',
    ccLabel: '抄送列表 (CC)',
    bccLabel: '密送列表 (BCC)',
    sys: '系统',
    fetch404: '后端未提供按事件查询的 API，请更新后端。',
    fetchErr: '加载邮件列表失败',
    saveSuccess: '已保存该事件的邮件列表',
    save404: '后端未提供按事件查询的 API，请更新后端。',
    saveErr: '保存邮件列表失败',
  } : {
    title: (taskName) => `Quản lý danh sách mail - ${taskName || ''}`,
    ok: 'Lưu',
    cancel: 'Hủy',
    toLabel: 'Danh sách mail nhận (TO)',
    ccLabel: 'Danh sách mail cc (CC)',
    bccLabel: 'Danh sách mail bcc (BCC)',
    sys: 'Hệ thống',
    fetch404: 'API per-checklist chưa có trên server. Vui lòng cập nhật backend.',
    fetchErr: 'Lỗi khi tải danh sách mail recipients',
    saveSuccess: 'Đã lưu danh sách mail recipients theo checklist',
    save404: 'API per-checklist chưa có trên server. Vui lòng cập nhật backend.',
    saveErr: 'Lỗi khi lưu danh sách mail recipients',
  };

  const fetchRecipients = async () => {
    if (!checklist?.id) return;
    setLoading(true);
    try {
      const [toRes, ccRes, bccRes] = await Promise.all([
        axios.get(`/api/checklist-mail-recipients/checklist/${checklist.id}/type/TO`),
        axios.get(`/api/checklist-mail-recipients/checklist/${checklist.id}/type/CC`),
        axios.get(`/api/checklist-mail-recipients/checklist/${checklist.id}/type/BCC`)
      ]);

      const toEmailsVal = (toRes.data || []).map(r => r.email).join(', ');
      const ccEmailsVal = (ccRes.data || []).map(r => r.email).join(', ');
      const bccEmailsVal = (bccRes.data || []).map(r => r.email).join(', ');

      setToEmails(toEmailsVal);
      setCcEmails(ccEmailsVal);
      setBccEmails(bccEmailsVal);

      form.setFieldsValue({
        toEmails: toEmailsVal,
        ccEmails: ccEmailsVal,
        bccEmails: bccEmailsVal
      });
    } catch (error) {
      console.error('Error fetching recipients:', error);
      const is404 = error?.response?.status === 404;
      if (is404) {
        message.error({ message: t.sys, description: t.fetch404 });
      } else {
        message.error({ message: t.sys, description: t.fetchErr });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && checklist?.id) {
      fetchRecipients();
    }
  }, [visible, checklist?.id]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Xóa tất cả recipients cũ của checklist này
      const allRecipients = await axios.get(`/api/checklist-mail-recipients/checklist/${checklist.id}`);
      for (const recipient of allRecipients.data || []) {
        await axios.delete(`/api/checklist-mail-recipients/${recipient.id}`);
      }

      // Thêm recipients mới theo type
      const addEmails = async (raw, type) => {
        if (!raw) return;
        const list = raw.split(',').map(e => e.trim()).filter(Boolean);
        for (const email of list) {
          await axios.post('/api/checklist-mail-recipients', {
            checklistId: checklist.id,
            email,
            type,
            note: ''
          });
        }
      };

      await addEmails(values.toEmails, 'TO');
      await addEmails(values.ccEmails, 'CC');
      await addEmails(values.bccEmails, 'BCC');

      message.success({ message: t.sys, description: t.saveSuccess });
      onCancel();
    } catch (error) {
      console.error('Error saving recipients:', error);
      const is404 = error?.response?.status === 404;
      if (is404) {
        message.error({ message: t.sys, description: t.save404 });
      } else {
        message.error({ message: t.sys, description: t.saveErr });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined />
          <span>{t.title(checklist?.taskName)}</span>
        </div>
      }
      open={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      onOk={handleSave}
      okText={t.ok}
      cancelText={t.cancel}
      width={600}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="toEmails"
          label={t.toLabel}
        >
          <Input.TextArea 
            rows={3} 
            placeholder="user1@example.com, user2@example.com"
          />
        </Form.Item>

        <Form.Item
          name="ccEmails"
          label={t.ccLabel}
        >
          <Input.TextArea 
            rows={3} 
            placeholder="cc1@example.com, cc2@example.com"
          />
        </Form.Item>

        <Form.Item
          name="bccEmails"
          label={t.bccLabel}
        >
          <Input.TextArea 
            rows={3} 
            placeholder="bcc1@example.com, bcc2@example.com"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
