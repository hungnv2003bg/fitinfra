import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, notification, Select } from "antd";
import dayjs from 'dayjs';
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";

export default function ImprovementEditModal({ open, record, onCancel, onSaved, groups = [], users = [] }) {
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const { nguoiDung } = useSelector(state => state.user);
  const [improvementEvents, setImprovementEvents] = useState([]);
  // Simplified: remove upload/progress fields

  // Helper functions để hiển thị tên group và user (same as in ImprovementPage)
  function getUserDisplayName(userId) {
    if (!userId) return '-';
    if (nguoiDung?.userID === userId) {
      return nguoiDung?.fullName || nguoiDung?.manv || `User ${userId}`;
    }
    const user = users.find(u => u.userID === userId);
    if (user) {
      return user.fullName || user.manv || `User ${userId}`;
    }
    return `User ${userId}`;
  }

  function getGroupDisplayName(groupId) {
    if (!groupId) return '-';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  }

  // Helper để parse và hiển thị responsible (có thể là group:ID hoặc user:ID)
  function getResponsibleDisplay(responsible) {
    if (!responsible) return '-';
    
    if (typeof responsible === 'string') {
      if (responsible.startsWith('group:')) {
        const groupId = parseInt(responsible.replace('group:', ''));
        return getGroupDisplayName(groupId);
      } else if (responsible.startsWith('user:')) {
        const userId = parseInt(responsible.replace('user:', ''));
        return getUserDisplayName(userId);
      }
      return responsible;
    }
    return responsible;
  }

  // Helper để tạo options cho Select (groups và users cho người phụ trách)
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

  // Fetch improvement events
  useEffect(() => {
    const fetchImprovementEvents = async () => {
      try {
        const response = await axios.get('/api/improvement-events');
        setImprovementEvents(response.data || []);
      } catch (error) {
        console.error('Error fetching improvement events:', error);
        setImprovementEvents([]);
      }
    };
    
    if (open) {
      fetchImprovementEvents();
    }
  }, [open]);

  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        category: record.category,
        issueDescription: record.issueDescription,
        responsible: Array.isArray(record.responsible) ? record.responsible : (record.responsible ? [record.responsible] : []),
        collaborators: Array.isArray(record.collaborators) ? record.collaborators : [],
        actionPlan: record.actionPlan,
        plannedDueAt: record.plannedDueAt ? dayjs(record.plannedDueAt) : null,
        note: record.note,
        improvementEventId: record.improvementEventId || (record.improvementEvent ? record.improvementEvent.id : undefined),
      });
      
    } else {
      form.resetFields();
    }
  }, [record]);

  const uploadFile = async (file, category) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('improvementName', category);

    const response = await fetch(API_CONFIG.getImprovementUploadUrl(), {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorData}`);
    }
    const result = await response.json();
    return result; // { url, name }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Tự động set completedAt khi trạng thái là DONE
      const patch = {
        category: values.category,
        issueDescription: values.issueDescription,
        responsible: values.responsible,
        collaborators: values.collaborators || [],
        actionPlan: values.actionPlan,
        plannedDueAt: values.plannedDueAt ? values.plannedDueAt.toISOString() : null,
        note: values.note,
        improvementEvent: values.improvementEventId ? { id: values.improvementEventId } : null,
        lastEditedBy: nguoiDung?.userID, // Thêm thông tin người sửa cuối cùng
      };

      await axios.patch(`/api/improvements/${encodeURIComponent(String(record.improvementID || record.id))}`, patch);

      api.success({ message: 'Cập nhật thành công', placement: 'bottomRight' });
      onSaved?.();
      onCancel?.();
    } catch (e) {
      api.error({ message: 'Cập nhật thất bại', placement: 'bottomRight' });
    }
  };

  return (
    <>
      {contextHolder}
      <Modal 
        title={`Sửa cải thiện`} 
        open={open} 
        onCancel={onCancel} 
        onOk={handleOk} 
        okText="Lưu"
        width={720}
        style={{ top: '70px' }}
        centered={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Hạng mục"><Input placeholder="Tên công việc" disabled /></Form.Item>

          <Form.Item name="issueDescription" label="Nội dung cải thiện"><Input.TextArea rows={3} /></Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="responsible" label="Người phụ trách">
              <Select 
                mode="multiple"
                placeholder="Chọn người phụ trách" 
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
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
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
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
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
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



