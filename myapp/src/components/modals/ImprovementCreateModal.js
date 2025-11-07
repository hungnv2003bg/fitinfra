import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, notification, Select } from "antd";
import dayjs from 'dayjs';
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ImprovementCreateModal({ open, onCancel, onCreated, groups = [], users = [] }) {
  const { lang } = useLanguage();
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

  const t = lang === 'zh' ? {
    title: '新增改善',
    category: '类别',
    categoryPh: '输入类别',
    categoryRequired: '请输入类别',
    issueDescription: '改善内容',
    issueDescriptionRequired: '请输入内容',
    responsible: '负责人',
    responsiblePh: '选择负责人',
    collaborators: '协同人',
    collaboratorsPh: '输入协同人',
    improvementEvent: '事件类型',
    improvementEventPh: '选择事件类型',
    plannedDueAt: '预计完成时间',
    actionPlan: '改善行动',
    note: '备注',
    ok: '创建',
    cancel: '取消',
    sys: '系统',
    createSuccess: '创建成功',
    createFail: '创建失败',
  } : {
    title: 'Thêm cải thiện',
    category: 'Hạng mục',
    categoryPh: 'Tên hạng mục',
    categoryRequired: 'Nhập hạng mục',
    issueDescription: 'Nội dung cải thiện',
    issueDescriptionRequired: 'Nhập nội dung',
    responsible: 'Người phụ trách',
    responsiblePh: 'Chọn người phụ trách',
    collaborators: 'Người phối hợp',
    collaboratorsPh: 'Nhập người phối hợp',
    improvementEvent: 'Loại sự kiện',
    improvementEventPh: 'Chọn loại sự kiện',
    plannedDueAt: 'Thời gian dự kiến hoàn thành',
    actionPlan: 'Hành động cải thiện',
    note: 'Ghi chú',
    ok: 'Tạo mới',
    cancel: 'Hủy',
    sys: 'Hệ thống',
    createSuccess: 'Tạo mới thành công',
    createFail: 'Tạo mới thất bại',
  };

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

      api.success({ message: t.sys, description: t.createSuccess, placement: 'bottomRight' });
      onCreated?.();
      onCancel?.();
    } catch (e) {
      api.error({ message: t.sys, description: t.createFail, placement: 'bottomRight' });
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
        okText={t.ok}
        cancelText={t.cancel}
        width={720}
        style={{ top: '70px' }}
        centered={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label={t.category} rules={[{ required: true, message: t.categoryRequired }]}> 
            <Input placeholder={t.categoryPh} />
          </Form.Item>
          <Form.Item name="issueDescription" label={t.issueDescription} rules={[{ required: true, message: t.issueDescriptionRequired }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="responsible" label={t.responsible}>
              <Select 
                mode="multiple"
                placeholder={t.responsiblePh} 
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={createCollaboratorOptions()}
                maxTagCount="responsive"
              />
            </Form.Item>
            <Form.Item name="collaborators" label={t.collaborators}>
              <Select 
                mode="tags"
                placeholder={t.collaboratorsPh} 
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
            <Form.Item name="improvementEventId" label={t.improvementEvent}>
              <Select 
                placeholder={t.improvementEventPh} 
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


