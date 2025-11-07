import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, notification, Select } from "antd";
import dayjs from 'dayjs';
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ImprovementEditModal({ open, record, onCancel, onSaved, groups = [], users = [] }) {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const { nguoiDung } = useSelector(state => state.user);
  const [improvementEvents, setImprovementEvents] = useState([]);
  // Simplified: remove upload/progress fields

  const t = lang === 'zh' ? {
    title: '编辑改善',
    category: '类别',
    categoryPh: '任务名称',
    issueDescription: '改善内容',
    issueDescriptionRequired: '请输入改善内容',
    responsible: '负责人',
    responsiblePh: '选择负责人',
    collaborators: '协同人',
    collaboratorsPh: '输入协同人',
    improvementEvent: '事件类型',
    improvementEventPh: '选择事件类型',
    plannedDueAt: '预计完成时间',
    actionPlan: '改善行动',
    note: '备注',
    save: '保存',
    cancel: '取消',
    sys: '系统',
    updateSuccess: '更新成功',
    updateFailed: '更新失败',
  } : {
    title: 'Sửa cải thiện',
    category: 'Hạng mục',
    categoryPh: 'Tên công việc',
    issueDescription: 'Nội dung cải thiện',
    issueDescriptionRequired: 'Vui lòng nhập nội dung cải thiện',
    responsible: 'Người phụ trách',
    responsiblePh: 'Chọn người phụ trách',
    collaborators: 'Người phối hợp',
    collaboratorsPh: 'Nhập người phối hợp',
    improvementEvent: 'Loại sự kiện',
    improvementEventPh: 'Chọn loại sự kiện',
    plannedDueAt: 'Thời gian dự kiến hoàn thành',
    actionPlan: 'Hành động cải thiện',
    note: 'Ghi chú',
    save: 'Lưu',
    cancel: 'Hủy',
    sys: 'Hệ thống',
    updateSuccess: 'Cập nhật thành công',
    updateFailed: 'Cập nhật thất bại',
  };

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
      // Normalize responsible and collaborators to ensure correct format
      const normalizeValue = (val) => {
        if (!val) return val;
        if (typeof val === 'string') {
          // Fix format: "group1" -> "group:1", "user3" -> "user:3"
          if (val.match(/^group\d+$/)) {
            return val.replace(/^group(\d+)$/, 'group:$1');
          }
          if (val.match(/^user\d+$/)) {
            return val.replace(/^user(\d+)$/, 'user:$1');
          }
        }
        return val;
      };

      const normalizedResponsible = Array.isArray(record.responsible) 
        ? record.responsible.map(normalizeValue)
        : (record.responsible ? [normalizeValue(record.responsible)] : []);
      
      const normalizedCollaborators = Array.isArray(record.collaborators)
        ? record.collaborators.map(normalizeValue)
        : [];

      form.setFieldsValue({
        category: record.category,
        issueDescription: record.issueDescription,
        responsible: normalizedResponsible,
        collaborators: normalizedCollaborators,
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

      api.success({ message: t.sys, description: t.updateSuccess, placement: 'bottomRight' });
      onSaved?.();
      onCancel?.();
    } catch (e) {
      api.error({ message: t.sys, description: t.updateFailed, placement: 'bottomRight' });
    }
  };

  return (
    <>
      {contextHolder}
      <Modal 
        title={t.title} 
        open={open} 
        onCancel={onCancel} 
        onOk={handleOk} 
        okText={t.save}
        cancelText={t.cancel}
        width={720}
        style={{ top: '70px' }}
        centered={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label={t.category}><Input placeholder={t.categoryPh} disabled /></Form.Item>

          <Form.Item 
            name="issueDescription" 
            label={t.issueDescription}
            rules={[{ required: true, message: t.issueDescriptionRequired }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="responsible" label={t.responsible}>
              <Select 
                mode="multiple"
                placeholder={t.responsiblePh} 
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={createSelectOptions()}
                maxTagCount="responsive"
              />
            </Form.Item>
            <Form.Item name="collaborators" label={t.collaborators}>
              <Select 
                mode="tags"
                placeholder={t.collaboratorsPh} 
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
            <Form.Item name="improvementEventId" label={t.improvementEvent}>
              <Select 
                placeholder={t.improvementEventPh} 
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
            <Form.Item name="plannedDueAt" label={t.plannedDueAt}>
              <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>

          <Form.Item name="actionPlan" label={t.actionPlan}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="note" label={t.note}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}



