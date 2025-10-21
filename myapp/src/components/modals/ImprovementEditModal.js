import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, notification, Select, InputNumber, Upload, Button, List, Tag } from "antd";
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";
import { validateFileSize, formatFileSize } from "../../utils/fileUtils";

export default function ImprovementEditModal({ open, record, onCancel, onSaved, groups = [], users = [] }) {
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const { nguoiDung } = useSelector(state => state.user);
  const [improvementEvents, setImprovementEvents] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // {name, url}
  const [existingFiles, setExistingFiles] = useState([]); // record.files (FileInfo)

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

  // Helper để tạo options cho Select (groups và users)
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
        responsible: record.responsible,
        collaborators: Array.isArray(record.collaborators) ? record.collaborators : [],
        actionPlan: record.actionPlan,
        plannedDueAt: record.plannedDueAt ? dayjs(record.plannedDueAt) : null,
        note: record.note,
        status: record.status,
        progress: record.progress,
        progressDetail: record.progressDetail,
        improvementEventId: record.improvementEventId || (record.improvementEvent ? record.improvementEvent.id : undefined),
      });
      setExistingFiles(Array.isArray(record.files) ? record.files : []);
      setUploadedFiles([]);
    } else {
      form.resetFields();
      setExistingFiles([]);
      setUploadedFiles([]);
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
      let completedAt = null;
      if (values.status === 'DONE') {
        completedAt = new Date().toISOString();
      } else if (record && record.completedAt) {
        // Giữ nguyên completedAt nếu đã có và trạng thái không phải DONE
        completedAt = record.completedAt;
      }
      
      // Upload files mới nếu có
      let newUploadedFiles = [];
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          if (file.originFileObj) {
            const uploadResult = await uploadFile(file.originFileObj, values.category || record?.category);
            newUploadedFiles.push({
              name: uploadResult.name,
              url: uploadResult.url,
            });
          }
        }
      }

      const patch = {
        category: values.category,
        issueDescription: values.issueDescription,
        responsible: values.responsible,
        collaborators: values.collaborators || [],
        actionPlan: values.actionPlan,
        plannedDueAt: values.plannedDueAt ? values.plannedDueAt.toISOString() : null,
        completedAt,
        note: values.note,
        status: values.status,
        progress: values.progress != null ? Number(values.progress) : null,
        progressDetail: values.progressDetail,
        improvementEvent: values.improvementEventId ? { id: values.improvementEventId } : null,
        lastEditedBy: nguoiDung?.userID, // Thêm thông tin người sửa cuối cùng
        files: [
          ...(Array.isArray(existingFiles) ? existingFiles.map(f => ({
            name: f.name,
            url: f.url,
            uid: f.uid,
          })) : []),
          ...newUploadedFiles,
        ],
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
        width={650}
        style={{ top: '70px' }}
        centered={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Hạng mục"><Input placeholder="Tên công việc" /></Form.Item>
          
          <Form.Item name="issueDescription" label="Nội dung công việc"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="responsible" label="Người phụ trách">
            <Select 
              placeholder="Tìm kiếm và chọn người phụ trách" 
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={createSelectOptions()}
            />
          </Form.Item>
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
          <Form.Item name="collaborators" label="Người phối hợp">
            <Select 
              mode="multiple"
              placeholder="Tìm kiếm và chọn người phối hợp" 
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={createSelectOptions()}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[
              { value: 'PENDING', label: 'Chưa thực hiện' }, 
              { value: 'IN_PROGRESS', label: 'Đang thực hiện' }, 
              { value: 'DONE', label: 'Hoàn thành' }
            ]} />
          </Form.Item>
          <Form.Item name="plannedDueAt" label="Thời gian dự kiến hoàn thành"><DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" /></Form.Item>
          <Form.Item name="actionPlan" label="Hành động cải thiện"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="progress" label="Tiến độ (%)"><InputNumber min={0} max={100} style={{ width: 160 }} /></Form.Item>
          <Form.Item name="progressDetail" label="Nội dung tiến độ"><Input.TextArea rows={3} placeholder="Mô tả chi tiết tiến độ hiện tại" /></Form.Item>

          {/* Upload files */}
          <Form.Item label="Tài liệu đính kèm">
            {existingFiles?.length > 0 && (
              <List
                header={<div>File đã có</div>}
                size="small"
                dataSource={existingFiles}
                style={{ marginBottom: 8 }}
                renderItem={(f, i) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => setExistingFiles(prev => prev.filter((_, index) => index !== i))}
                        title="Xóa file này khỏi bản ghi"
                      />
                    ]}
                  >
                    <Tag color="green">#{i + 1}</Tag>
                    <span style={{ marginLeft: 8 }}>{f.name || 'file'}</span>
                  </List.Item>
                )}
              />
            )}
            <Upload
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const { isValid, errorMessage } = validateFileSize(file);
                if (!isValid) {
                  api.error({ message: errorMessage, placement: 'bottomRight' });
                  return false;
                }
                return false; // prevent auto upload; we manage in onChange
              }}
              onChange={(info) => {
                const { fileList } = info;
                const newFiles = fileList.filter(f => f.originFileObj);
                const mapped = newFiles.map(f => ({ 
                  uid: f.uid, 
                  name: f.name, 
                  originFileObj: f.originFileObj 
                }));
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



