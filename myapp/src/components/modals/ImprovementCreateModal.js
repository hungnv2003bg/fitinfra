import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, notification, Select } from "antd";
import dayjs from 'dayjs';
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";

export default function ImprovementCreateModal({ open, onCancel, onCreated, groups = [], users = [] }) {
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const { nguoiDung } = useSelector(state => state.user);
  const [improvementEvents, setImprovementEvents] = useState([]);
  // simplified: no file upload in create modal

  const createSelectOptions = () => {
    const groupOptions = groups.map(group => ({
      key: `group:${group.id}`,
      value: `group:${group.id}`,
      label: group.name
    }));
    const userOptions = users.map(user => ({
      key: `user:${user.userID}`,
      value: `user:${user.userID}`,
      label: user.fullName || user.manv || `User ${user.userID}`
    }));
    return [...groupOptions, ...userOptions];
  };

  // Helper để tạo options cho Select (chỉ users cho người phối hợp)
  const createCollaboratorOptions = () => {
    const userOptions = users.map(user => ({
      key: `user:${user.userID}`,
      value: `user:${user.userID}`,
      label: user.fullName || user.manv || `User ${user.userID}`
    }));
    return userOptions;
  };

  useEffect(() => {
    const fetchImprovementEvents = async () => {
      try {
        const response = await axios.get('/api/improvement-events');
        setImprovementEvents(response.data || []);
      } catch (error) {
        setImprovementEvents([]);
      }
    };
    if (open) {
      fetchImprovementEvents();
      
      form.resetFields();
    }
  }, [open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const body = {
        category: values.category,
        issueDescription: values.issueDescription,
        responsible: values.responsible,
        collaborators: values.collaborators || [],
        actionPlan: values.actionPlan,
        plannedDueAt: values.plannedDueAt ? values.plannedDueAt.toISOString() : null,
        note: values.note,
        improvementEvent: values.improvementEventId ? { id: values.improvementEventId } : null,
        lastEditedBy: nguoiDung?.userID || null,
      };

      await axios.post('/api/improvements', body);

      api.success({ message: 'Hệ thống', description: 'Tạo mới thành công', placement: 'bottomRight' });
      onCreated?.();
      onCancel?.();
    } catch (e) {
      api.error({ message: 'Tạo mới thất bại', placement: 'bottomRight' });
    }
  };

  return (
    <>
      {contextHolder}
      <Modal 
        title={`Thêm cải thiện`} 
        open={open} 
        onCancel={onCancel} 
        onOk={handleOk} 
        okText="Tạo mới"
        width={720}
        style={{ top: '70px' }}
        centered={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Hạng mục" rules={[{ required: true, message: 'Nhập hạng mục' }]}> 
            <Input placeholder="Tên hạng mục" />
          </Form.Item>
          <Form.Item name="issueDescription" label="Nội dung cải thiện" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="responsible" label="Người phụ trách">
              <Select 
                mode="multiple"
                placeholder="Chọn người phụ trách" 
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={createCollaboratorOptions()}
                maxTagCount="responsive"
              />
            </Form.Item>
            <Form.Item name="collaborators" label="Người phối hợp">
              <Select 
                mode="tags"
                placeholder="Nhập người phối hợp" 
                showSearch
                allowClear
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={createCollaboratorOptions()}
                dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
                tokenSeparators={[',']}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="improvementEventId" label="Loại sự kiện">
              <Select 
                placeholder="Chọn loại sự kiện" 
                allowClear
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              >
                {improvementEvents.map(event => (
                  <Select.Option key={event.id} value={event.id}>
                    {event.eventName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="plannedDueAt" label="Thời gian dự kiến hoàn thành">
              <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>

          <Form.Item name="actionPlan" label="Hành động cải thiện"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}


