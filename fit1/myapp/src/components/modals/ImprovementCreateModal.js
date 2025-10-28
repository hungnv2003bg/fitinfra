import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, notification, Select, InputNumber, Upload, Button, List, Tag } from "antd";
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";
import { validateFileSize } from "../../utils/fileUtils";

export default function ImprovementCreateModal({ open, onCancel, onCreated, groups = [], users = [] }) {
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const { nguoiDung } = useSelector(state => state.user);
  const [improvementEvents, setImprovementEvents] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // {name, originFileObj}

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
      setUploadedFiles([]);
      form.resetFields();
    }
  }, [open]);

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

      // Upload files nếu có
      let newUploadedFiles = [];
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          if (file.originFileObj) {
            const uploadResult = await uploadFile(file.originFileObj, values.category);
            newUploadedFiles.push({ name: uploadResult.name, url: uploadResult.url });
          }
        }
      }

      const body = {
        category: values.category,
        issueDescription: values.issueDescription,
        responsible: values.responsible,
        collaborators: values.collaborators || [],
        actionPlan: values.actionPlan,
        plannedDueAt: values.plannedDueAt ? values.plannedDueAt.toISOString() : null,
        completedAt: null,
        note: values.note,
        status: values.status || 'PENDING',
        progress: values.progress != null ? Number(values.progress) : null,
        progressDetail: values.progressDetail,
        improvementEvent: values.improvementEventId ? { id: values.improvementEventId } : null,
        lastEditedBy: nguoiDung?.userID || null,
        files: newUploadedFiles,
      };

      await axios.post('/api/improvements', body);

      api.success({ message: 'Tạo mới thành công', placement: 'bottomRight' });
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
        width={650}
        style={{ top: '70px' }}
        centered={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Hạng mục" rules={[{ required: true, message: 'Nhập hạng mục' }]}>
            <Input placeholder="Tên công việc" />
          </Form.Item>

          <Form.Item name="issueDescription" label="Nội dung công việc" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="responsible" label="Người phụ trách">
            <Select 
              placeholder="Tìm kiếm và chọn người phụ trách" 
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={createSelectOptions()}
            />
          </Form.Item>
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
          <Form.Item name="collaborators" label="Người phối hợp">
            <Select 
              mode="multiple"
              placeholder="Tìm kiếm và chọn người phối hợp" 
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={createSelectOptions()}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue={'PENDING'}>
            <Select options={[
              { value: 'PENDING', label: 'Chưa thực hiện' }, 
              { value: 'IN_PROGRESS', label: 'Đang thực hiện' }, 
              { value: 'DONE', label: 'Hoàn thành' }
            ]} />
          </Form.Item>
          <Form.Item name="plannedDueAt" label="Thời gian dự kiến hoàn thành">
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="actionPlan" label="Hành động cải thiện"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="progress" label="Tiến độ (%)"><InputNumber min={0} max={100} style={{ width: 160 }} /></Form.Item>
          <Form.Item name="progressDetail" label="Nội dung tiến độ"><Input.TextArea rows={3} placeholder="Mô tả chi tiết tiến độ hiện tại" /></Form.Item>

          {/* Upload files */}
          <Form.Item label="Tài liệu đính kèm">
            <Upload
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const { isValid, errorMessage } = validateFileSize(file);
                if (!isValid) {
                  api.error({ message: errorMessage, placement: 'bottomRight' });
                  return false;
                }
                return false; // prevent auto upload
              }}
              onChange={(info) => {
                const { fileList } = info;
                const newFiles = fileList.filter(f => f.originFileObj);
                const mapped = newFiles.map(f => ({ uid: f.uid, name: f.name, originFileObj: f.originFileObj }));
                setUploadedFiles(prev => {
                  const exists = prev.map(f => f.name);
                  const uniques = mapped.filter(f => !exists.includes(f.name));
                  return [...prev, ...uniques];
                });
              }}
            >
              <Button icon={<UploadOutlined />} size="small">Chọn tài liệu</Button>
            </Upload>

            {uploadedFiles?.length > 0 && (
              <List 
                style={{ marginTop: 12 }}
                size="small"
                dataSource={uploadedFiles}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))} 
                      />
                    ]}
                  >
                    <Tag color="blue">#{index + 1}</Tag>
                    <span style={{ marginLeft: 8 }}>{file.name}</span>
                    <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                      (đã chọn)
                    </span>
                  </List.Item>
                )}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}


