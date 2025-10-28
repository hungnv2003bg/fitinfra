import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, message, Form } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import axios from '../../plugins/axios';

export default function ChecklistMailRecipientModal({ 
  visible, 
  onCancel, 
  checklist 
}) {
  const [loading, setLoading] = useState(false);
  const [toEmails, setToEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [form] = Form.useForm();

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
        message.error('API per-checklist chưa có trên server. Vui lòng cập nhật backend.');
      } else {
        message.error('Lỗi khi tải danh sách mail recipients');
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

      message.success('Đã lưu danh sách mail recipients theo checklist');
      onCancel();
    } catch (error) {
      console.error('Error saving recipients:', error);
      const is404 = error?.response?.status === 404;
      if (is404) {
        message.error('API per-checklist chưa có trên server. Vui lòng cập nhật backend.');
      } else {
        message.error('Lỗi khi lưu danh sách mail recipients');
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
          <span>Quản lý danh sách mail - {checklist?.taskName}</span>
        </div>
      }
      open={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      onOk={handleSave}
      okText="Lưu"
      cancelText="Hủy"
      width={600}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="toEmails"
          label="Danh sách mail nhận (TO)"
        >
          <Input.TextArea 
            rows={3} 
            placeholder="user1@example.com, user2@example.com"
          />
        </Form.Item>

        <Form.Item
          name="ccEmails"
          label="Danh sách mail cc (CC)"
        >
          <Input.TextArea 
            rows={3} 
            placeholder="cc1@example.com, cc2@example.com"
          />
        </Form.Item>

        <Form.Item
          name="bccEmails"
          label="Danh sách mail bcc (BCC)"
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
